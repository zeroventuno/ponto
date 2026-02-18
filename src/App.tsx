import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthUI } from './components/AuthUI';
import { Dashboard } from './components/Dashboard';
import { History } from './components/History';
import { History as HistoryIcon, Clock, LogOut, Sun, Moon } from 'lucide-react';
import { HourglassIcon } from './components/HourglassIcon';
import { supabase } from './lib/supabase';

function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'clock' | 'history'>('clock');
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <AuthUI toggleTheme={toggleTheme} theme={theme} />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-logo">
          <div className="app-logo-icon">
            <HourglassIcon size={28} />
          </div>
          <span className="app-logo-text">Ponto</span>
        </div>
        <div className="app-header-actions">
          <button className="icon-btn" onClick={toggleTheme} title="Cambia tema">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button className="icon-btn" onClick={() => supabase.auth.signOut()} title="Esci">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main>
        {activeTab === 'clock' ? (
          <Dashboard userId={user.id} onViewHistory={() => setActiveTab('history')} />
        ) : (
          <History userId={user.id} />
        )}
      </main>

      <nav className="m3-navbar">
        <button
          onClick={() => setActiveTab('clock')}
          className={`m3-nav-item${activeTab === 'clock' ? ' active' : ''}`}
        >
          <div className="m3-nav-indicator">
            <Clock size={22} />
          </div>
          <span className="m3-nav-label">Oggi</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`m3-nav-item${activeTab === 'history' ? ' active' : ''}`}
        >
          <div className="m3-nav-indicator">
            <HistoryIcon size={22} />
          </div>
          <span className="m3-nav-label">Storico</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
