export interface Speaker {
  id: string;
  name: string;
  role: 'host' | 'co-host' | 'guest';
  city: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  isOnStage: boolean;
  videoTrack?: MediaStreamTrack;
  audioTrack?: MediaStreamTrack;
}

export interface StreamTarget {
  platform: 'youtube' | 'facebook' | 'instagram' | 'custom';
  rtmpKey: string;
  rtmpUrl?: string;
  enabled: boolean;
  isConnected: boolean;
}

export interface Overlay {
  id: string;
  type: 'text' | 'lower-third' | 'ticker' | 'logo' | 'banner' | 'comment';
  content: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  visible: boolean;
  payload?: unknown;
}

export type StudioTheme = 'modern' | 'classic' | 'bubble' | 'minimal';

export interface StudioSettings {
  backgroundStyle: 'studio-light' | 'studio-dark' | 'blur' | 'custom';
  accentColor: string;
  showName: string;
  episodeNumber: number;
  logoUrl: string | null;
  theme: StudioTheme;
}

export interface RoomState {
  roomId: string;
  isLive: boolean;
  isRecording: boolean;
  duration: number;
  speakerCount: number;
  publicUrl: string | null;
}

export interface Episode {
  id: string;
  title: string;
  host: string;
  guest?: string;
  description: string;
  imageUrl: string;
  status: 'live' | 'upcoming' | 'recorded';
  date: string;
  time?: string;
  tags: string[];
  roomId: string;
}

export interface AuthUser {
  email: string;
  name: string;
  role: 'admin' | 'super-admin' | 'user';
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAdmin: boolean;
}

/* ── Multi-Camera ─────────────────────────────────────── */

export interface CameraSource {
  id: string;
  deviceId: string;
  label: string;
  track: MediaStreamTrack | null;
  stream: MediaStream | null;
  enabled: boolean;
  isProgram: boolean;
  resolution: '720p' | '1080p' | '4k';
}

export type MultiCameraLayout =
  | 'single'
  | 'side-by-side'
  | 'triple'
  | 'quad'
  | 'pip-multi'
  | 'grid'
  | 'spotlight'
  | 'pip';

/* ── Server Recording ─────────────────────────────────── */

export interface RecordingSession {
  id: string;
  roomId: string;
  episodeTitle?: string;
  cameras: { id: string; label: string }[];
  startedAt: string;
  status: 'recording' | 'finalizing' | 'complete' | 'error';
  bytesUploaded: number;
  durationSeconds: number;
}

/* ── Social Publishing ────────────────────────────────── */

export interface SocialPost {
  id: string;
  title: string;
  message: string;
  url?: string;
  imageUrl?: string;
  videoUrl?: string;
  platforms: string[];
  scheduledAt?: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  createdAt: string;
}

export interface ExportPreset {
  id: string;
  name: string;
  icon: string;
  format: 'mp4' | 'webm' | 'mp3';
  resolution: string;
  codec: string;
  bitrate: string;
  audioBitrate: string;
  aspectRatio?: string;
}
