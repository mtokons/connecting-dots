import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { Camera, Check, Clapperboard, Columns2, Copy, ExternalLink, Film, Focus, LayoutGrid, LogOut, Mic, MicOff, MonitorUp, Pause, PictureInPicture2, Play, Radio, RotateCcw, SlidersHorizontal, Square, Trash2, Type, Upload, Users, Video, VideoOff, Volume2, X } from 'lucide-react';
import type { MultiCameraLayout } from '../types';
import { findStudio, STUDIOS, type StudioPreset } from '../lib/workspace';
import { DEFAULT_CAMERA_GRADE, type BroadcastQuality, type ProgramStyle } from '../lib/studioMedia';
import type { BackgroundStatus } from '../lib/studioCamera';
import type useRTMPStream from '../hooks/useRTMPStream';
import type usePresentationMedia from '../hooks/usePresentationMedia';
import './StudioDesk.css';

export interface DeskSource {
  id: string;
  label: string;
  stream: MediaStream | null;
  isLocal: boolean;
  kind: 'host' | 'camera' | 'guest' | 'screen' | 'clip';
  media?: HTMLVideoElement;
}

export interface SavedDestinations { publisherId: string; authorized: boolean; youtube: boolean; facebook: boolean }

interface Props {
  canvasRef: RefObject<HTMLCanvasElement>;
  showName: string;
  isGuest: boolean;
  studio: StudioPreset;
  onStudio: (studio: StudioPreset) => void;
  layout: MultiCameraLayout;
  onLayout: (layout: MultiCameraLayout) => void;
  style: ProgramStyle;
  onStyle: Dispatch<SetStateAction<ProgramStyle>>;
  backgroundStatus: BackgroundStatus;
  sources: DeskSource[];
  featuredId: string | null;
  onFeature: (id: string) => void;
  devices: MediaDeviceInfo[];
  onAddCamera: (id: string) => void;
  onRemoveCamera: (id: string) => void;
  onInvite: () => void;
  isMuted: boolean;
  isCameraOff: boolean;
  onMute: () => void;
  onCamera: () => void;
  presentation: ReturnType<typeof usePresentationMedia>;
  onShare: () => void;
  onLoadClip: (file: File) => void;
  onPlayClip: () => void;
  broadcast: ReturnType<typeof useRTMPStream>;
  quality: BroadcastQuality;
  onQuality: (quality: BroadcastQuality) => void;
  ready: boolean;
  onStart: () => void;
  onStop: () => void;
  onLeave: () => void;
  saved: SavedDestinations | null;
  destinations: { youtube: boolean; facebook: boolean };
  destinationKeys: { youtube: string; facebook: string };
  onDestination: (platform: 'youtube' | 'facebook', enabled: boolean) => void;
  onDestinationKey: (platform: 'youtube' | 'facebook', key: string) => void;
  record: boolean;
  onRecord: (record: boolean) => void;
  isRecording: boolean;
  notice: string | null;
  onDismiss: () => void;
  onCopyPairing: () => void;
}

const durationLabel = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

function SourcePreview({ source }: { source: DeskSource }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source.stream) return;
    video.srcObject = source.stream;
    void video.play().catch(() => {});
    return () => { video.srcObject = null; };
  }, [source.stream]);
  return source.kind === 'clip' ? <Film size={30} /> : <video ref={videoRef} muted autoPlay playsInline />;
}

