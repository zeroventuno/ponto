import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { User, FileCheck, Calendar as CalendarIcon, Save, Trash2, AlertCircle } from 'lucide-react';
import { VacationRequestModal } from './VacationRequestModal';
import { useAuth } from '../hooks/useAuth';

interface UserProfileProps {
    userId: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId }) => {
    const { fetchProfile } = useAuth();
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [closures, setClosures] = useState<any[]>([]);
    const [vacations, setVacations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showVacationModal, setShowVacationModal] = useState(false);

    useEffect(() => {
        fetchUserData();
    }, [userId]);

    const fetchUserData = async () => {
        setLoading(true);
        // Fetch Profile
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileData) {
            setName(profileData.full_name || '');
        }

        // Fetch Closures
        const { data: closuresData } = await supabase
            .from('monthly_closures')
            .select('*')
            .eq('user_id', userId)
            .order('submitted_at', { ascending: false });

        if (closuresData) {
            setClosures(closuresData);
        }

        // Fetch Vacations
        const { data: vacationsData } = await supabase
            .from('vacation_requests')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (vacationsData) {
            setVacations(vacationsData);
        }

        setLoading(false);
    };

    const handleSaveName = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const { error } = await supabase
            .from('profiles')
            .update({ full_name: name })
            .eq('id', userId);

        if (!error) {
            alert('Il profilo è stato aggiornato.');
            await fetchProfile(userId);
        } else {
            alert('Errore durante il salvataggio.');
        }
        setSaving(false);
    };

    const handleCancelRequest = async (id: string) => {
        if (!confirm('Sei sicuro di voler annullare questa richiesta?')) return;

        const { error } = await supabase
            .from('vacation_requests')
            .update({ status: 'cancelled' })
            .eq('id', id);

        if (!error) {
            setVacations(vacations.map(v => v.id === id ? { ...v, status: 'cancelled' } : v));
        } else {
            alert('Errore: impossibile annullare la richiesta.');
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'approved': return 'Approvato';
            case 'rejected': return 'Rifiutato';
            case 'cancelled': return 'Annullato';
            default: return 'In attesa';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'var(--md-primary)';
            case 'rejected': return 'var(--md-error)';
            case 'cancelled': return 'var(--md-outline)';
            default: return 'var(--md-warning)';
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="page-container" style={{ paddingTop: 8 }}>
            <div className="m3-card" style={{ marginBottom: 16 }}>
                <div className="history-header">
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--md-primary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                            Dati Personali
                        </div>
                        <div className="history-title">Il Mio Profilo</div>
                    </div>
                    <div className="card-icon"><User size={24} /></div>
                </div>

                <form onSubmit={handleSaveName} style={{ marginTop: 16 }}>
                    <div className="auth-field">
                        <label className="auth-label">Nome Completo</label>
                        <input
                            type="text"
                            className="auth-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="save-btn" disabled={saving}>
                        <Save size={18} />
                        {saving ? 'Salvataggio...' : 'Salva Modifiche'}
                    </button>
                </form>
            </div>

            <div className="m3-card" style={{ marginBottom: 16 }}>
                <div className="history-header">
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--md-primary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                            Richieste
                        </div>
                        <div className="history-title">Ferie e Permessi</div>
                    </div>
                    <div className="card-icon"><CalendarIcon size={24} /></div>
                </div>

                <div style={{ marginTop: 16, marginBottom: 16 }}>
                    <button className="save-btn" onClick={() => setShowVacationModal(true)}>
                        <CalendarIcon size={18} /> Nuova Richiesta
                    </button>
                </div>

                <div className="closures-list">
                    {vacations.length === 0 ? (
                        <p className="empty-state">Nessuna richiesta di ferie trovata.</p>
                    ) : (
                        vacations.map(vac => (
                            <div key={vac.id} className="closure-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                    <strong>
                                        {format(new Date(vac.start_date), 'dd MMM yyyy', { locale: it })} - {format(new Date(vac.end_date), 'dd MMM yyyy', { locale: it })}
                                    </strong>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{
                                            color: getStatusColor(vac.status),
                                            fontWeight: 600,
                                            fontSize: 12,
                                            textTransform: 'uppercase',
                                            padding: '4px 8px',
                                            borderRadius: 12,
                                            backgroundColor: `${getStatusColor(vac.status)}20`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4
                                        }}>
                                            {vac.status === 'cancelled' && <AlertCircle size={14} />}
                                            {getStatusText(vac.status)}
                                        </span>
                                        {vac.status !== 'cancelled' && vac.status !== 'rejected' && (
                                            <button
                                                onClick={() => handleCancelRequest(vac.id)}
                                                className="icon-btn"
                                                style={{ color: 'var(--md-error)', padding: 4 }}
                                                title="Annulla richiesta"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--md-on-surface-variant)' }}>
                                    Richiesta inviata il {format(new Date(vac.created_at), 'dd/MM/yyyy')}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="m3-card">
                <div className="history-header">
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--md-primary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                            Amministrazione
                        </div>
                        <div className="history-title">Mesi Inviati</div>
                    </div>
                    <div className="card-icon"><FileCheck size={24} /></div>
                </div>

                <div className="closures-list" style={{ marginTop: 16 }}>
                    {closures.length === 0 ? (
                        <p className="empty-state">Nessun mese inviato finora.</p>
                    ) : (
                        closures.map(closure => (
                            <div key={closure.month_year} className="closure-item">
                                <div className="closure-info">
                                    <div className="closure-month">
                                        {format(new Date(closure.month_year + '-01'), 'MMMM yyyy', { locale: it })}
                                    </div>
                                    <div className="closure-user" style={{ fontSize: 12 }}>
                                        Inviato il {format(new Date(closure.submitted_at), 'dd/MM/yyyy')}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {showVacationModal && (
                <VacationRequestModal
                    userId={userId}
                    onClose={() => {
                        setShowVacationModal(false);
                        fetchUserData(); // Refresh list after close
                    }}
                />
            )}
        </div>
    );
};
