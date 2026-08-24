interface ImportMetaEnv {
  readonly VITE_LIVEKIT_URL?: string;
  readonly VITE_API_BASE?: string;
  readonly VITE_HOST_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}