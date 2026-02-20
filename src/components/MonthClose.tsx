import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import { X, Download, FileCheck, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { generateAttendancePDF } from '../lib/pdf';
import { useAttendance } from '../hooks/useAttendance';

interface MonthCloseProps {
    userId: string;
    month: Date;
    onClose: () => void;
}

interface DayRow {
    date: string;
    dayName: string;
    total: number;
    straordinario: number;
    permesso: number;
    ferie: number;
    notes: string;
}

const parseTime = (time: string): number | null => {
    if (!time) return null;
    const [hours, minutes] = time.split(':').map(Number);
    return hours + minutes / 60;
};

export const MonthClose: React.FC<MonthCloseProps> = ({ userId, month, onClose }) => {
    const [rows, setRows] = useState<DayRow[]>([]);
    const [loading, setLoading] = useState(true);
    const { formatDecimalToTime } = useAttendance(userId);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        fetchProfile();
    }, [userId]);

    const fetchProfile = async () => {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
        setProfile(data);
    };

    useEffect(() => {
        fetchAndCalculate();
    }, [month, userId]);

    const fetchAndCalculate = async () => {
        setLoading(true);
        const start = startOfMonth(month);
        const end = endOfMonth(month);
        const days = eachDayOfInterval({ start, end });

        const { data, error } = await supabase
            .from('daily_records')
            .select('*')
            .eq('user_id', userId)
            .gte('work_date', format(start, 'yyyy-MM-dd'))
            .lte('work_date', format(end, 'yyyy-MM-dd'));

        const records = (!error && data) ? data : [];

        const result: DayRow[] = days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const rec = records.find((r: any) => r.work_date === dateStr);

            if (!rec) {
                return {
                    date: format(day, 'dd/MM'),
                    dayName: format(day, 'EEE', { locale: it }),
                    total: 0,
                    straordinario: 0,
                    permesso: 0,
                    ferie: 0,
                    notes: ''
                };
            }

            if (rec?.is_vacation) {
                return {
                    date: format(day, 'dd/MM'),
                    dayName: format(day, 'EEE', { locale: it }),
                    total: 0,
                    straordinario: 0,
                    permesso: 0,
                    ferie: 8,
                    notes: rec.notes || ''
                };
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

            const THRESHOLD = 4;

            if (total === 0) {
                ferie = 0;
            } else if (total > THRESHOLD) {
                straordinario = total - THRESHOLD;
            } else if (total < THRESHOLD) {
                permesso = THRESHOLD - total;
            }

            return {
                date: format(day, 'dd/MM'),
                dayName: format(day, 'EEE', { locale: it }),
                total,
                straordinario,
                permesso,
                ferie,
                notes: rec.notes || ''
            };
        });

        setRows(result);
        setLoading(false);
    };

    const totals = rows.reduce(
        (acc, r) => ({
            total: acc.total + r.total,
            straordinario: acc.straordinario + r.straordinario,
            permesso: acc.permesso + r.permesso,
            ferie: acc.ferie + r.ferie
        }),
        { total: 0, straordinario: 0, permesso: 0, ferie: 0 }
    );

    const exportToExcel = () => {
        const data = rows.map(r => ({
            Data: r.date,
            Giorno: r.dayName,
            'Ore Totali': formatDecimalToTime(r.total),
            'Straordinario': formatDecimalToTime(r.straordinario),
            'Permesso': formatDecimalToTime(r.permesso),
            'Ferie': formatDecimalToTime(r.ferie),
            'Note': r.notes
        }));

        data.push({
            Data: 'TOTALE',
            Giorno: '',
            'Ore Totali': formatDecimalToTime(totals.total),
            'Straordinario': formatDecimalToTime(totals.straordinario),
            'Permesso': formatDecimalToTime(totals.permesso),
            'Ferie': formatDecimalToTime(totals.ferie),
            'Note': ''
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Chiusura Mese");
        XLSX.writeFile(wb, `Chiusura_${format(month, 'MMMM_yyyy')}.xlsx`);
    };

    const handleDownloadPDF = async () => {
        const { data: records } = await supabase
            .from('daily_records')
            .select('*')
            .eq('user_id', userId)
            .gte('work_date', format(startOfMonth(month), 'yyyy-MM-dd'))
            .lte('work_date', format(endOfMonth(month), 'yyyy-MM-dd'));

        await generateAttendancePDF({
            userName: profile?.full_name || 'Dipendente',
            month: month,
            records: records || []
        });
    };

    const submitClosure = async () => {
        const monthYear = format(month, 'yyyy-MM');
        const { error } = await supabase
            .from('monthly_closures')
            .upsert({
                user_id: userId,
                month_year: monthYear,
                submitted_at: new Date().toISOString()
            }, {
                onConflict: 'user_id, month_year'
            });

        if (!error) {
            alert('Chiusura mensile inviata con successo all\'amministrazione!');
        } else {
            alert('Errore durante l\'invio della chiusura: ' + error.message);
        }
    };

    return (
        <div className="month-close-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="month-close-sheet">
                <div className="month-close-header">
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--md-primary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                            Chiusura Mese
                        </div>
                        <div className="month-close-title">
                            {format(month, 'MMMM yyyy', { locale: it })}
                        </div>
                    </div>
                    <button className="close-sheet-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <div className="loading-container" style={{ minHeight: 200 }}>
                        <div className="spinner" />
                    </div>
                ) : (
                    <>
                        <div className="report-table-wrap">
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Giorno</th>
                                        <th>Ore Totali</th>
                                        <th>Straord.</th>
                                        <th>Permesso</th>
                                        <th>Ferie</th>
                                        <th>Note</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, i) => (
                                        <tr key={i}>
                                            <td>{row.date}</td>
                                            <td style={{ textTransform: 'capitalize' }}>{row.dayName}</td>
                                            <td style={{ fontWeight: 600 }}>{formatDecimalToTime(row.total)}</td>
                                            <td style={{ color: row.straordinario > 0 ? 'var(--md-warning)' : undefined }}>
                                                {row.straordinario > 0 ? `+${formatDecimalToTime(row.straordinario)}` : '—'}
                                            </td>
                                            <td style={{ color: row.permesso > 0 ? 'var(--md-error)' : undefined }}>
                                                {row.permesso > 0 ? formatDecimalToTime(row.permesso) : '—'}
                                            </td>
                                            <td style={{ color: row.ferie > 0 ? 'var(--md-success)' : undefined }}>
                                                {row.ferie > 0 ? `${formatDecimalToTime(row.ferie)}` : '—'}
                                            </td>
                                            <td className="report-note-cell">{row.notes || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={2}>TOTALE</td>
                                        <td style={{ fontWeight: 700 }}>{formatDecimalToTime(totals.total)}</td>
                                        <td>+{formatDecimalToTime(totals.straordinario)}</td>
                                        <td>{formatDecimalToTime(totals.permesso)}</td>
                                        <td>{formatDecimalToTime(totals.ferie)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="report-export-row">
                            <button className="secondary-btn" onClick={submitClosure} style={{ flex: 1, height: 44 }}>
                                <FileCheck size={18} /> Invia Ammin.
                            </button>
                            <button className="export-btn" onClick={handleDownloadPDF} style={{ flex: 1, height: 44, background: 'var(--md-primary)', color: 'white' }}>
                                <FileText size={18} /> Scarica PDF
                            </button>
                            <button className="secondary-btn" onClick={exportToExcel} style={{ flex: 1, height: 44 }}>
                                <Download size={18} /> Excel
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
