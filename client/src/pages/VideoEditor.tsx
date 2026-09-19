import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Clapperboard, Copy, Download, Film, Plus, QrCode, RefreshCw, Save, Scissors, Trash2, Undo2, Upload, X } from 'lucide-react';
import VideoTransfer from '../components/VideoTransfer';
import { displayTime, editDuration, mediaUrl, projectRequest, readResponse, VideoEdit, VideoProject } from '../lib/videoProjects';
import { API_BASE } from '../utils/constants';
import './VideoEditor.css';
import { findStudio, STUDIOS, workspaceHeaders, workspaceToken } from '../lib/workspace';

type Channel = { configured: boolean; connected: boolean; channelTitle: string | null; targetHandle?: string; channelUrl?: string };

export default function VideoEditor() {
  const [token] = useState(workspaceToken);
  const selectedStudio = findStudio(new URLSearchParams(window.location.search).get('studio'));
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [project, setProject] = useState<VideoProject | null>(null);
  const [edit, setEdit] = useState<VideoEdit | null>(null);
  const [history, setHistory] = useState<VideoEdit[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [rendered, setRendered] = useState(false);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [connectUrl, setConnectUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'private' | 'unlisted' | 'public'>('private');
  const [audience, setAudience] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const pairing = useRef<HTMLDialogElement>(null);
  const publishing = useRef<HTMLDialogElement>(null);
  const projectId = project?.id;
  const jobRunning = project?.status === 'rendering' || project?.status === 'publishing';
  const editable = Boolean(edit && project?.info && ['ready', 'rendered'].includes(project.status));

  const activate = (next: VideoProject | null) => {
    setProject(next);
    setEdit(next?.edit || null);
    setHistory([]);
    setDirty(false);
    setRendered(next?.status === 'rendered');
    setTitle(next?.name.replace(/\.[^.]+$/, '').slice(0, 100) || '');
    setCurrentTime(0);
    setError('');
    setMessage('');
  };

  const change = (next: VideoEdit) => {
    if (!edit) return;
    setHistory((previous) => [...previous.slice(-29), edit]);
    setEdit(next);
    setDirty(true);
    setRendered(false);
    setMessage('Unsaved changes');
  };

  const action = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try { await operation(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Operation failed.'); }
    finally { setBusy(false); }
  };

  const refreshChannel = async () => {
    const response = await fetch(`${API_BASE}/api/youtube/status`, { headers: workspaceHeaders() });
    setChannel(await readResponse<Channel>(response));
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void projectRequest<VideoProject[]>('').then((list) => {
      if (cancelled) return;
      setProjects(list);
      const requested = new URLSearchParams(window.location.search).get('project');
      activate(list.find((item) => item.id === requested) || list[0] || null);
    }).catch((cause) => { if (!cancelled) setError(cause.message); });
    void refreshChannel().catch(() => {});
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    let active = false;
    const update = async () => {
      if (active) return;
      active = true;
      try {
        const next = await projectRequest<VideoProject>(`/${projectId}`);
        if (cancelled) return;
        setProject(next);
        setProjects((list) => list.map((item) => item.id === next.id ? next : item));
        setEdit((current) => current || (next.edit ? { ...next.edit, studio: selectedStudio.id } : null));
        setTitle((current) => current || next.name.replace(/\.[^.]+$/, '').slice(0, 100));
      } catch (cause) { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Connection lost.'); }
      finally { active = false; }
    };
    const interval = window.setInterval(() => void update(), 2500);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [projectId]);

  useEffect(() => {
    if (project?.status === 'rendered' && !dirty) {
      setRendered(true);
      setMessage('Render ready');
    }
  }, [project?.status]);

  const create = () => action(async () => {
    if (dirty && !window.confirm('Discard unsaved edits?')) return;
    const next = await projectRequest<VideoProject>('', 'POST', {});
    setProjects((list) => [...list, next]);
    activate(next);
  });

  const save = async () => {
    if (!project || !edit) return;
    const next = await projectRequest<VideoProject>(`/${project.id}/edit`, 'PUT', edit);
    setProject(next);
    setDirty(false);
    setRendered(false);
    setMessage('Saved');
  };

  const render = () => action(async () => {
    if (!project) return;
    await save();
    setProject(await projectRequest<VideoProject>(`/${project.id}/render`, 'POST', {}));
    setMessage('Rendering');
  });

  const split = () => {
    if (!edit) return;
    const index = edit.segments.findIndex((segment) => currentTime >= segment.start + 0.1 && currentTime <= segment.end - 0.1);
    if (index < 0) { setError('Choose a point inside a retained scene.'); return; }
    const segment = edit.segments[index];
    change({ ...edit, segments: [...edit.segments.slice(0, index), { start: segment.start, end: currentTime },
      { start: currentTime, end: segment.end }, ...edit.segments.slice(index + 1)] });
  };

  const pair = () => action(async () => {
    if (!project) return;
    const next = await projectRequest<VideoProject>(`/${project.id}/transfer-link`, 'POST', {});
    setProject(next);
    pairing.current?.showModal();
  });
  const transferLink = project ? `${window.location.origin}/upload#project=${project.id}&token=${project.uploadToken}` : '';

  const publish = () => action(async () => {
    if (!project || !audience) return;
    publishing.current?.close();
    setProject(await projectRequest<VideoProject>(`/${project.id}/publish`, 'POST', {
      title, description, privacyStatus: privacy, madeForKids: audience === 'yes',
    }));
    setMessage('Uploading to YouTube');
  });

  return <main className="video-workspace">
    <header className="video-header"><Link to="/">Connecting Dot</Link><h1>Video editor</h1>
      <nav><Link to="/">New production</Link></nav>
    </header>
    <div className="video-layout">
      <aside className="video-sidebar">
        <div className="video-heading"><h2>Projects</h2><button title="New project" aria-label="New project" className="icon" disabled={busy} onClick={() => void create()}><Plus size={18} /></button></div>
        <div className="video-project-list">{projects.map((item, index) => <button key={item.id} aria-pressed={item.id === projectId} disabled={busy}
          onClick={() => { if (!dirty || window.confirm('Discard unsaved edits?')) activate(item); }}>
          <Film size={17} style={{ flexShrink: 0 }} /><span>{item.name || `Recording ${index + 1}`}</span>
        </button>)}</div>
        {project && <>
          <div className="video-muted">Expires {new Date(project.expiresAt).toLocaleString()}</div>
          {['empty', 'uploading'].includes(project.status) && <>
            <button disabled={busy} onClick={() => void pair()}><QrCode size={18} /> Transfer from phone</button>
            <VideoTransfer key={`${project.id}-${project.uploadToken}`} projectId={project.id} token={project.uploadToken} />
          </>}
          <button className="danger" disabled={busy || jobRunning} onClick={() => void action(async () => {
            if (!window.confirm('Delete this project and all its temporary video files?')) return;
            await projectRequest(`/${project.id}`, 'DELETE');
            setProjects((list) => list.filter((item) => item.id !== project.id));
            activate(null);
          })}><Trash2 size={17} /> Delete project</button>
        </>}
      </aside>
      <section className="video-main">
        <div className="video-heading"><h2>{project?.name || 'New recording'}</h2><span className="video-muted" role="status">{project?.status || 'No project'}</span></div>
        {error && <div className="video-error" role="alert">{error}</div>}
        {project?.error && <div className="video-error" role="alert">{project.error}</div>}
        {project?.status === 'published' ? <div className="video-success"><CheckCircle2 /><a href={project.youtubeUrl} target="_blank" rel="noreferrer">Open on YouTube</a></div> : <>
          <div className="video-actions">
            <button aria-pressed={!rendered} disabled={!project?.info || jobRunning} onClick={() => setRendered(false)}>Original</button>
            <button aria-pressed={rendered} disabled={project?.status !== 'rendered' || dirty} onClick={() => setRendered(true)}>Rendered</button>
            {rendered && project && <a href={mediaUrl(project, 'render')} target="_blank" rel="noreferrer" download="connecting-dot.mp4" title="Download rendered video"><Download size={20} aria-label="Download rendered video" /></a>}
          </div>
          <div className="video-monitor">
            {project?.info ? <video ref={video} key={`${project.id}-${rendered}`} src={mediaUrl(project, rendered ? 'render' : 'source')}
              controls playsInline preload="metadata" onTimeUpdate={() => setCurrentTime(video.current?.currentTime || 0)}
              onError={() => setError('Preview unavailable. This browser may not support the source codec; try rendering an MP4 preview.')} />
              : <div className="video-monitor-empty"><Clapperboard size={44} /><h2>Your recording</h2>
                {!project && <button className="primary" disabled={busy} onClick={() => void create()}><Plus size={18} /> New project</button>}</div>}
          </div>
        </>}
        {jobRunning && <><progress aria-label="Render progress" value={project?.status === 'rendering' ? project.progress : undefined} max={100} />
          <span className="video-muted">{project?.status === 'rendering' ? `Rendering ${project.progress}%` : 'Publishing'}</span></>}
        <fieldset disabled={!editable || busy || jobRunning} className="video-section">
          <div className="video-heading"><h2>Retained scenes</h2><span className="video-muted">{edit ? displayTime(editDuration(edit)) : '0:00'} total</span></div>
          <div className="video-actions">
            <button title="Split at playhead" disabled={!editable || rendered || (edit?.segments.length || 0) >= 40} onClick={split}><Scissors size={17} /> Split at {displayTime(currentTime)}</button>
            <button className="icon" title="Undo edit" aria-label="Undo edit" disabled={!history.length} onClick={() => {
              const previous = history[history.length - 1];
              if (previous) { setEdit(previous); setHistory(history.slice(0, -1)); setDirty(true); setRendered(false); }
            }}><Undo2 size={17} /></button>
          </div>
          {edit?.segments.map((segment, index) => <div className="video-segment" key={index}>
            <label>Scene {index + 1} start (s)<input aria-label={`Scene ${index + 1} start`} type="number" min={0} max={project?.info?.duration} step="0.1" value={segment.start}
              onChange={(event) => change({ ...edit, segments: edit.segments.map((item, current) => current === index ? { ...item, start: Number(event.target.value) } : item) })} /></label>
            <label>End (s)<input aria-label={`Scene ${index + 1} end`} type="number" min={0} max={project?.info?.duration} step="0.1" value={segment.end}
              onChange={(event) => change({ ...edit, segments: edit.segments.map((item, current) => current === index ? { ...item, end: Number(event.target.value) } : item) })} /></label>
            <button className="icon danger" title={`Remove scene ${index + 1}`} aria-label={`Remove scene ${index + 1}`} disabled={edit.segments.length === 1}
              onClick={() => change({ ...edit, segments: edit.segments.filter((_, current) => current !== index) })}><Trash2 size={17} /></button>
          </div>)}
        </fieldset>
        <fieldset disabled={!editable || busy || jobRunning} className="video-section">
          <div className="video-heading"><h2>Text & animation</h2><button className="icon" title="Add text" aria-label="Add text" disabled={!edit || edit.overlays.length >= 12}
            onClick={() => edit && change({ ...edit, overlays: [...edit.overlays, { text: 'Connecting Dot', start: 0, end: Math.min(5, editDuration(edit)), position: 'bottom', animation: 'fade' }] })}><Plus size={18} /></button></div>
          {edit?.overlays.map((overlay, index) => {
            const update = (patch: Partial<typeof overlay>) => change({ ...edit, overlays: edit.overlays.map((item, current) => current === index ? { ...item, ...patch } : item) });
            return <div className="video-overlay" key={index}>
              <label>Text {index + 1}<input maxLength={100} value={overlay.text} onChange={(event) => update({ text: event.target.value })} /></label>
              <div className="video-columns"><label>Edited start (s)<input type="number" min={0} step="0.1" value={overlay.start} onChange={(event) => update({ start: Number(event.target.value) })} /></label>
                <label>Edited end (s)<input type="number" min={0} step="0.1" value={overlay.end} onChange={(event) => update({ end: Number(event.target.value) })} /></label></div>
              <div className="video-columns"><label>Position<select value={overlay.position} onChange={(event) => update({ position: event.target.value as 'top' | 'bottom' })}><option value="top">Top</option><option value="bottom">Lower third</option></select></label>
                <label>Animation<select value={overlay.animation} onChange={(event) => update({ animation: event.target.value as 'none' | 'fade' })}><option value="fade">Fade</option><option value="none">None</option></select></label></div>
              <button className="icon danger" title="Remove text" aria-label={`Remove text ${index + 1}`} onClick={() => change({ ...edit, overlays: edit.overlays.filter((_, current) => current !== index) })}><Trash2 size={17} /></button>
            </div>;
          })}
        </fieldset>
      </section>
      <aside className="video-settings">
        <fieldset disabled={!editable || busy || jobRunning} className="video-section">
          <h2>Output</h2>
          <label>Studio<select value={edit?.studio || selectedStudio.id} onChange={(event) => edit && change({ ...edit, studio: findStudio(event.target.value).id })}>
            {STUDIOS.map((studio) => <option value={studio.id} key={studio.id}>{studio.name}</option>)}
          </select></label>
          <img src={findStudio(edit?.studio || selectedStudio.id).image} alt="Selected studio backdrop" style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 6 }} />
          <label>Format<select value={edit?.format || 'landscape'} onChange={(event) => edit && change({ ...edit, format: event.target.value as 'landscape' | 'shorts' })}><option value="landscape">Landscape / 16:9</option><option value="shorts">Shorts / 9:16</option></select></label>
          <label>Studio frame<select value={edit?.frame || 'studio'} onChange={(event) => edit && change({ ...edit, frame: event.target.value as 'studio' | 'clean' })}><option value="studio">Studio backdrop</option><option value="clean">Clean</option></select></label>
          <label className="video-check"><input type="checkbox" checked={edit?.voice || false} disabled={!project?.info?.audio} onChange={(event) => edit && change({ ...edit, voice: event.target.checked })} /> Clean & level voice</label>
          <div className="video-actions"><button title="Save edits" disabled={!dirty} onClick={() => void action(save)}><Save size={17} /> Save</button>
            <button className="primary" onClick={() => void render()}><Clapperboard size={17} /> Render</button></div>
          <span className="video-muted" role="status">{message}</span>
        </fieldset>
        <section className="video-section">
          <div className="video-heading"><h2>YouTube</h2><button className="icon" title="Refresh channel" aria-label="Refresh channel" disabled={busy} onClick={() => void action(refreshChannel)}><RefreshCw size={17} /></button></div>
          {channel?.targetHandle && (
            <div style={{ marginBottom: 6 }}>
              <span className="video-muted" style={{ fontSize: 12 }}>Target: </span>
              <a href={channel.channelUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>{channel.targetHandle} ↗</a>
            </div>
          )}
          <span className="video-muted">{channel?.connected ? `Connected: ${channel.channelTitle || channel.targetHandle}` : 'Not connected'}</span>
          {channel && !channel.configured && <span className="video-error" role="status">Google authorization setup required on the server.</span>}
          {channel?.connected && <button disabled={busy || jobRunning} onClick={() => void action(async () => {
            await readResponse(await fetch(`${API_BASE}/api/youtube/disconnect`, { method: 'POST', headers: workspaceHeaders() }));
            await refreshChannel();
          })}>Disconnect channel</button>}
          {!channel?.connected && <button className="primary" disabled={busy || !channel?.configured} onClick={() => void action(async () => {
            const response = await fetch(`${API_BASE}/api/youtube/auth-url`, { headers: workspaceHeaders() });
            const result = await readResponse<{ url: string }>(response);
            setConnectUrl(result.url);
            window.open(result.url, '_blank');
          })}><Upload size={18} /> Connect channel</button>}
          {connectUrl && !channel?.connected && <a href={connectUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8, fontWeight: 700 }}>👉 Complete authorization on Google ↗</a>}
          <label>Title<input value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>Description<textarea value={description} maxLength={5000} onChange={(event) => setDescription(event.target.value)} /></label>
          <label>Visibility<select value={privacy} onChange={(event) => setPrivacy(event.target.value as typeof privacy)}><option value="private">Private</option><option value="unlisted">Unlisted</option><option value="public">Public</option></select></label>
          <label>Made for kids?<select value={audience} onChange={(event) => setAudience(event.target.value)}><option value="">Select audience</option><option value="no">No</option><option value="yes">Yes</option></select></label>
          <button className="primary" disabled={busy || project?.status !== 'rendered' || dirty || !channel?.connected || !title.trim() || !audience}
            onClick={() => publishing.current?.showModal()}><Upload size={18} /> Publish to YouTube</button>
        </section>
      </aside>
    </div>
    <dialog ref={pairing}><div className="video-heading"><h2>Transfer from phone</h2><button className="icon" title="Close" aria-label="Close transfer dialog" onClick={() => pairing.current?.close()}><X size={18} /></button></div>
      <div className="video-qr"><QRCodeSVG value={transferLink} size={240} marginSize={3} bgColor="#ffffff" fgColor="#111315" />
        <span className="video-muted">Upload only / Expires {project && new Date(project.uploadExpiresAt).toLocaleTimeString()}</span>
        <button onClick={() => void action(async () => { await navigator.clipboard.writeText(transferLink); setMessage('Transfer link copied'); })}><Copy size={17} /> Copy transfer link</button>
        <a href={transferLink} target="_blank" rel="noreferrer">Open upload page</a></div>
    </dialog>
    <dialog ref={publishing}><h2>Publish this video?</h2><p>{title}</p><p>{channel?.channelTitle} / {privacy}</p>
      <p className="video-muted">Temporary source and rendered files will be deleted after YouTube confirms the upload. Keep your phone original.</p>
      <div className="video-actions"><button onClick={() => publishing.current?.close()}>Cancel</button><button className="primary" disabled={busy} onClick={() => void publish()}><Upload size={17} /> Confirm upload</button></div>
    </dialog>
  </main>;
}