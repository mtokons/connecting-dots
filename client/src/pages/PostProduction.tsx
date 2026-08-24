import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, COLORS, FONTS } from '../utils/constants';
import LogoWatermark from '../components/LogoWatermark';
import SocialMediaPanel from '../components/SocialMediaPanel';
import YouTubeStudioPanel from '../components/YouTubeStudioPanel';
import Timeline from '../components/Timeline';
import ExportPresets from '../components/ExportPresets';
import type { ExportPreset } from '../types';

/**
 * Post-Production Studio
 *   - List recordings stored on the server
 *   - Multi-track timeline with markers/chapters
 *   - Trim with in/out points on visual timeline
 *   - Export with presets (YouTube, IG Reels, TikTok, Podcast audio, etc.)
 *   - Publish directly to social channels
 *   - Upload to Cloudinary CDN or YouTube
 */

interface ServerRecording {
  filename: string;
  size: number;
  created: string;
}

interface Marker {
  id: string;
  time: number;
  label: string;
  color?: string;
}

const PostProduction: React.FC = () => {
  const nav = useNavigate();
  const [recordings, setRecordings] = useState<ServerRecording[]>([]);
  const [selected, setSelected] = useState<ServerRecording | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimIn, setTrimIn] = useState(0);
  const [trimOut, setTrimOut] = useState(0);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [ffmpegError, setFfmpegError] = useState<string | null>(null);
  const [exportPreset, setExportPreset] = useState<ExportPreset | null>(null);
  const [storageInfo, setStorageInfo] = useState<{ totalRecordings: number; totalBytes: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'distribute'>('editor');
  const ffmpegRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch recordings list
  useEffect(() => {
    fetch(`${API_BASE}/api/recordings/list`)
      .then((r) => r.json())
      .then(setRecordings)
      .catch(() => setRecordings([]));

    fetch(`${API_BASE}/api/recordings/storage-info`)
      .then((r) => r.json())
      .then(setStorageInfo)
      .catch(() => {});
  }, []);

  // Lazy-load ffmpeg.wasm
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ffmpegMod: any = await import('@ffmpeg/ffmpeg').catch(() => {
          throw new Error(
            '@ffmpeg/ffmpeg not installed. Run "npm install @ffmpeg/ffmpeg @ffmpeg/util" inside client/.'
          );
        });
        const FFmpeg = ffmpegMod.FFmpeg;
        const instance = new FFmpeg();
        instance.on('log', ({ message }: any) => console.debug('[ffmpeg]', message));
        await instance.load();
        if (cancelled) return;
        ffmpegRef.current = instance;
        setFfmpegReady(true);
      } catch (err) {
        setFfmpegError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Video time update
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const handleTimeUpdate = () => setCurrentTime(vid.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    vid.addEventListener('timeupdate', handleTimeUpdate);
    vid.addEventListener('play', handlePlay);
    vid.addEventListener('pause', handlePause);

    return () => {
      vid.removeEventListener('timeupdate', handleTimeUpdate);
      vid.removeEventListener('play', handlePlay);
      vid.removeEventListener('pause', handlePause);
    };
  }, [videoUrl]);

  const pick = (rec: ServerRecording) => {
    setSelected(rec);
    setExportedBlob(null);
    setTrimIn(0);
    setTrimOut(0);
    setMarkers([]);
    setCurrentTime(0);
    setVideoUrl(`${API_BASE}/api/recordings/download/${encodeURIComponent(rec.filename)}`);
  };

  const onLoadedMeta = () => {
    if (!videoRef.current) return;
    const d = videoRef.current.duration || 0;
    setDuration(d);
    setTrimOut(d);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const addMarker = (time: number, label: string) => {
    setMarkers((prev) => [
      ...prev,
      { id: `marker-${Date.now()}`, time, label, color: '#F59E0B' },
    ]);
  };

  const removeMarker = (id: string) => {
    setMarkers((prev) => prev.filter((m) => m.id !== id));
  };

  const exportTrim = async () => {
    if (!ffmpegRef.current || !selected || !exportPreset) return;
    setBusy('Exporting…');
    try {
      const ffmpeg = ffmpegRef.current;
      const utilMod: any = await import('@ffmpeg/util');
      const fetchFile = utilMod.fetchFile;
      const inputName = 'input.webm';
      const ext = exportPreset.format;
      const outputName = `output.${ext}`;

      const data = await fetchFile(
        `${API_BASE}/api/recordings/download/${encodeURIComponent(selected.filename)}`
      );
      await ffmpeg.writeFile(inputName, data);

      const args: string[] = [
        '-ss', trimIn.toFixed(2),
        '-to', trimOut.toFixed(2),
        '-i', inputName,
      ];

      if (ext === 'mp3') {
        // Audio-only export
        args.push('-vn', '-c:a', exportPreset.codec, '-b:a', exportPreset.audioBitrate, outputName);
      } else {
        args.push(
          '-c:v', exportPreset.codec,
          '-preset', 'veryfast',
          '-pix_fmt', 'yuv420p',
          '-b:v', exportPreset.bitrate,
          '-c:a', 'aac',
          '-b:a', exportPreset.audioBitrate,
        );

        // Handle aspect ratio changes
        if (exportPreset.aspectRatio === '9:16') {
          args.push('-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2');
        }

        args.push(outputName);
      }

      await ffmpeg.exec(args);
      const out = await ffmpeg.readFile(outputName);
      const mimeType = ext === 'mp3' ? 'audio/mpeg' : ext === 'webm' ? 'video/webm' : 'video/mp4';
      const blob = new Blob([out], { type: mimeType });
      setExportedBlob(blob);
      setBusy(null);
    } catch (err) {
      setBusy(null);
      alert(`Export failed: ${err instanceof Error ? err.message : err}`);
    }
  };

  const downloadExport = () => {
    if (!exportedBlob || !exportPreset) return;
    const url = URL.createObjectURL(exportedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cd-${exportPreset.id}-${Date.now()}.${exportPreset.format}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const uploadToCloud = async () => {
    if (!exportedBlob) return;
    setBusy('Uploading to CDN…');
    try {
      const fd = new FormData();
      fd.append('file', exportedBlob, `cd-edit-${Date.now()}.${exportPreset?.format || 'mp4'}`);
      const r = await fetch(`${API_BASE}/api/storage/upload`, { method: 'POST', body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
      setBusy(null);
      alert(`Uploaded: ${data.url}`);
    } catch (err) {
      setBusy(null);
      alert(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const uploadToYouTube = async () => {
    if (!exportedBlob) return;
    const title = prompt('Video title:', `Connecting Dot — ${new Date().toLocaleDateString()}`);
    if (!title) return;
    const description = prompt('Description:', 'Recorded on Connecting Dot Studio.') || '';
    const token = localStorage.getItem('cd_token') || '';
    if (!token) { alert('Please login first'); return; }
    setBusy('Uploading to YouTube…');
    try {
      const fd = new FormData();
      fd.append('file', exportedBlob, `cd-${Date.now()}.${exportPreset?.format || 'mp4'}`);
      fd.append('title', title);
      fd.append('description', description);
      fd.append('privacyStatus', 'unlisted');
      const r = await fetch(`${API_BASE}/api/youtube/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
      setBusy(null);
      window.open(data.url, '_blank');
    } catch (err) {
      setBusy(null);
      alert(err instanceof Error ? err.message : 'YouTube upload failed');
    }
  };

  const deleteRecording = async (filename: string) => {
    if (!confirm(`Delete ${filename}?`)) return;
    try {
      await fetch(`${API_BASE}/api/recordings/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      setRecordings((prev) => prev.filter((r) => r.filename !== filename));
      if (selected?.filename === filename) {
        setSelected(null);
        setVideoUrl(null);
      }
    } catch { /* ignore */ }
  };

  const formatBytes = (b: number) => {
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, color: '#fff', fontFamily: FONTS.ui }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          padding: '20px 40px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(5,10,21,0.95)',
          backdropFilter: 'blur(20px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div onClick={() => nav('/')} style={{ cursor: 'pointer' }}>
          <LogoWatermark size="sm" variant="light" />
        </div>
        <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.1)' }} />
        <h1 style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 900, letterSpacing: '0.1em', margin: 0 }}>
          POST‑PRODUCTION
        </h1>

        {storageInfo && (
          <div
            style={{
              marginLeft: 20,
              fontSize: 10,
              fontWeight: 800,
              color: 'rgba(255,255,255,0.4)',
              background: 'rgba(255,255,255,0.03)',
              padding: '6px 12px',
              borderRadius: 8,
              letterSpacing: '0.1em',
            }}
          >
            💾 {storageInfo.totalRecordings} files • {formatBytes(storageInfo.totalBytes)}
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button onClick={() => nav('/admin')} style={topBtn}>ADMIN</button>
          <button onClick={() => nav('/')} style={topBtn}>HOME</button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 340px', gap: 0, height: 'calc(100vh - 73px)' }}>
        {/* Left: Recordings List */}
        <section
          style={{
            padding: 20,
            borderRight: '1px solid rgba(255,255,255,0.06)',
            overflowY: 'auto',
            background: 'rgba(0,0,0,0.15)',
          }}
        >
          <h3 style={sectionH}>RECORDINGS</h3>
          <div style={{ display: 'grid', gap: 6 }}>
            {recordings.length === 0 && (
              <div style={{ opacity: 0.4, fontSize: 12, padding: 20, textAlign: 'center' }}>
                No recordings on server.
                <br />
                Record a session in the Studio to get started.
              </div>
            )}
            {recordings.map((r) => (
              <div
                key={r.filename}
                style={{
                  textAlign: 'left',
                  background:
                    selected?.filename === r.filename
                      ? 'rgba(0,168,255,0.12)'
                      : 'rgba(255,255,255,0.03)',
                  border:
                    selected?.filename === r.filename
                      ? '1px solid rgba(0,168,255,0.3)'
                      : '1px solid rgba(255,255,255,0.04)',
                  padding: 12,
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  onClick={() => pick(r)}
                  style={{ fontWeight: 800, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {r.filename}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <div style={{ opacity: 0.4, fontSize: 9 }}>
                    {formatBytes(r.size)} · {new Date(r.created).toLocaleString()}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); void deleteRecording(r.filename); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,77,77,0.5)',
                      fontSize: 10,
                      cursor: 'pointer',
                      padding: '2px 6px',
                    }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Center: Editor */}
        <section style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tab Bar */}
          <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 3 }}>
            {(['editor', 'distribute'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 10,
                  border: 'none',
                  background: activeTab === tab ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.35)',
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: '0.18em',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {tab === 'editor' ? '✂️ EDITOR' : '📡 DISTRIBUTE'}
              </button>
            ))}
          </div>

          {activeTab === 'editor' ? (
            <>
              {!selected ? (
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                    opacity: 0.4,
                  }}
                >
                  <div style={{ fontSize: 48 }}>🎬</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Select a recording to begin editing</div>
                </div>
              ) : (
                <>
                  {/* Video Player */}
                  <div style={{ borderRadius: 18, overflow: 'hidden', background: '#000', position: 'relative' }}>
                    <video
                      ref={videoRef}
                      src={videoUrl ?? undefined}
                      controls
                      onLoadedMetadata={onLoadedMeta}
                      style={{ width: '100%', maxHeight: 420, display: 'block' }}
                    />
                  </div>

                  {/* Timeline */}
                  <Timeline
                    duration={duration}
                    currentTime={currentTime}
                    trimIn={trimIn}
                    trimOut={trimOut}
                    markers={markers}
                    onSeek={handleSeek}
                    onTrimInChange={setTrimIn}
                    onTrimOutChange={setTrimOut}
                    onAddMarker={addMarker}
                    onRemoveMarker={removeMarker}
                    isPlaying={isPlaying}
                  />

                  {/* Export Presets */}
                  <ExportPresets
                    selected={exportPreset}
                    onSelect={setExportPreset}
                    disabled={!ffmpegReady}
                  />

                  {/* Export Actions */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {ffmpegError && (
                      <div style={{ width: '100%', background: 'rgba(255,77,77,0.1)', color: '#FF8888', padding: 12, borderRadius: 12, fontSize: 12 }}>
                        {ffmpegError}
                      </div>
                    )}

                    <button
                      onClick={exportTrim}
                      disabled={!ffmpegReady || busy !== null || trimOut <= trimIn || !exportPreset}
                      style={{
                        ...primaryBtn,
                        flex: 1,
                        opacity: !ffmpegReady || !exportPreset ? 0.5 : 1,
                      }}
                    >
                      {!ffmpegReady
                        ? '⏳ LOADING EDITOR…'
                        : busy || (!exportPreset ? 'SELECT A PRESET' : `🎬 EXPORT ${exportPreset.name.toUpperCase()}`)}
                    </button>
                  </div>

                  {/* Exported File Actions */}
                  {exportedBlob && (
                    <div
                      style={{
                        padding: 16,
                        background: 'rgba(16,185,129,0.05)',
                        border: '1px solid rgba(16,185,129,0.15)',
                        borderRadius: 16,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 900, color: '#10B981', letterSpacing: '0.15em' }}>
                        ✅ EXPORT COMPLETE — {formatBytes(exportedBlob.size)}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={downloadExport} style={secondaryBtn}>💾 DOWNLOAD</button>
                        <button onClick={uploadToCloud} style={secondaryBtn}>☁️ CDN UPLOAD</button>
                        <button onClick={uploadToYouTube} style={secondaryBtn}>▶️ YOUTUBE</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            // Distribute Tab
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <SocialMediaPanel
                mode="recorded"
                recordingFilename={selected?.filename}
                recordingBlob={exportedBlob}
                defaultTitle={selected?.filename?.replace(/\.webm$/, '') ?? ''}
                defaultMessage="New episode is up on Connecting Dot Studio! 🎙️"
              />
            </div>
          )}
        </section>

        {/* Right: Distribution Sidebar */}
        <section
          style={{
            padding: 20,
            borderLeft: '1px solid rgba(255,255,255,0.06)',
            overflowY: 'auto',
            background: 'rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <YouTubeStudioPanel />
          <SocialMediaPanel
            mode="recorded"
            recordingFilename={selected?.filename}
            recordingBlob={exportedBlob}
            defaultTitle={selected?.filename?.replace(/\.webm$/, '') ?? ''}
            defaultMessage="New episode is up on Connecting Dot Studio! 🎙️"
          />
        </section>
      </div>
    </div>
  );
};

const sectionH: React.CSSProperties = {
  margin: 0,
  marginBottom: 16,
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: '0.2em',
  color: 'rgba(255,255,255,0.4)',
};

const topBtn: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: '0.15em',
};

const primaryBtn: React.CSSProperties = {
  padding: '14px 20px',
  borderRadius: 14,
  border: 'none',
  background: 'linear-gradient(180deg, #00A8FF 0%, #0057A8 100%)',
  color: '#fff',
  fontWeight: 900,
  fontSize: 13,
  letterSpacing: '0.08em',
  cursor: 'pointer',
  boxShadow: '0 8px 24px rgba(0,168,255,0.3)',
};

const secondaryBtn: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: '#fff',
  fontWeight: 800,
  fontSize: 11,
  cursor: 'pointer',
  letterSpacing: '0.08em',
};

export default PostProduction;
