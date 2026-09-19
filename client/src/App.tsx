import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext';
import ProductionHome from './pages/ProductionHome';
const Studio = lazy(() => import('./pages/Studio'));
const GuestJoin = lazy(() => import('./pages/GuestJoin'));
const MobileUpload = lazy(() => import('./pages/MobileUpload'));
const VideoEditor = lazy(() => import('./pages/VideoEditor'));

const App: React.FC = () => {
  return (
    <div
      style={{
        fontFamily: "'DM Sans', sans-serif",
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
      }}
    >
      <SocketProvider>
        <BrowserRouter>
          <Suspense fallback={<main className="workflow"><div className="workflow-content" role="status">Loading...</div></main>}>
          <Routes>
            <Route path="/" element={<ProductionHome />} />
            <Route path="/studio/:roomId" element={<Studio />} />
            <Route path="/join/:episodeId" element={<GuestJoin />} />
            <Route path="/post" element={<Navigate to="/edit" replace />} />
            <Route path="/upload" element={<MobileUpload />} />
            <Route path="/edit" element={<VideoEditor />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </SocketProvider>
    </div>
  );
};

export default App;