export default function StudioDesk(props: Props) {
  const [tab, setTab] = useState('scene');
  const [hidden, setHidden] = useState(document.hidden);
  const { style, onStyle, presentation, broadcast } = props;
  const busy = broadcast.isStreaming || broadcast.isStarting || broadcast.isStopping;
  const transmitting = broadcast.isStreaming && broadcast.health?.status === 'live';
  const status = broadcast.isStopping ? 'STOPPING' : transmitting ? 'TRANSMITTING' : busy ? 'STARTING' : 'PREVIEW';
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  const layouts = [
    { value: 'spotlight' as const, label: 'Spotlight', Icon: Focus },
    { value: 'side-by-side' as const, label: 'Split', Icon: Columns2 },
    { value: 'pip' as const, label: 'Picture in picture', Icon: PictureInPicture2 },
    { value: 'grid' as const, label: 'Grid', Icon: LayoutGrid },
  ];
  const tabs = [{ id: 'scene', name: 'Scene', Icon: SlidersHorizontal }, { id: 'graphics', name: 'Graphics', Icon: Type }, { id: 'present', name: 'Present', Icon: MonitorUp }, { id: 'publish', name: 'Publish', Icon: Radio }];
  const alert = broadcast.error || props.notice || (hidden && busy ? 'Broadcast tab is hidden. Keep this tab visible to maintain camera frame rate.' : null);

  return <div className="studio-desk live-studio-shell">
    <header className="desk-header">
      <img className="desk-brand" src="/sccg-logo.png" alt="SCCG" />
      <div className="desk-title"><span>CONNECTING DOT / {props.isGuest ? 'GUEST' : 'LIVE STUDIO'}</span><h1>{props.showName}</h1></div>
      <div className="desk-air-status" data-live={transmitting}><span />{status}{busy && <time>{durationLabel(broadcast.streamDuration)}</time>}</div>
      <div className="desk-header-actions">
        {!props.isGuest && (broadcast.isStreaming
          ? <button className="desk-end" disabled={broadcast.isStopping} onClick={props.onStop}><Square size={15} />End broadcast</button>
          : <button
              className="desk-go-live"
              disabled={!props.ready || broadcast.isStarting || broadcast.isStopping}
              onClick={props.onStart}
              title={!props.ready ? 'Select YouTube or Facebook in Publish tab to enable Go live' : 'Start live broadcast'}
            >
              <Radio size={17} />{broadcast.isStarting ? 'Starting...' : broadcast.isStopping ? 'Stopping...' : 'Go live'}
            </button>)}
        <button className="desk-icon" onClick={props.onLeave} disabled={broadcast.isStarting} title="Leave studio" aria-label="Leave studio"><LogOut size={19} /></button>
      </div>
    </header>
    {alert && <div className="desk-alert" role="alert"><span>{alert}</span>{!broadcast.error && <button className="desk-icon" onClick={props.onDismiss} title="Dismiss notice" aria-label="Dismiss notice"><X size={16} /></button>}</div>}
    <div className="desk-body">
      <main className="desk-program">
        <div className="desk-monitor-label"><strong>PROGRAM</strong><span>{broadcast.profile || '1920 x 1080'}{props.isRecording && ' / RECORDING'}</span></div>
        <div className="desk-monitor"><canvas ref={props.canvasRef} width={1920} height={1080} aria-label="Program output" /></div>
        <div className="desk-toolbar">
          {!props.isGuest && <div className="desk-layouts" role="group" aria-label="Program layout">{layouts.map(({ value, label, Icon }) => <button key={value} className="desk-icon" title={label} aria-label={label} aria-pressed={props.layout === value} onClick={() => props.onLayout(value)}><Icon size={19} /></button>)}</div>}
          <div className="desk-local-controls">
            <button className="desk-icon" data-off={props.isMuted} title={props.isMuted ? 'Unmute microphone' : 'Mute microphone'} aria-label={props.isMuted ? 'Unmute microphone' : 'Mute microphone'} aria-pressed={props.isMuted} onClick={props.onMute}>{props.isMuted ? <MicOff size={19} /> : <Mic size={19} />}</button>
            <button className="desk-icon" data-off={props.isCameraOff} title={props.isCameraOff ? 'Turn camera on' : 'Turn camera off'} aria-label={props.isCameraOff ? 'Turn camera on' : 'Turn camera off'} aria-pressed={props.isCameraOff} onClick={props.onCamera}>{props.isCameraOff ? <VideoOff size={19} /> : <Video size={19} />}</button>
            <button className="desk-icon" aria-label={presentation.screen ? 'Stop screen sharing' : 'Share screen'} title={presentation.screen ? 'Stop screen sharing' : 'Share screen'} disabled={presentation.sharing} aria-pressed={Boolean(presentation.screen)} onClick={presentation.screen ? presentation.stopScreen : props.onShare}><MonitorUp size={19} /></button>
            {!props.isGuest && <button className="desk-icon" onClick={props.onInvite} title="Copy guest invite" aria-label="Copy guest invite"><Users size={19} /></button>}
          </div>
        </div>
        <section className="desk-sources" aria-label="Program sources">
          <div className="desk-section-heading"><h2>Sources <span>{props.sources.length}</span></h2>{!props.isGuest && <label className="desk-camera-select"><Camera size={15} /><select aria-label="Add camera" value="" onChange={(event) => { if (event.target.value) props.onAddCamera(event.target.value); }}><option value="">Add camera</option>{props.devices.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || 'Camera'}</option>)}</select></label>}</div>
          <div className="desk-source-grid">{props.sources.map((source, index) => <div className="desk-source" key={source.id} data-selected={source.id === (props.featuredId || props.sources[0]?.id)}>
            <button disabled={props.isGuest} className="desk-source-select" onClick={() => props.onFeature(source.id)} title={`Feature ${source.label}`} aria-label={`Feature ${source.label}`} aria-pressed={source.id === (props.featuredId || props.sources[0]?.id)}>
              <div className="desk-source-image"><SourcePreview source={source} /><span>{String(index + 1).padStart(2, '0')}</span></div>
              <strong>{source.label}</strong><small>{source.kind === 'clip' ? 'REFERENCE VIDEO' : source.kind === 'screen' ? 'PRESENTATION' : source.kind.toUpperCase()}</small>
            </button>
            {source.kind === 'camera' && !props.isGuest && <button className="desk-source-remove desk-icon" onClick={() => props.onRemoveCamera(source.id)} title="Remove camera" aria-label={`Remove ${source.label}`}><X size={14} /></button>}
          </div>)}</div>
        </section>
      </main>
      {!props.isGuest ? <aside className="desk-controls">
        <div className="desk-tabs" role="tablist" aria-label="Production controls">{tabs.map(({ id, name, Icon }) => <button key={id} id={`desk-tab-${id}`} role="tab" aria-selected={tab === id} aria-controls={`desk-panel-${id}`} onClick={() => setTab(id)}><Icon size={17} />{name}</button>)}</div>
        <div className="desk-tab-panel" role="tabpanel" id={`desk-panel-${tab}`} aria-labelledby={`desk-tab-${tab}`}>
          {tab === 'scene' && <>
            <section className="desk-section"><h2>Studio</h2><div className="desk-studio-choice"><img src={findStudio(props.studio).image} alt={`${findStudio(props.studio).name} set`} /><label>Set<select aria-label="Studio set" value={props.studio} onChange={(event) => props.onStudio(findStudio(event.target.value).id)}>{STUDIOS.map((studio) => <option key={studio.id} value={studio.id}>{studio.name}</option>)}</select></label></div>
              <div className="desk-segments" role="group" aria-label="Camera background"><button aria-pressed={style.background === 'shared'} onClick={() => onStyle((previous) => ({ ...previous, background: 'shared' }))}>Shared studio</button><button aria-pressed={style.background === 'camera'} onClick={() => onStyle((previous) => ({ ...previous, background: 'camera' }))}>Camera frames</button></div>
              {style.background === 'shared' && <div className="desk-processing" data-error={props.backgroundStatus === 'unavailable'} role="status">{props.backgroundStatus === 'ready' ? <><Check size={14} />Person background removal active</> : props.backgroundStatus === 'unavailable' ? 'Background removal unavailable. Select Camera frames to continue.' : 'Preparing background removal...'}</div>}
              <label>Speaker transition<select value={style.transition} onChange={(event) => onStyle((previous) => ({ ...previous, transition: event.target.value as ProgramStyle['transition'] }))}><option value="dissolve">Soft dissolve</option><option value="wipe">Studio wipe</option><option value="cut">Direct cut</option></select></label>
            </section>
            <section className="desk-section"><div className="desk-section-heading"><h2>Camera correction</h2><button className="desk-icon" title="Reset camera correction" aria-label="Reset camera correction" onClick={() => onStyle((previous) => ({ ...previous, grade: { ...DEFAULT_CAMERA_GRADE } }))}><RotateCcw size={16} /></button></div>
              <label className="desk-check"><input type="checkbox" checked={style.grade.autoLight} onChange={(event) => onStyle((previous) => ({ ...previous, grade: { ...previous.grade, autoLight: event.target.checked } }))} />Auto light</label>
              {[
                { key: 'exposure' as const, name: 'Exposure', min: -0.6, max: 0.6, step: 0.05, value: `${style.grade.exposure.toFixed(2)} EV` },
                { key: 'contrast' as const, name: 'Contrast', min: 0.8, max: 1.25, step: 0.01, value: `${Math.round(style.grade.contrast * 100)}%` },
                { key: 'saturation' as const, name: 'Saturation', min: 0.6, max: 1.4, step: 0.01, value: `${Math.round(style.grade.saturation * 100)}%` },
                { key: 'warmth' as const, name: 'Warmth', min: -1, max: 1, step: 0.05, value: `${Math.round(style.grade.warmth * 100)}` },
              ].map((control) => <label className="desk-slider" key={control.key}><span>{control.name}<output>{control.value}</output></span><input type="range" aria-label={control.name} min={control.min} max={control.max} step={control.step} value={style.grade[control.key]} onChange={(event) => onStyle((previous) => ({ ...previous, grade: { ...previous.grade, [control.key]: Number(event.target.value) } }))} /></label>)}
            </section>
          </>}
          {tab === 'graphics' && <>
            <section className="desk-section"><h2>Channel branding</h2><div className="desk-brand-controls"><img src="/sccg-logo.png" alt="SCCG channel logo" /><button className="desk-icon" title="Replay logo animation" aria-label="Replay logo animation" onClick={() => onStyle((previous) => ({ ...previous, animateLogo: true, logoCue: previous.logoCue + 1 }))}><Play size={18} /></button></div><label className="desk-check"><input type="checkbox" checked={style.animateLogo} onChange={(event) => onStyle((previous) => ({ ...previous, animateLogo: event.target.checked }))} />Animated logo</label></section>
            <section className="desk-section"><h2>Lower third</h2><label>Speaker name<input maxLength={60} value={style.lowerThird.name} onChange={(event) => onStyle((previous) => ({ ...previous, lowerThird: { ...previous.lowerThird, name: event.target.value } }))} /></label><label>Title or reference<input maxLength={100} value={style.lowerThird.role} onChange={(event) => onStyle((previous) => ({ ...previous, lowerThird: { ...previous.lowerThird, role: event.target.value } }))} /></label><label className="desk-check"><input type="checkbox" disabled={!style.lowerThird.name.trim()} checked={style.lowerThird.visible} onChange={(event) => onStyle((previous) => ({ ...previous, lowerThird: { ...previous.lowerThird, visible: event.target.checked } }))} />Show lower third</label></section>
            <section className="desk-section"><h2>News ticker</h2><label>Text or reference<textarea maxLength={300} rows={3} value={style.ticker.text} onChange={(event) => onStyle((previous) => ({ ...previous, ticker: { ...previous.ticker, text: event.target.value } }))} /></label><label className="desk-check"><input type="checkbox" disabled={!style.ticker.text.trim()} checked={style.ticker.visible} onChange={(event) => onStyle((previous) => ({ ...previous, ticker: { ...previous.ticker, visible: event.target.checked } }))} />Show ticker</label></section>
          </>}
          {tab === 'present' && <>
            <section className="desk-section"><h2>Presentation</h2><button className="desk-command" disabled={presentation.sharing} onClick={presentation.screen ? presentation.stopScreen : props.onShare}><MonitorUp size={18} />{presentation.screen ? 'Stop sharing' : 'Share screen or tab'}</button><label className="desk-command desk-file-button"><Upload size={18} />Add reference video<input type="file" accept="video/*" aria-label="Reference video" onChange={(event) => { const file = event.target.files?.[0]; if (file) props.onLoadClip(file); event.target.value = ''; }} /></label></section>
            {presentation.clip && <section className="desk-section"><div className="desk-section-heading"><h2>Reference video</h2><button className="desk-icon" title="Remove reference video" aria-label="Remove reference video" onClick={presentation.removeClip}><Trash2 size={16} /></button></div><div className="desk-clip-name" title={presentation.clip.name}><Film size={19} /><span>{presentation.clip.name}</span></div>
              <div className="desk-playback"><button className="desk-icon" title="Restart reference video" aria-label="Restart reference video" onClick={() => presentation.seek(0)}><RotateCcw size={17} /></button><button className="desk-play desk-icon" title={presentation.playing ? 'Pause reference video' : 'Play reference video'} aria-label={presentation.playing ? 'Pause reference video' : 'Play reference video'} onClick={props.onPlayClip}>{presentation.playing ? <Pause size={21} /> : <Play size={21} />}</button><time>{durationLabel(presentation.position)} / {durationLabel(presentation.duration)}</time></div>
              <input className="desk-seek" type="range" aria-label="Reference video position" min={0} max={presentation.duration || 1} step={0.1} value={presentation.position} onChange={(event) => presentation.seek(Number(event.target.value))} />
              <label className="desk-slider"><span><Volume2 size={15} />Clip volume<output>{Math.round(presentation.volume * 100)}%</output></span><input type="range" aria-label="Clip volume" min={0} max={1} step={0.05} value={presentation.volume} onChange={(event) => presentation.setVolume(Number(event.target.value))} /></label><label className="desk-check"><input type="checkbox" checked={presentation.loop} onChange={(event) => presentation.setLoop(event.target.checked)} />Loop video</label>
            </section>}
          </>}
          {tab === 'publish' && <>
            <section className="desk-section">
              <h2>Destinations</h2>
              {([
                { platform: 'youtube' as const, name: 'YouTube', channel: '@sccg24x7', url: 'https://www.youtube.com/@sccg24x7' },
                { platform: 'facebook' as const, name: 'Facebook', channel: 'mysccg', url: 'https://www.facebook.com/mysccg' },
              ]).map((destination) => {
                const hasServer = Boolean(props.saved?.[destination.platform]);
                const isEnabled = props.destinations[destination.platform];
                const key = props.destinationKeys[destination.platform] || '';
                return (
                  <div key={destination.platform} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0', borderBottom: '1px solid var(--desk-line)' }}>
                    <div className="desk-destination" style={{ minHeight: 'auto' }}>
                      <Radio size={20} />
                      <div>
                        <strong>{destination.name}</strong>
                        <a href={destination.url} target="_blank" rel="noreferrer">{destination.channel}<ExternalLink size={12} /></a>
                        <small style={{ color: hasServer ? 'var(--desk-green)' : key.trim() ? '#2f7455' : 'var(--desk-muted)' }}>
                          {hasServer ? '✓ Connected on server' : key.trim() ? 'Custom stream key set' : 'Enter stream key below'}
                        </small>
                      </div>
                      <input
                        type="checkbox"
                        aria-label={`Publish to ${destination.name}`}
                        checked={isEnabled}
                        disabled={busy || (!hasServer && !key.trim())}
                        onChange={(event) => props.onDestination(destination.platform, event.target.checked)}
                      />
                    </div>
                    {(!hasServer || key.trim().length > 0) && (
                      <input
                        type="password"
                        placeholder={`${destination.name} stream key`}
                        value={key}
                        disabled={busy}
                        onChange={(e) => props.onDestinationKey(destination.platform, e.target.value)}
                        style={{ fontSize: 12, padding: '6px 8px' }}
                      />
                    )}
                  </div>
                );
              })}
              {!props.ready && (
                <div style={{ color: '#b72f42', fontSize: 12, lineHeight: 1.4, padding: '4px 0' }}>
                  ● Check YouTube or Facebook above to enable <strong>Go live</strong>.
                </div>
              )}
            </section>
            <section className="desk-section"><h2>Output</h2><label>Broadcast quality<select disabled={busy} value={props.quality} onChange={(event) => props.onQuality(event.target.value as BroadcastQuality)}><option value="1080p">1080p / native H.264 where supported</option><option value="720p">720p / lower bandwidth</option></select></label><label className="desk-check"><input type="checkbox" checked={props.record} disabled={busy} onChange={(event) => props.onRecord(event.target.checked)} />Record program</label></section>
            <section className="desk-section"><div className="desk-section-heading"><h2>Relay health</h2><span className="desk-health-state" data-live={transmitting}>{status.toLowerCase()}</span></div><dl className="desk-metrics"><div><dt>Streamed</dt><dd>{broadcast.health ? durationLabel(broadcast.health.seconds) : '-'}</dd></div><div><dt>Sent</dt><dd>{broadcast.health ? `${(broadcast.health.outputBytes / 1024 / 1024).toFixed(1)} MB` : '-'}</dd></div><div><dt>Speed</dt><dd>{broadcast.health ? `${broadcast.health.speed.toFixed(2)}x` : '-'}</dd></div><div><dt>Dropped</dt><dd>{broadcast.health?.droppedFrames ?? '-'}</dd></div></dl><a className="desk-command" href="https://studio.youtube.com/" target="_blank" rel="noreferrer"><ExternalLink size={15} />YouTube Live Control Room</a></section>
          </>}
        </div>
      </aside> : <aside className="desk-guest"><Users size={24} /><h2>Guest connected</h2><span>{findStudio(props.studio).name} studio</span><button className="desk-command" onClick={presentation.screen ? presentation.stopScreen : props.onShare}><MonitorUp size={18} />{presentation.screen ? 'Stop sharing' : 'Share screen'}</button></aside>}
    </div>
    <footer className="desk-footer"><span><Clapperboard size={14} />SCCG production</span><span>{props.isGuest ? 'GUEST' : `${props.sources.length} SOURCES`} / {props.isRecording ? 'REC' : 'STANDBY'}</span></footer>
  </div>;
}