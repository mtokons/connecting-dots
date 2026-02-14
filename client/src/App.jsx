import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PortalHome from './pages/PortalHome';
import NewsList from './pages/NewsList';
import PostDetail from './pages/PostDetail';
import PodcastsList from './pages/PodcastsList';
import PodcastDetail from './pages/PodcastDetail';
import LiveStreaming from './pages/LiveStreaming';
import ElectionHub from './pages/ElectionHub';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<PortalHome />} />
          <Route path="/news" element={<NewsList />} />
          <Route path="/news/:slug" element={<PostDetail />} />
          <Route path="/podcasts" element={<PodcastsList />} />
          <Route path="/podcasts/:slug" element={<PodcastDetail />} />
          <Route path="/live" element={<LiveStreaming />} />
          <Route path="/election" element={<ElectionHub />} />
        </Routes>
      </Layout>
    </Router>
  );
}
