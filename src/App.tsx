import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthUI } from './components/AuthUI';
import { Dashboard } from './components/Dashboard';
import { History } from './components/History';
import { History as HistoryIcon, Clock, LogOut, Sun, Moon, ShieldCheck, User } from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
import { HourglassIcon } from './components/HourglassIcon';
import { UserProfile } from './components/UserProfile';
import { supabase } from './lib/supabase';

function App() {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'clock' | 'history' | 'admin' | 'profile'>('clock');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  const [nameUpdateLoading, setNameUpdateLoading] = useState(false);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tempName.trim()) return;
    setNameUpdateLoading(true);

    // Update profile
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: tempName })
      .eq('id', user.id);

    if (!error) {
      window.location.reload(); // Quickest way to refresh profile
    }
    setNameUpdateLoading(false);
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

  // Profile completion check
  if (user && profile && !profile.full_name) {
    return (
      <div className="auth-page">
        <header className="app-header">
          <div className="app-logo">
            <div className="app-logo-icon"><HourglassIcon size={28} /></div>
            <span className="app-logo-text">Ponto</span>
          </div>
        </header>
        <main className="auth-card" style={{ marginTop: 80 }}>
          <h2 className="auth-title">Completa il tuo profilo</h2>
          <p className="auth-subtitle">Per favore inserisci il teu nome e cognome per continuare.</p>
          <form onSubmit={handleUpdateName}>
            <div className="auth-field">
              <label className="auth-label">Nome Completo</label>
              <input
                type="text"
                className="auth-input"
                placeholder="João Silva"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="save-btn" disabled={nameUpdateLoading}>
              {nameUpdateLoading ? 'Salvataggio...' : 'Continua'}
            </button>
          </form>
          <button className="secondary-btn" onClick={() => supabase.auth.signOut()} style={{ marginTop: 16 }}>
            Esci
          </button>
        </main>
      </div>
    );
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
          <Dashboard
            userId={user.id}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onViewHistory={() => setActiveTab('history')}
          />
        ) : activeTab === 'history' ? (
          <History
            userId={user.id}
            onDateSelect={(date) => {
              setSelectedDate(date);
              setActiveTab('clock');
            }}
          />
        ) : activeTab === 'profile' ? (
          <UserProfile userId={user.id} />
        ) : (
          <AdminDashboard />
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
        <button
          onClick={() => setActiveTab('profile')}
          className={`m3-nav-item${activeTab === 'profile' ? ' active' : ''}`}
        >
          <div className="m3-nav-indicator">
            <User size={22} />
          </div>
          <span className="m3-nav-label">Profilo</span>
        </button>
        {profile?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`m3-nav-item${activeTab === 'admin' ? ' active' : ''}`}
          >
            <div className="m3-nav-indicator">
              <ShieldCheck size={22} />
            </div>
            <span className="m3-nav-label">Admin</span>
          </button>
        )}
      </nav>
    </div>
  );
}

export default App;
