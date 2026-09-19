import { API_BASE } from '../utils/constants';
import { workspaceHeaders, StudioPreset } from './workspace';

export type VideoEdit = {
  segments: { start: number; end: number }[];
  format: 'landscape' | 'shorts';
  frame: 'clean' | 'studio';
  voice: boolean;
  studio?: StudioPreset;
  overlays: { text: string; start: number; end: number; position: 'top' | 'bottom'; animation: 'none' | 'fade' }[];
};

export type VideoProject = {
  id: string; name: string; size: number; received: number; expiresAt: number; uploadExpiresAt: number;
  uploadToken: string; mediaToken: string; progress: number; error?: string; youtubeUrl?: string;
  status: 'empty' | 'uploading' | 'ready' | 'rendering' | 'rendered' | 'publishing' | 'published';
  info?: { duration: number; width: number; height: number; audio: boolean };
  edit?: VideoEdit;
};

export const videoApi = () => `${API_BASE}/api/video-projects`;

export async function readResponse<Result>(response: Response): Promise<Result> {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status}).`);
  if (!data) throw new Error('The video service returned an unexpected response.');
  return data as Result;
}

export async function projectRequest<Result>(suffix: string, method = 'GET', body?: unknown): Promise<Result> {
  return readResponse<Result>(await fetch(`${videoApi()}${suffix}`, {
    method, headers: { ...workspaceHeaders(), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }));
}

export const mediaUrl = (project: VideoProject, kind: 'source' | 'render') =>
  `${videoApi()}/${project.id}/media/${kind}?token=${encodeURIComponent(project.mediaToken)}`;

export const displayTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;

export const editDuration = (edit: VideoEdit) => edit.segments.reduce((total, segment) => total + segment.end - segment.start, 0);