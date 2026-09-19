import { randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { Edit, MediaInfo, probeMedia, renderVideo, validateEdit } from './videoEditor';

export const PROJECT_TTL = 24 * 60 * 60 * 1000;
export const UPLOAD_TTL = 60 * 60 * 1000;
export const MAX_VIDEO_BYTES = 1024 * 1024 * 1024;
export const CHUNK_BYTES = 8 * 1024 * 1024;

export type VideoProject = {
  id: string;
  owner: string;
  createdAt: number;
  expiresAt: number;
  uploadExpiresAt: number;
  uploadToken: string;
  mediaToken: string;
  status: 'empty' | 'uploading' | 'ready' | 'rendering' | 'rendered' | 'publishing' | 'published';
  name: string;
  size: number;
  received: number;
  fingerprint: string;
  info?: MediaInfo;
  edit?: Edit;
  progress: number;
  error?: string;
  youtubeUrl?: string;
};

export class ProjectError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function tokenMatches(actual: string, expected: string) {
  const supplied = Buffer.from(actual);
  const stored = Buffer.from(expected);
  return supplied.length === stored.length && timingSafeEqual(supplied, stored);
}

export class VideoProjects {
  private projects = new Map<string, VideoProject>();
  private locks = new Set<string>();
  private working = false;
  readonly initialized: Promise<void>;

  constructor(readonly root: string) {
    this.initialized = this.load();
  }

  directory(id: string) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new ProjectError('Project not found.', 404);
    return path.join(this.root, id);
  }

  private async load() {
    await fs.mkdir(this.root, { recursive: true, mode: 0o700 });
    for (const entry of await fs.readdir(this.root, { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^[a-f0-9-]{36}$/.test(entry.name)) continue;
      try {
        const project: VideoProject = JSON.parse(await fs.readFile(path.join(this.directory(entry.name), 'project.json'), 'utf8'));
        if (project.id !== entry.name) throw new Error('Invalid project');
        if (project.status === 'rendering') {
          project.status = 'ready';
          project.error = 'Rendering was interrupted. Render again.';
        }
        if (project.status === 'publishing') {
          project.status = 'rendered';
          project.error = 'Publishing was interrupted. Check YouTube Studio before retrying to avoid a duplicate.';
        }
        if (project.status === 'uploading') {
          project.received = (await fs.stat(path.join(this.directory(project.id), 'source')).catch(() => ({ size: 0 }))).size;
        }
        this.projects.set(project.id, project);
      } catch {
        await fs.rm(this.directory(entry.name), { recursive: true, force: true });
      }
    }
    await this.cleanup();
  }

  async save(project: VideoProject) {
    const temporary = path.join(this.directory(project.id), 'project.tmp');
    await fs.writeFile(temporary, JSON.stringify(project), { mode: 0o600 });
    await fs.rename(temporary, path.join(this.directory(project.id), 'project.json'));
  }

  get(id: string) {
    const project = this.projects.get(id);
    if (!project || (project.expiresAt <= Date.now() && !this.locks.has(id))) throw new ProjectError('Project expired or not found.', 404);
    return project;
  }

  list(owner: string) {
    return [...this.projects.values()].filter((project) => project.owner === owner && project.expiresAt > Date.now());
  }

  async create(owner: string) {
    await this.initialized;
    await this.cleanup();
    if (this.projects.size >= 4) throw new ProjectError('Temporary storage is full. Delete an old project first.', 409);
    const now = Date.now();
    const project: VideoProject = { id: randomUUID(), owner, createdAt: now, expiresAt: now + PROJECT_TTL,
      uploadExpiresAt: now + UPLOAD_TTL, uploadToken: randomBytes(32).toString('hex'), mediaToken: randomBytes(32).toString('hex'),
      status: 'empty', name: '', size: 0, received: 0, fingerprint: '', progress: 0 };
    this.projects.set(project.id, project);
    try {
      await fs.mkdir(this.directory(project.id), { mode: 0o700 });
      await this.save(project);
      return project;
    } catch (error) {
      this.projects.delete(project.id);
      throw error;
    }
  }

  async exclusive<Result>(id: string, action: (project: VideoProject) => Promise<Result>): Promise<Result> {
    const project = this.get(id);
    if (this.locks.has(id)) throw new ProjectError('Project is busy. Try again shortly.', 409);
    this.locks.add(id);
    try { return await action(project); }
    finally { this.locks.delete(id); }
  }

  async beginUpload(id: string, name: string, size: number, fingerprint: string) {
    return this.exclusive(id, async (project) => {
      if (project.status === 'uploading' && project.fingerprint === fingerprint && project.size === size) return project;
      if (project.status !== 'empty') throw new ProjectError('This project already has a video. Create a new project for another file.', 409);
      if (!Number.isSafeInteger(size) || size < 1 || size > MAX_VIDEO_BYTES) throw new ProjectError('Video must be between 1 byte and 1 GB.');
      if (!/^[a-f0-9]{64}$/.test(fingerprint)) throw new ProjectError('Invalid file fingerprint.');
      const disk = await fs.statfs(this.root);
      if (disk.bavail * disk.bsize < size + 2 * 1024 ** 3) throw new ProjectError('Not enough temporary disk space. Delete an old project first.', 507);
      project.name = path.basename(name).slice(0, 180);
      project.size = size;
      project.fingerprint = fingerprint;
      project.status = 'uploading';
      await this.save(project);
      return project;
    });
  }

  async append(project: VideoProject, offset: number, data: Buffer) {
    if (project.status !== 'uploading') throw new ProjectError('Project is not accepting chunks.', 409);
    if (offset !== project.received) throw new ProjectError('Upload offset changed. Resume the upload.', 409);
    if (!data.length || data.length > CHUNK_BYTES || project.received + data.length > project.size) throw new ProjectError('Invalid chunk size.');
    const filename = path.join(this.directory(project.id), 'source');
    try {
      await fs.appendFile(filename, data, { mode: 0o600 });
      project.received += data.length;
      await this.save(project);
    } catch (error) {
      project.received = (await fs.stat(filename).catch(() => ({ size: 0 }))).size;
      throw error;
    }
    return project;
  }

  async finishUpload(id: string) {
    return this.exclusive(id, async (project) => {
      if (project.status === 'ready') return project;
      if (project.status !== 'uploading' || project.received !== project.size) throw new ProjectError('Upload is incomplete.', 409);
      try {
        project.info = await probeMedia(path.join(this.directory(id), 'source'));
        project.edit = { segments: [{ start: 0, end: project.info.duration }], format: 'landscape', frame: 'studio', studio: 'sccg-studio', voice: false, overlays: [] };
        project.status = 'ready';
        project.error = undefined;
        await this.save(project);
        return project;
      } catch (error) {
        await fs.rm(path.join(this.directory(id), 'source'), { force: true });
        project.status = 'empty';
        project.received = 0;
        project.error = 'Unsupported or damaged video. Choose another MP4, MOV, or WebM file.';
        await this.save(project);
        throw new ProjectError(project.error);
      }
    });
  }

  async updateEdit(id: string, value: unknown) {
    return this.exclusive(id, async (project) => {
      if (!project.info || !['ready', 'rendered'].includes(project.status)) throw new ProjectError('Upload a video first.', 409);
      try { project.edit = validateEdit(value, project.info.duration); }
      catch (error) { throw new ProjectError(error instanceof Error ? error.message : 'Invalid editing settings.'); }
      project.status = 'ready';
      project.progress = 0;
      project.error = undefined;
      await fs.rm(path.join(this.directory(id), 'render.mp4'), { force: true });
      await this.save(project);
      return project;
    });
  }

  async startRender(id: string) {
    const project = this.get(id);
    if (!project.info || !project.edit || !['ready', 'rendered'].includes(project.status)) throw new ProjectError('Project is not ready to render.', 409);
    if (this.working || this.locks.has(id)) throw new ProjectError('Another job is running. Try again shortly.', 409);
    this.working = true;
    this.locks.add(id);
    project.status = 'rendering';
    project.progress = 0;
    project.error = undefined;
    try { await this.save(project); }
    catch (error) { this.working = false; this.locks.delete(id); project.status = 'ready'; throw error; }
    void this.render(project);
    return project;
  }

  private async render(project: VideoProject) {
    try {
      const disk = await fs.statfs(this.root);
      if (disk.bavail * disk.bsize < 2 * 1024 ** 3) throw new Error('Not enough temporary disk space for rendering.');
      await renderVideo(this.directory(project.id), project.info!, project.edit!, (progress) => { project.progress = progress; });
      project.status = 'rendered';
      project.progress = 100;
    } catch (error) {
      console.error('Video render failed:', error);
      project.status = 'ready';
      project.error = 'Rendering failed. Verify FFmpeg and fonts on the server, then retry.';
      await fs.rm(path.join(this.directory(project.id), 'render.mp4'), { force: true }).catch(() => {});
    } finally {
      project.expiresAt = Date.now() + PROJECT_TTL;
      await this.save(project).catch((error) => console.error('Unable to save render result:', error));
      this.working = false;
      this.locks.delete(project.id);
    }
  }

  async publish(id: string, upload: (filename: string) => Promise<string>) {
    const project = this.get(id);
    if (project.status !== 'rendered') throw new ProjectError('Render and review the video first.', 409);
    if (this.working || this.locks.has(id)) throw new ProjectError('Another job is running. Try again shortly.', 409);
    this.working = true;
    this.locks.add(id);
    project.status = 'publishing';
    project.error = undefined;
    try { await this.save(project); }
    catch (error) { this.working = false; this.locks.delete(id); project.status = 'rendered'; throw error; }
    void (async () => {
      try {
        project.youtubeUrl = await upload(path.join(this.directory(id), 'render.mp4'));
        project.status = 'published';
        await this.save(project);
        await this.purgeMedia(project);
      } catch (error) {
        console.error('Video publishing failed:', error);
        if (!project.youtubeUrl) project.status = 'rendered';
        project.error = project.youtubeUrl ? 'Published. Temporary file cleanup will retry automatically.'
          : 'Publishing did not complete. Check YouTube Studio before retrying to avoid duplicates.';
      } finally {
        project.expiresAt = Date.now() + PROJECT_TTL;
        await this.save(project).catch((error) => console.error('Unable to save publishing result:', error));
        this.working = false;
        this.locks.delete(id);
      }
    })();
    return project;
  }

  private async purgeMedia(project: VideoProject) {
    for (const filename of await fs.readdir(this.directory(project.id))) {
      if (filename !== 'project.json') await fs.rm(path.join(this.directory(project.id), filename), { force: true });
    }
  }

  async remove(id: string) {
    if (this.locks.has(id)) throw new ProjectError('Wait for the active job to finish before deleting.', 409);
    this.locks.add(id);
    try {
      await fs.rm(this.directory(id), { recursive: true, force: true });
      this.projects.delete(id);
    } finally { this.locks.delete(id); }
  }

  async cleanup(now = Date.now()) {
    for (const project of this.projects.values()) {
      if (this.locks.has(project.id)) continue;
      if (project.expiresAt <= now) await this.remove(project.id);
      else if (project.status === 'published') await this.exclusive(project.id, (current) => this.purgeMedia(current));
    }
  }
}