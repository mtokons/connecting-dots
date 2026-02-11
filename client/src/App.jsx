import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import TreeView from './pages/TreeView';
import Constituencies from './pages/Constituencies';
import Predictions from './pages/Predictions';
import LiveStudio from './pages/LiveStudio';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tree" element={<TreeView />} />
          <Route path="/constituencies" element={<Constituencies />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/live" element={<LiveStudio />} />
        </Routes>
      </Layout>
    </Router>
  );
}
