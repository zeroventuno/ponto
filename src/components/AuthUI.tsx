import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, Moon, Sun } from 'lucide-react';
import { HourglassIcon } from './HourglassIcon';
interface AuthUIProps {
    toggleTheme: () => void;
    theme: 'light' | 'dark';
}

export const AuthUI: React.FC<AuthUIProps> = ({ toggleTheme, theme }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = isLogin
            ? await supabase.auth.signInWithPassword({ email, password })
            : await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: import.meta.env.VITE_REDIRECT_URL || window.location.origin,
                    data: {
                        full_name: fullName
                    }
                }
            });

        if (error) setError(error.message);
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <header className="app-header" style={{ maxWidth: 400, margin: '0 auto', padding: '16px 0', marginBottom: 40 }}>
                <div className="app-logo">
                    <div className="app-logo-icon"><HourglassIcon size={28} /></div>
                    <span className="app-logo-text">Ponto</span>
                </div>
                <button className="icon-btn" onClick={toggleTheme}>
                    {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
                </button>
            </header>

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="auth-card">
                    <div className="auth-icon-wrapper">
                        {isLogin ? <LogIn size={28} /> : <UserPlus size={28} />}
                    </div>
                    <h2 className="auth-title">
                        {isLogin ? 'Bentornato' : 'Inizia Ora'}
                    </h2>
                    <p className="auth-subtitle">
                        Registra le tue presenze facilmente
                    </p>

                    <form onSubmit={handleSubmit}>
                        {!isLogin && (
                            <div className="auth-field">
                                <label className="auth-label">Nome Completo</label>
                                <input
                                    type="text"
                                    className="auth-input"
                                    placeholder="João Silva"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>
                        )}
                        <div className="auth-field">
                            <label className="auth-label">Email</label>
                            <input
                                type="email"
                                className="auth-input"
                                placeholder="email@exemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="auth-field">
                            <label className="auth-label">Password</label>
                            <input
                                type="password"
                                className="auth-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && <div className="auth-error">{error}</div>}

                        <button type="submit" className="save-btn" disabled={loading} style={{ marginTop: 8 }}>
                            {loading ? 'Caricamento...' : isLogin ? 'Accedi' : 'Registrati'}
                        </button>
                    </form>

                    <div className="auth-switch">
                        <button onClick={() => setIsLogin(!isLogin)}>
                            {isLogin ? 'Crea un nuovo account' : 'Hai già un account? Accedi'}
                        </button>
                    </div>
                </div>

                <div className="auth-footer">
                    Officine Mattio • Ponto System
                </div>
            </main>
        </div>
    );
};
