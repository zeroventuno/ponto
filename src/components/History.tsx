import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import { Download, ChevronLeft, ChevronRight, FileCheck, Trash2, CheckCircle, Circle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { MonthClose } from './MonthClose';

interface HistoryProps {
    userId: string;
    onDateSelect: (date: Date) => void;
}

export const History: React.FC<HistoryProps> = ({ userId, onDateSelect }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [records, setRecords] = useState<any[]>([]);
    const [showMonthClose, setShowMonthClose] = useState(false);
    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchMonthRecords();
    }, [currentMonth, userId]);

    const fetchMonthRecords = async () => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);

        const { data, error } = await supabase
            .from('daily_records')
            .select('*')
            .eq('user_id', userId)
            .gte('work_date', format(start, 'yyyy-MM-dd'))
            .lte('work_date', format(end, 'yyyy-MM-dd'));

        if (!error && data) {
            setRecords(data);
        }
        setSelectedDates([]); // Clear selection on month change
    };

    const handleDelete = async () => {
        if (selectedDates.length === 0) return;
        if (!confirm(`Sei sicuro di voler eliminare ${selectedDates.length} record?`)) return;

        setIsDeleting(true);
        const { error } = await supabase
            .from('daily_records')
            .delete()
            .eq('user_id', userId)
            .in('work_date', selectedDates);

        if (!error) {
            setRecords(prev => prev.filter(r => !selectedDates.includes(r.work_date)));
            setSelectedDates([]);
        }
        setIsDeleting(false);
    };

    const toggleSelect = (dateStr: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedDates(prev =>
            prev.includes(dateStr)
                ? prev.filter(d => d !== dateStr)
                : [...prev, dateStr]
        );
    };

    const exportToExcel = () => {
        const data = records.map(r => ({
            Data: r.work_date,
            'Entrata Mattina': r.morning_enter,
            'Uscita Mattina': r.morning_exit,
            'Entrata Pomeriggio': r.afternoon_enter,
            'Uscita Pomeriggio': r.afternoon_exit,
            Note: r.notes
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Presenze");
        XLSX.writeFile(wb, `Presenze_${format(currentMonth, 'MMMM_yyyy')}.xlsx`);
    };

    const days = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    });

    const prevMonth = () => {
        setCurrentMonth(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() - 1);
            return startOfMonth(d);
        });
    };

    const nextMonth = () => {
        setCurrentMonth(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + 1);
            return startOfMonth(d);
        });
    };

    return (
        <div className="page-container" style={{ paddingTop: 8 }}>
            <div className="m3-card">
                <div className="history-header">
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--md-primary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                            Archivio
                        </div>
                        <div className="history-title">
                            {format(currentMonth, 'MMMM yyyy', { locale: it })}
                        </div>
                    </div>
                    <div className="history-nav">
                        <button className="cal-nav-btn" onClick={prevMonth}>
                            <ChevronLeft size={20} />
                        </button>
                        <button className="cal-nav-btn" onClick={nextMonth}>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="history-actions">
                    <button className="export-btn" onClick={exportToExcel}>
                        <Download size={18} /> Esporta Excel
                    </button>
                    <button className="export-btn" onClick={() => setShowMonthClose(true)} style={{ background: 'var(--md-surface-variant)', color: 'var(--md-on-surface)' }}>
                        <FileCheck size={18} /> Chiusura Mese
                    </button>
                    {selectedDates.length > 0 && (
                        <button className="export-btn" onClick={handleDelete} disabled={isDeleting} style={{ background: 'var(--md-error-container)', color: 'var(--md-error)' }}>
                            <Trash2 size={18} /> Elimina ({selectedDates.length})
                        </button>
                    )}
                </div>
            </div>

            <div className="history-list">
                {days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const record = records.find(r => r.work_date === dateStr);
                    const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

                    return (
                        <div
                            key={day.toISOString()}
                            className={`history-day${selectedDates.includes(dateStr) ? ' selected' : ''}`}
                            style={isToday ? { borderLeft: '4px solid var(--md-primary)' } : {}}
                            onClick={() => onDateSelect(day)}
                        >
                            <div
                                className="history-day-select"
                                onClick={(e) => toggleSelect(dateStr, e)}
                            >
                                {selectedDates.includes(dateStr)
                                    ? <CheckCircle size={20} color="var(--md-primary)" />
                                    : <Circle size={20} color="var(--md-outline)" />
                                }
                            </div>
                            <div className={`history-day-badge ${record ? 'has-record' : 'no-record'}`}>
                                <span className="history-day-badge-abbr">{format(day, 'EEE', { locale: it })}</span>
                                <span className="history-day-badge-num">{format(day, 'd')}</span>
                            </div>
                            <div className="history-day-info">
                                <div className="history-day-hours">
                                    {record
                                        ? record.is_vacation
                                            ? 'FERIE (8:00)'
                                            : `${record.morning_enter || '--:--'} → ${record.afternoon_exit || '--:--'}`
                                        : 'Nessun record'
                                    }
                                </div>
                                <div className="history-day-name">{format(day, 'EEEE', { locale: it })}</div>
                            </div>
                            {record?.notes && (
                                <div className="history-day-note">{record.notes}</div>
                            )}
                        </div>
                    );
                })}
            </div>

            {showMonthClose && (
                <MonthClose
                    userId={userId}
                    month={currentMonth}
                    onClose={() => setShowMonthClose(false)}
                />
            )}
        </div>
    );
};
