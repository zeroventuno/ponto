import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, FileCheck, Search, Download, ChevronRight, Calendar, CalendarDays, Check, X } from 'lucide-react';
import { format, endOfMonth, eachDayOfInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import { generateAttendancePDF } from '../lib/pdf';
import { AdminVacationTimeline } from './AdminVacationTimeline';
import * as XLSX from 'xlsx';

interface UserProfile {
    id: string;
    full_name: string | null;
    email?: string;
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
    const [vacations, setVacations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);

        const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('*');

        const { data: closuresData, error: closuresError } = await supabase
            .from('monthly_closures')
            .select('*')
            .order('submitted_at', { ascending: false });

        const { data: vacationsData, error: vacationsError } = await supabase
            .from('vacation_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (!profilesError && profilesData) {
            setUsers(profilesData);
        }

        if (!closuresError && closuresData) {
            setClosures(closuresData);
        }

        if (!vacationsError && vacationsData) {
            setVacations(vacationsData);
        }

        setLoading(false);
    };

    const handleGeneratePDF = async (closure: Closure) => {
        const user = users.find(u => u.id === closure.user_id);
        if (!user) return;

        const closureKey = `${closure.user_id}-${closure.month_year}`;
        setGenerating(closureKey);

        const [year, month] = closure.month_year.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = endOfMonth(startDate);

        const { data: recordsData, error } = await supabase
            .from('daily_records')
            .select('*')
            .eq('user_id', closure.user_id)
            .gte('work_date', format(startDate, 'yyyy-MM-dd'))
            .lte('work_date', format(endDate, 'yyyy-MM-dd'));

        if (!error && recordsData) {
            await generateAttendancePDF({
                userName: user.full_name || 'Dipendente',
                month: startDate,
                records: recordsData
            });
        }

        setGenerating(null);
    };

    const handleGenerateExcel = async (closure: Closure) => {
        const user = users.find(u => u.id === closure.user_id);
        if (!user) return;

        const closureKey = `${closure.user_id}-${closure.month_year}-excel`;
        setGenerating(closureKey);

        const [year, month] = closure.month_year.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = endOfMonth(startDate);
        const days = eachDayOfInterval({ start: startDate, end: endDate });

        const { data: recordsData, error } = await supabase
            .from('daily_records')
            .select('*')
            .eq('user_id', closure.user_id)
            .gte('work_date', format(startDate, 'yyyy-MM-dd'))
            .lte('work_date', format(endDate, 'yyyy-MM-dd'));

        if (!error) {
            const records = recordsData || [];

            const parseTime = (time: string): number | null => {
                if (!time) return null;
                const [hours, minutes] = time.split(':').map(Number);
                return hours + minutes / 60;
            };

            const formatDecimalToTime = (decimal: number) => {
                const h = Math.floor(decimal);
                const m = Math.round((decimal - h) * 60);
                return `${h}:${m.toString().padStart(2, '0')}`;
            };

            const rows = days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const rec = records.find(r => r.work_date === dateStr);

                if (!rec) {
                    return { date: format(day, 'dd/MM'), dayName: format(day, 'EEE', { locale: it }), total: 0, straordinario: 0, permesso: 0, ferie: 0, notes: '' };
                }

                if (rec.is_vacation) {
                    return { date: format(day, 'dd/MM'), dayName: format(day, 'EEE', { locale: it }), total: 0, straordinario: 0, permesso: 0, ferie: 8, notes: rec.notes || '' };
                }

                const mEnter = parseTime(rec.morning_enter);
                const mExit = parseTime(rec.morning_exit);
                const aEnter = parseTime(rec.afternoon_enter);
                const aExit = parseTime(rec.afternoon_exit);

                let morningH = 0;
                if (mEnter !== null && mExit !== null) morningH = Math.max(0, mExit - mEnter);
                let afternoonH = 0;
                if (aEnter !== null && aExit !== null) afternoonH = Math.max(0, aExit - aEnter);

                const total = morningH + afternoonH;
                let straordinario = 0;
                let permesso = 0;
                let ferie = 0;

                const THRESHOLD = 8;
                if (total === 0) {
                    ferie = 0;
                } else if (total > THRESHOLD) {
                    straordinario = total - THRESHOLD;
                } else if (total < THRESHOLD) {
                    permesso = THRESHOLD - total;
                }

                return { date: format(day, 'dd/MM'), dayName: format(day, 'EEE', { locale: it }), total, straordinario, permesso, ferie, notes: rec.notes || '' };
            });

            const totals = rows.reduce(
                (acc, r) => ({
                    total: acc.total + r.total,
                    straordinario: acc.straordinario + r.straordinario,
                    permesso: acc.permesso + r.permesso,
                    ferie: acc.ferie + r.ferie
                }),
                { total: 0, straordinario: 0, permesso: 0, ferie: 0 }
            );

            const exportData = rows.map(r => ({
                Data: r.date,
                Giorno: r.dayName,
                'Ore Totali': formatDecimalToTime(r.total),
                'Straordinario': formatDecimalToTime(r.straordinario),
                'Permesso': formatDecimalToTime(r.permesso),
                'Ferie': formatDecimalToTime(r.ferie),
                'Note': r.notes
            }));

            exportData.push({
                Data: 'TOTALE',
                Giorno: '',
                'Ore Totali': formatDecimalToTime(totals.total),
                'Straordinario': formatDecimalToTime(totals.straordinario),
                'Permesso': formatDecimalToTime(totals.permesso),
                'Ferie': formatDecimalToTime(totals.ferie),
                'Note': ''
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Chiusura Mese");
            XLSX.writeFile(wb, `Chiusura_${user.full_name?.replace(/\s+/g, '_')}_${format(startDate, 'MMMM_yyyy')}.xlsx`);
        }

        setGenerating(null);
    };

    const handleUpdateVacationStatus = async (id: string, newStatus: string) => {
        const { error } = await supabase
            .from('vacation_requests')
            .update({ status: newStatus })
            .eq('id', id);

        if (!error) {
            setVacations(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
        } else {
            alert('Errore durante l\'aggiornamento dello stato.');
        }
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
                                const closureKey = `${closure.user_id}-${closure.month_year}`;
                                return (
                                    <div key={closureKey} className="closure-item">
                                        <div className="closure-info">
                                            <div className="closure-month">
                                                {format(new Date(closure.month_year + '-01'), 'MMMM yyyy', { locale: it })}
                                            </div>
                                            <div className="closure-user">
                                                {user?.full_name || 'Utente'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button
                                                className="icon-btn"
                                                onClick={() => handleGeneratePDF(closure)}
                                                disabled={generating === closureKey}
                                                style={{ color: 'var(--md-error)' }}
                                                title="Scarica PDF"
                                            >
                                                <Download size={16} />
                                                <span style={{ fontSize: 12, fontWeight: 600 }}>PDF</span>
                                            </button>
                                            <button
                                                className="icon-btn"
                                                onClick={() => handleGenerateExcel(closure)}
                                                disabled={generating === `${closureKey}-excel`}
                                                style={{ color: 'var(--md-success)' }}
                                                title="Scarica Excel"
                                            >
                                                <Download size={16} />
                                                <span style={{ fontSize: 12, fontWeight: 600 }}>Excel</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>

                <section className="admin-card" style={{ gridColumn: '1 / -1' }}>
                    <div className="card-header">
                        <div className="card-icon"><Calendar size={20} /></div>
                        <h2>Richieste Ferie (In Attesa)</h2>
                    </div>

                    <div className="closures-list">
                        {loading ? (
                            <div className="spinner-small" />
                        ) : vacations.filter(v => v.status === 'pending').length === 0 ? (
                            <p className="empty-state">Nessuna richiesta in attesa</p>
                        ) : (
                            vacations.filter(v => v.status === 'pending').map(vac => {
                                const user = users.find(u => u.id === vac.user_id);
                                return (
                                    <div key={vac.id} className="closure-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{user?.full_name || 'Utente Sconosciuto'}</div>
                                                <div style={{ fontSize: 13, color: 'var(--md-on-surface-variant)' }}>
                                                    {format(new Date(vac.start_date), 'dd/MM/yyyy')} - {format(new Date(vac.end_date), 'dd/MM/yyyy')}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    onClick={() => handleUpdateVacationStatus(vac.id, 'approved')}
                                                    style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)', border: 'none', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                                                >
                                                    <Check size={16} /> Approva
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateVacationStatus(vac.id, 'rejected')}
                                                    style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--md-error-container)', color: 'var(--md-on-error-container)', border: 'none', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                                                >
                                                    <X size={16} /> Rifiuta
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>

                <section className="admin-card" style={{ gridColumn: '1 / -1' }}>
                    <div className="card-header">
                        <div className="card-icon"><CalendarDays size={20} /></div>
                        <h2>Calendario Ferie (Prossimi 30 Giorni)</h2>
                    </div>

                    <div style={{ marginTop: 16 }}>
                        <AdminVacationTimeline users={users} vacations={vacations} />
                    </div>
                </section>
            </div>
        </div>
    );
};
