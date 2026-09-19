import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import VideoTransfer from '../components/VideoTransfer';
import './VideoEditor.css';

export default function MobileUpload() {
  const [parameters] = useState(() => new URLSearchParams(window.location.hash.slice(1)));
  const projectId = parameters.get('project') || '';
  const token = parameters.get('token') || '';
  return <main className="video-workspace mobile-transfer">
    <header className="video-header"><Link to="/">Connecting Dot</Link><span>Phone transfer</span></header>
    <section className="transfer-content">
      <Smartphone size={32} aria-hidden="true" />
      <h1>Upload your recording</h1>
      {projectId && token ? <VideoTransfer projectId={projectId} token={token} />
        : <p className="video-error">No transfer link. <Link to="/edit">Open the editor</Link></p>}
      <p className="video-muted">MP4, MOV or WebM / Up to 1 GB / Link valid for 1 hour</p>
    </section>
  </main>;
}