import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import { X, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

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

            if (total === 0) {
                ferie = 8;
            } else if (total > 8) {
                straordinario = total - 8;
            } else if (total < 8) {
                permesso = 8 - total;
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
            'Ore Totali': r.total.toFixed(2),
            'Straordinario': r.straordinario.toFixed(2),
            'Permesso': r.permesso.toFixed(2),
            'Ferie': r.ferie.toFixed(2),
            'Note': r.notes
        }));

        // Add totals row
        data.push({
            Data: 'TOTALE',
            Giorno: '',
            'Ore Totali': totals.total.toFixed(2),
            'Straordinario': totals.straordinario.toFixed(2),
            'Permesso': totals.permesso.toFixed(2),
            'Ferie': totals.ferie.toFixed(2),
            'Note': ''
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Chiusura Mese");
        XLSX.writeFile(wb, `Chiusura_${format(month, 'MMMM_yyyy')}.xlsx`);
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
                                            <td>{row.total.toFixed(2)}</td>
                                            <td style={{ color: row.straordinario > 0 ? 'var(--md-warning)' : undefined }}>
                                                {row.straordinario > 0 ? `+${row.straordinario.toFixed(2)}` : '—'}
                                            </td>
                                            <td style={{ color: row.permesso > 0 ? 'var(--md-error)' : undefined }}>
                                                {row.permesso > 0 ? row.permesso.toFixed(2) : '—'}
                                            </td>
                                            <td style={{ color: row.ferie > 0 ? 'var(--md-success)' : undefined }}>
                                                {row.ferie > 0 ? `${row.ferie.toFixed(2)}` : '—'}
                                            </td>
                                            <td className="report-note-cell">{row.notes || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={2}>TOTALE</td>
                                        <td>{totals.total.toFixed(2)}</td>
                                        <td>+{totals.straordinario.toFixed(2)}</td>
                                        <td>{totals.permesso.toFixed(2)}</td>
                                        <td>{totals.ferie.toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="report-export-row">
                            <button className="export-btn" onClick={exportToExcel}>
                                <Download size={18} /> Esporta Excel
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
