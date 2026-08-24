import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Studio from './pages/Studio';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
import PostProduction from './pages/PostProduction';
import Login from './pages/Login';
import GuestJoin from './pages/GuestJoin';

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
          <Routes>
            <Route path="/" element={<Lobby />} />
            <Route path="/episodes" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/studio/:roomId" element={<Studio />} />
            <Route path="/join/:episodeId" element={<GuestJoin />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/post" element={<PostProduction />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </div>
  );
};

export default App;
