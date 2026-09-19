import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, Clapperboard } from 'lucide-react';
import { findStudio, STUDIOS, StudioPreset } from '../lib/workspace';
import '../pages/Workflow.css';

type Props = {
  isGuest: boolean; name: string; onName: (name: string) => void; title: string;
  studio: StudioPreset; onStudio: (studio: StudioPreset) => void;
  previewRef: RefObject<HTMLVideoElement>; localStream: MediaStream | null;
  mediaLoading?: boolean;
  devices: MediaDeviceInfo[]; selectedVideo: string; selectedAudio: string;
  onSelectVideo: (device: string) => void; onSelectAudio: (device: string) => void;
  isConnecting: boolean; onEnter: () => void; error: string | null;
};

export default function LiveSetup(props: Props) {
  const selected = findStudio(props.studio);
  return <main className="workflow live-setup">
    <header className="workflow-header"><Link className="workflow-brand" to="/"><Clapperboard size={24} /> Connecting Dot</Link>
      <Link className="workspace-link" to="/"><ArrowLeft size={16} /> New production</Link></header>
    <div className="workflow-content">
      <div className="workflow-title"><span className="workflow-kicker">02 / CAMERA & SOUND</span><h1>{props.isGuest ? 'Join the event' : props.title}</h1></div>
      <div className="live-setup-grid">
        <section>
          <div className="live-camera-preview" style={{ backgroundImage: `url(${selected.image})` }}>
            {props.localStream ? <video ref={props.previewRef} autoPlay muted playsInline /> : <div className="camera-unavailable"><Camera size={38} /><span>Camera preview unavailable</span></div>}
            <span className="preview-studio-label">{selected.name} studio</span>
          </div>
          <div className="live-device-grid">
            <label>Camera<select value={props.selectedVideo} onChange={(event) => props.onSelectVideo(event.target.value)}><option value="">Default camera</option>
              {props.devices.filter((device) => device.kind === 'videoinput').map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}
            </select></label>
            <label>Microphone<select value={props.selectedAudio} onChange={(event) => props.onSelectAudio(event.target.value)}><option value="">Default microphone</option>
              {props.devices.filter((device) => device.kind === 'audioinput').map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</option>)}
            </select></label>
          </div>
        </section>
        <section className="live-setup-fields">
          <label>On-screen name<input maxLength={60} value={props.name} placeholder="Your name" onChange={(event) => props.onName(event.target.value)} /></label>
          {!props.isGuest && <label>Studio<select value={props.studio} onChange={(event) => props.onStudio(findStudio(event.target.value).id)}>
            {STUDIOS.map((studio) => <option key={studio.id} value={studio.id}>{studio.name}</option>)}
          </select></label>}
          {props.error && <p role="alert" className="workflow-error">{props.error}</p>}
          <button className="continue-button" disabled={props.isConnecting || props.mediaLoading || !props.name.trim()} onClick={props.onEnter}>{props.mediaLoading ? 'Preparing camera...' : props.isConnecting ? 'Connecting...' : props.isGuest ? 'Join studio' : 'Open live studio'}<ArrowRight size={18} /></button>
        </section>
      </div>
    </div>
  </main>;
}