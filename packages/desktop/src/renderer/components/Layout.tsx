import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

const navigation = [
  { name: 'Dashboard', path: '/dashboard', icon: '📊' },
  { name: 'Inbox', path: '/inbox', icon: '📥' },
  { name: 'Projects', path: '/projects', icon: '🚀' },
  { name: 'Design Lab', path: '/design-lab', icon: '🎨' },
  { name: 'Polymarket', path: '/polymarket', icon: '📈' },
  { name: 'Vibe Coding', path: '/vibe-coding', icon: '💻' },
  { name: 'Insights', path: '/insights', icon: '💡' },
  { name: 'Settings', path: '/settings', icon: '⚙️' },
];

export default function Layout() {
  const location = useLocation();

  // Log page views (only if electronAPI is available)
  useEffect(() => {
    if (window.electronAPI?.activity) {
      window.electronAPI.activity.log('dashboard_viewed', 'app', undefined, undefined, {
        path: location.pathname
      });
    }
  }, [location.pathname]);

  const handleMinimize = () => window.electronAPI?.app.minimize();
  const handleMaximize = () => window.electronAPI?.app.maximize();
  const handleClose = () => window.electronAPI?.app.close();

  return (
    <div className="h-screen flex flex-col bg-dark-bg text-dark-text">
      {/* Custom Titlebar */}
      <div className="titlebar select-none">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold">IdealMe</span>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={handleMinimize} className="titlebar-button text-xs">
            −
          </button>
          <button onClick={handleMaximize} className="titlebar-button text-xs">
            □
          </button>
          <button onClick={handleClose} className="titlebar-button text-xs hover:bg-red-600">
            ×
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-dark-surface border-r border-dark-border flex flex-col">
          <div className="p-4">
            <h1 className="text-xl font-bold">IdealMe</h1>
            <p className="text-sm text-dark-muted">Your AI assistant</p>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-text hover:bg-dark-border'
                  }`
                }
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-dark-border">
            <div className="text-xs text-dark-muted">
              <div>Progress to $1M</div>
              <div className="mt-1 bg-dark-border rounded-full h-2">
                <div className="bg-primary-600 h-2 rounded-full" style={{ width: '0%' }} />
              </div>
              <div className="mt-1">$0 / $1,000,000</div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
