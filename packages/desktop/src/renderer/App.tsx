import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import Inbox from './views/Inbox';
import Projects from './views/Projects';
import DesignLab from './views/DesignLab';
import PolymarketHub from './views/PolymarketHub';
import VibeCoding from './views/VibeCoding';
import Resources from './views/Resources';
import Insights from './views/Insights';
import Settings from './views/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="projects" element={<Projects />} />
          <Route path="design-lab" element={<DesignLab />} />
          <Route path="polymarket" element={<PolymarketHub />} />
          <Route path="vibe-coding" element={<VibeCoding />} />
          <Route path="resources" element={<Resources />} />
          <Route path="insights" element={<Insights />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
