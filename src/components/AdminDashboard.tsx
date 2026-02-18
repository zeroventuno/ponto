import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, FileCheck, Search, Download, ChevronRight } from 'lucide-react';

interface UserProfile {
    id: string;
    full_name: string | null;
    email: string;
    role: string;
}

interface Closure {
    user_id: string;
    month_year: string;
    submitted_at: string;
}

export const AdminDashboard: React.FC = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [closures, setClosures] = useState<Closure[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);

        // Fetch all profiles
        const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('*');

        // Fetch all closures for the current/previous months
        const { data: closuresData, error: closuresError } = await supabase
            .from('monthly_closures')
            .select('*')
            .order('submitted_at', { ascending: false });

        if (!profilesError && profilesData) {
            // In a real scenario, we might want to join with auth.users to get emails
            // For now, we use the display names
            setUsers(profilesData);
        }

        if (!closuresError && closuresData) {
            setClosures(closuresData);
        }

        setLoading(false);
    };

    const filteredUsers = users.filter(user =>
        (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="admin-container">
            <div className="dashboard-hero">
                <h1>Area Amministrazione</h1>
                <p>Gestisci i dipendenti e i loro chiusure mensili</p>
            </div>

            <div className="admin-grid">
                <section className="admin-card">
                    <div className="card-header">
                        <div className="card-icon"><Users size={20} /></div>
                        <h2>Dipendenti</h2>
                    </div>

                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Cerca dipendente..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="user-list">
                        {loading ? (
                            <div className="spinner-small" />
                        ) : filteredUsers.length === 0 ? (
                            <p className="empty-state">Nessun dipendente trovato</p>
                        ) : (
                            filteredUsers.map(user => (
                                <div key={user.id} className="user-item">
                                    <div className="user-info">
                                        <div className="user-avatar">
                                            {user.full_name?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                            <div className="user-name">{user.full_name || 'Utente senza nome'}</div>
                                            <div className="user-role">{user.role}</div>
                                        </div>
                                    </div>
                                    <button className="icon-btn">
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section className="admin-card">
                    <div className="card-header">
                        <div className="card-icon"><FileCheck size={20} /></div>
                        <h2>Ultime Chiusure</h2>
                    </div>

                    <div className="closures-list">
                        {loading ? (
                            <div className="spinner-small" />
                        ) : closures.length === 0 ? (
                            <p className="empty-state">Nessuna chiusura inviata</p>
                        ) : (
                            closures.map(closure => {
                                const user = users.find(u => u.id === closure.user_id);
                                return (
                                    <div key={`${closure.user_id}-${closure.month_year}`} className="closure-item">
                                        <div className="closure-info">
                                            <div className="closure-month">
                                                {closure.month_year}
                                            </div>
                                            <div className="closure-user">
                                                {user?.full_name || 'Utente'}
                                            </div>
                                        </div>
                                        <button className="pdf-btn" title="Genera PDF">
                                            <Download size={16} /> PDF
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};
