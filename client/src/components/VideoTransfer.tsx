import { useEffect, useRef, useState } from 'react';
import { Pause, Upload, CheckCircle2 } from 'lucide-react';
import { readResponse, videoApi } from '../lib/videoProjects';

type TransferStatus = { status: string; received: number; size: number; name: string; error?: string };

export default function VideoTransfer({ projectId, token, onComplete }: { projectId: string; token: string; onComplete?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [received, setReceived] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const controller = useRef<AbortController | null>(null);
  const base = `${videoApi()}/${encodeURIComponent(projectId)}/transfer`;

  useEffect(() => {
    const request = new AbortController();
    void fetch(base, { headers: { 'x-upload-token': token }, signal: request.signal }).then(readResponse<TransferStatus>).then((status) => {
      setReceived(status.received);
      setDone(!['empty', 'uploading'].includes(status.status));
      if (status.name) setMessage(status.name);
    }).catch((cause) => { if (!request.signal.aborted) setError(String(cause.message)); });
    return () => { request.abort(); controller.current?.abort(); };
  }, [base, token]);

  const upload = async () => {
    if (!file || busy) return;
    if (file.size > 1024 ** 3 || !file.size) { setError('Choose a video between 1 byte and 1 GB.'); return; }
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError('');
    try {
      setMessage('Checking file');
      if (!crypto.subtle) throw new Error('Secure HTTPS is required for phone uploads.');
      const identity = new Blob([file.name, String(file.size), String(file.lastModified), file.slice(0, 65536), file.slice(-65536)]);
      const hash = await crypto.subtle.digest('SHA-256', await identity.arrayBuffer());
      const fingerprint = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
      const headers = { 'x-upload-token': token, 'Content-Type': 'application/json' };
      const current = await readResponse<TransferStatus>(await fetch(base, { headers, signal: request.signal }));
      if (!['empty', 'uploading'].includes(current.status)) { setDone(true); onComplete?.(); return; }
      let state = await readResponse<TransferStatus>(await fetch(`${base}/start`, { method: 'POST', headers,
        signal: request.signal, body: JSON.stringify({ name: file.name.slice(0, 180), size: file.size, fingerprint }) }));
      setReceived(state.received);
      while (state.received < file.size) {
        setMessage('Uploading');
        state = await readResponse<TransferStatus>(await fetch(`${base}/chunk`, { method: 'PUT', signal: request.signal,
          headers: { 'x-upload-token': token, 'Content-Type': 'application/octet-stream', 'x-upload-offset': String(state.received) },
          body: file.slice(state.received, state.received + 8 * 1024 * 1024) }));
        setReceived(state.received);
      }
      setMessage('Checking video');
      await readResponse(await fetch(`${base}/finish`, { method: 'POST', headers, signal: request.signal }));
      setDone(true);
      setFile(null);
      onComplete?.();
    } catch (cause) {
      if (request.signal.aborted) setMessage('Paused');
      else { setError(cause instanceof Error ? cause.message : 'Upload failed.'); setMessage('Paused'); }
    } finally { setBusy(false); }
  };

  return <div className="video-transfer">
    {done ? <p className="video-success"><CheckCircle2 size={20} /> Video received</p> : <>
      <label>Video file <input type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" disabled={busy}
        onChange={(event) => { setFile(event.target.files?.[0] || null); setError(''); }} /></label>
      <div className="video-actions">
        <button className="primary" disabled={!file || busy} onClick={() => void upload()}><Upload size={17} /> {received ? 'Resume upload' : 'Upload video'}</button>
        {busy && <button onClick={() => controller.current?.abort()}><Pause size={17} /> Pause</button>}
      </div>
      <progress aria-label="Upload progress" value={received} max={file?.size || Math.max(received, 1)} />
      <div className="video-muted" role="status">{message} {received > 0 && ` / ${(received / 1024 / 1024).toFixed(1)} MB`}</div>
    </>}
    {error && <p className="video-error" role="alert">{error}</p>}
  </div>;
}