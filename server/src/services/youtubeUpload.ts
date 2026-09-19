import { createReadStream, promises as fs } from 'fs';

export type PublishMetadata = { title: string; description: string; privacyStatus: 'private' | 'unlisted' | 'public'; madeForKids: boolean };

export async function uploadVideoFile(filename: string, metadata: PublishMetadata, getAccessToken: () => Promise<string>, request: typeof fetch = fetch) {
  const { size } = await fs.stat(filename);
  const session = await request('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST', signal: AbortSignal.timeout(30_000),
    headers: { Authorization: `Bearer ${await getAccessToken()}`, 'Content-Type': 'application/json',
      'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(size) },
    body: JSON.stringify({ snippet: { title: metadata.title, description: metadata.description, categoryId: '22' },
      status: { privacyStatus: metadata.privacyStatus, selfDeclaredMadeForKids: metadata.madeForKids } }),
  });
  if (!session.ok) throw new Error(`YouTube upload initialization failed (${session.status}). Check the channel connection and quota.`);
  const location = session.headers.get('location');
  if (!location || new URL(location).protocol !== 'https:' || new URL(location).hostname !== 'www.googleapis.com') {
    throw new Error('YouTube did not return a valid upload session.');
  }
  let offset = 0;
  let retries = 0;
  const complete = async (response: globalThis.Response) => {
    const data = await response.json() as { id?: string };
    if (!data.id || !/^[a-zA-Z0-9_-]+$/.test(data.id)) throw new Error('YouTube returned no video ID. Check YouTube Studio before retrying.');
    return `https://youtu.be/${data.id}`;
  };
  const nextOffset = (response: globalThis.Response) => {
    const range = response.headers.get('range');
    const match = range?.match(/^bytes=0-(\d+)$/);
    if (range && !match) throw new Error('Unexpected YouTube upload range.');
    const next = match ? Number(match[1]) + 1 : 0;
    if (next < offset || next > size) throw new Error('Invalid YouTube upload offset.');
    return next;
  };
  while (offset < size) {
    const end = Math.min(offset + 8 * 1024 * 1024, size) - 1;
    const stream = createReadStream(filename, { start: offset, end });
    let response: globalThis.Response | undefined;
    try {
      response = await request(location, {
        method: 'PUT', signal: AbortSignal.timeout(120_000),
        headers: { Authorization: `Bearer ${await getAccessToken()}`, 'Content-Type': 'video/mp4',
          'Content-Length': String(end - offset + 1), 'Content-Range': `bytes ${offset}-${end}/${size}` },
        body: stream as unknown as RequestInit['body'], duplex: 'half',
      } as RequestInit);
    } catch {
      response = undefined;
    } finally { stream.destroy(); }
    if (response?.ok) return complete(response);
    if (response?.status === 308) {
      const next = nextOffset(response);
      if (next <= offset) throw new Error('YouTube upload made no progress.');
      offset = next;
      retries = 0;
      continue;
    }
    if (response && response.status < 500 && response.status !== 429 && response.status !== 401) {
      throw new Error(`YouTube rejected the upload (${response.status}).`);
    }
    if (++retries > 3) throw new Error('YouTube upload interrupted. Check YouTube Studio before retrying.');
    const status = await request(location, { method: 'PUT', signal: AbortSignal.timeout(30_000),
      headers: { Authorization: `Bearer ${await getAccessToken()}`, 'Content-Length': '0', 'Content-Range': `bytes */${size}` } });
    if (status.ok) return complete(status);
    if (status.status !== 308) throw new Error(`Unable to resume YouTube upload (${status.status}).`);
    offset = nextOffset(status);
  }
  throw new Error('YouTube upload confirmation is missing. Check YouTube Studio before retrying.');
}