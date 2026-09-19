import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Clapperboard, Radio, Upload } from 'lucide-react';
import { STUDIOS, StudioPreset, workspaceToken } from '../lib/workspace';
import { projectRequest, VideoProject } from '../lib/videoProjects';
import './Workflow.css';

export default function ProductionHome() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'recording' | 'live'>('recording');
  const [studio, setStudio] = useState<StudioPreset>('sccg-studio');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const continueToStudio = async () => {
    setBusy(true);
    setError('');
    try {
      workspaceToken();
      if (mode === 'recording') {
        try {
          const project = await projectRequest<VideoProject>('', 'POST', {});
          navigate(`/edit?studio=${studio}&project=${project.id}`);
        } catch (cause) {
          const existing = await projectRequest<VideoProject[]>('').catch(() => []);
          if (existing.length > 0) {
            navigate(`/edit?studio=${studio}&project=${existing[0].id}`);
            return;
          }
          throw cause;
        }
      }
      else {
        sessionStorage.removeItem('guestRole');
        sessionStorage.removeItem('guestName');
        navigate(`/studio/live-${crypto.randomUUID()}?studio=${studio}&title=${encodeURIComponent(title.trim() || 'Connecting Dot Live')}`);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open your workspace.'); }
    finally { setBusy(false); }
  };
  return <main className="workflow">
    <header className="workflow-header"><Link className="workflow-brand" to="/"><Clapperboard size={24} /> Connecting Dot</Link>
      <Link to="/edit" className="workspace-link">My recordings <ArrowRight size={16} /></Link></header>
    <div className="workflow-content">
      <div className="workflow-title"><span className="workflow-kicker">YOUR PRODUCTION DESK</span><h1>What are we making?</h1></div>
      <div className="workflow-entries" role="group" aria-label="Production type">
        <button className={`workflow-entry ${mode === 'recording' ? 'selected' : ''}`} aria-pressed={mode === 'recording'} onClick={() => setMode('recording')}>
          <span className="entry-icon"><Upload size={26} /></span><span><strong>Upload a recording</strong><small>From your phone or computer</small></span><span className="entry-check">{mode === 'recording' && <Check size={18} />}</span>
        </button>
        <button className={`workflow-entry live-entry ${mode === 'live' ? 'selected' : ''}`} aria-pressed={mode === 'live'} onClick={() => setMode('live')}>
          <span className="entry-icon"><Radio size={26} /></span><span><strong>Start a live event</strong><small>Camera, guests & broadcast</small></span><span className="entry-check">{mode === 'live' && <Check size={18} />}</span>
        </button>
      </div>
      <section className="workflow-studios" aria-labelledby="studio-heading">
        <div className="section-heading"><h2 id="studio-heading">Choose your studio</h2><span>01 / Production & studio</span></div>
        <div className="studio-grid">{STUDIOS.map((item) => <button key={item.id} className={`studio-choice ${item.id === studio ? 'selected' : ''}`} aria-pressed={item.id === studio} onClick={() => setStudio(item.id)}>
          <div className="studio-photo"><img src={item.image} alt={`${item.name} studio backdrop`} />{item.id === studio && <span className="studio-check"><Check size={16} /></span>}</div>
          <span className="studio-caption"><strong>{item.name}</strong><small>{item.category}</small></span>
        </button>)}</div>
      </section>
      <footer className="workflow-continue">
        {mode === 'live' ? <label>Event title<input maxLength={80} value={title} placeholder="Connecting Dot Live" onChange={(event) => setTitle(event.target.value)} /></label>
          : <div className="file-formats"><Upload size={18} /><span>MP4, MOV, WebM <span className="separator">/</span> Up to 1 GB</span></div>}
        <button className="continue-button" disabled={busy} onClick={() => void continueToStudio()}>{busy ? 'Opening...' : mode === 'recording' ? 'Continue to upload' : 'Set up live event'}<ArrowRight size={19} /></button>
      </footer>
      {error && <div role="alert" className="workflow-error" style={{ marginTop: 14 }}>
        <p style={{ margin: 0 }}>{error}</p>
        <button type="button" className="continue-button" style={{ marginTop: 10, display: 'inline-flex', padding: '8px 16px', minHeight: 'auto', fontSize: 13 }} onClick={() => navigate('/edit')}>
          Open recordings to manage storage <ArrowRight size={15} />
        </button>
      </div>}
    </div>
  </main>;
}