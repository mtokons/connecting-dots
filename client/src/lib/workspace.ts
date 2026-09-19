export function workspaceToken() {
  const existing = localStorage.getItem('cd_workspace');
  if (existing && /^[a-f0-9]{64}$/.test(existing)) return existing;
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
  localStorage.setItem('cd_workspace', token);
  return token;
}

export const workspaceHeaders = () => ({ 'x-workspace-token': workspaceToken() });

export const STUDIOS = [
  { id: 'sccg-studio', name: 'Podcast', category: 'Conversation', image: '/backgrounds/sccg-studio.png', accent: '#00a8ff', layout: 'spotlight' },
  { id: 'sccg-interview', name: 'Interview', category: 'Two voices', image: '/backgrounds/sccg-interview.png', accent: '#63d6ae', layout: 'side-by-side' },
  { id: 'sccg-news', name: 'Newsroom', category: 'Live coverage', image: '/backgrounds/sccg-news.png', accent: '#ff726c', layout: 'pip' },
  { id: 'sccg-dark', name: 'Focus', category: 'Solo session', image: '/backgrounds/sccg-dark.png', accent: '#e9c46a', layout: 'spotlight' },
] as const;

export type StudioPreset = typeof STUDIOS[number]['id'];
export const findStudio = (id: string | null | undefined) => STUDIOS.find((studio) => studio.id === id) || STUDIOS[0];