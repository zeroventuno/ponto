import { useState, useEffect } from 'react';
import { useAttendance, type DailyRecord } from '../hooks/useAttendance';
import { Save, History, Calendar, ChevronLeft, ChevronRight, Clock, Sun, Moon, X } from 'lucide-react';
import {
    format,
    addDays,
    startOfWeek,
    isSameDay,
    startOfMonth,
    eachDayOfInterval,
    isSameMonth,
    addMonths,
    subMonths,
    isToday as isDateToday
} from 'date-fns';
import { it } from 'date-fns/locale';

interface DashboardProps {
    userId: string;
    onViewHistory: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ userId, onViewHistory }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMonth, setViewMonth] = useState(new Date());
    const { currentRecord, loading, fetchRecordForDate, saveRecord, calculateStats, formatDecimalToTime } = useAttendance(userId);
    const [localRecord, setLocalRecord] = useState<DailyRecord | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchRecordForDate(selectedDate);
    }, [selectedDate, userId]);

    useEffect(() => {
        if (currentRecord) {
            setLocalRecord(currentRecord);
        }
    }, [currentRecord]);

    const handleSave = async () => {
        if (!localRecord) return;
        setIsSaving(true);
        await saveRecord(localRecord);
        setIsSaving(false);
    };

    const stats = calculateStats(localRecord);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
        return addDays(start, i);
    });

    const monthStart = startOfMonth(viewMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const monthDays = eachDayOfInterval({
        start: calendarStart,
        end: addDays(calendarStart, 41)
    });

    if (loading && !localRecord) {
        return (
            <div className="loading-container">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="page-container" style={{ paddingTop: 8 }}>
            {/* Calendar Card */}
            <div className="m3-card">
                <div className="cal-header">
                    <span className="cal-title">
                        {format(viewMonth, 'MMMM yyyy', { locale: it })}
                    </span>
                    <div className="cal-nav">
                        <button className="cal-nav-btn" onClick={() => setViewMonth(subMonths(viewMonth, 1))}>
                            <ChevronLeft size={20} />
                        </button>
                        <button className="cal-nav-btn" onClick={() => setViewMonth(addMonths(viewMonth, 1))}>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="cal-grid">
                    {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => (
                        <span key={`wk-${i}`} className="cal-weekday">{d}</span>
                    ))}
                    {monthDays.map((day) => {
                        const isSelected = isSameDay(day, selectedDate);
                        const isCurrentMonth = isSameMonth(day, viewMonth);
                        const isToday = isDateToday(day);
                        return (
                            <div key={day.toISOString()} className="cal-day-cell">
                                <button
                                    onClick={() => {
                                        setSelectedDate(day);
                                        if (!isSameMonth(day, viewMonth)) setViewMonth(startOfMonth(day));
                                    }}
                                    className={`cal-day${isSelected ? ' selected' : ''}${isToday && !isSelected ? ' today' : ''}${!isCurrentMonth ? ' other-month' : ''}`}
                                >
                                    {format(day, 'd')}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Week Strip */}
                <div className="week-strip">
                    {weekDays.map((day) => {
                        const isSelected = isSameDay(day, selectedDate);
                        return (
                            <button
                                key={day.toISOString()}
                                onClick={() => setSelectedDate(day)}
                                className={`week-chip${isSelected ? ' active' : ''}`}
                            >
                                <span className="week-chip-day">{format(day, 'EEE', { locale: it })}</span>
                                <span className="week-chip-num">{format(day, 'd')}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Date Header */}
            <div className="date-header">
                <div>
                    <div className="date-title">
                        {format(selectedDate, 'EEEE d MMMM', { locale: it })}
                    </div>
                    <div className="date-subtitle">
                        <Clock size={14} /> Diario di Lavoro
                    </div>
                </div>
                <button
                    className="today-btn"
                    onClick={() => {
                        const today = new Date();
                        setSelectedDate(today);
                        setViewMonth(today);
                    }}
                    title="Oggi"
                >
                    <Calendar size={20} />
                </button>
            </div>

            {/* Shift Input Grid */}
            <div className="shifts-grid">
                <div className="shift-card">
                    <div className="shift-card-header">
                        <Sun size={16} />
                        <span className="shift-card-title">Mattina</span>
                    </div>
                    <div className="shift-field">
                        <label className="shift-label">Entrata</label>
                        <input
                            type="text"
                            className="shift-input"
                            placeholder="00:00"
                            maxLength={5}
                            value={localRecord?.morning_enter || ''}
                            onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, '');
                                if (val.length >= 2) val = val.slice(0, 2) + ':' + val.slice(2, 4);
                                setLocalRecord(prev => prev ? { ...prev, morning_enter: val } : null);
                            }}
                        />
                    </div>
                    <div className="shift-field">
                        <label className="shift-label">Uscita</label>
                        <input
                            type="text"
                            className="shift-input"
                            placeholder="00:00"
                            maxLength={5}
                            value={localRecord?.morning_exit || ''}
                            onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, '');
                                if (val.length >= 2) val = val.slice(0, 2) + ':' + val.slice(2, 4);
                                setLocalRecord(prev => prev ? { ...prev, morning_exit: val } : null);
                            }}
                        />
                    </div>
                </div>

                <div className="shift-card">
                    <div className="shift-card-header">
                        <Moon size={16} />
                        <span className="shift-card-title">Pomeriggio</span>
                    </div>
                    <div className="shift-field">
                        <label className="shift-label">Entrata</label>
                        <input
                            type="text"
                            className="shift-input"
                            placeholder="00:00"
                            maxLength={5}
                            value={localRecord?.afternoon_enter || ''}
                            onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, '');
                                if (val.length >= 2) val = val.slice(0, 2) + ':' + val.slice(2, 4);
                                setLocalRecord(prev => prev ? { ...prev, afternoon_enter: val } : null);
                            }}
                        />
                    </div>
                    <div className="shift-field">
                        <label className="shift-label">Uscita</label>
                        <input
                            type="text"
                            className="shift-input"
                            placeholder="00:00"
                            maxLength={5}
                            value={localRecord?.afternoon_exit || ''}
                            onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, '');
                                if (val.length >= 2) val = val.slice(0, 2) + ':' + val.slice(2, 4);
                                setLocalRecord(prev => prev ? { ...prev, afternoon_exit: val } : null);
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Notes */}
            <div className="notes-card">
                <div className="notes-title">Note del Giorno</div>
                <textarea
                    className="notes-textarea"
                    value={localRecord?.notes || ''}
                    onChange={(e) => setLocalRecord(prev => prev ? { ...prev, notes: e.target.value } : null)}
                    placeholder="Scrivi qualcosa..."
                />
            </div>

            {/* Summary */}
            <div className="summary-card">
                <div className="summary-header">
                    {stats.ferie > 0 && (
                        <span className="summary-badge">Ferie</span>
                    )}
                </div>
                <div className="summary-grid">
                    <div className="summary-stat">
                        <div className="summary-stat-label">Totali</div>
                        <div className="summary-stat-value stat-total">{formatDecimalToTime(stats.total)}</div>
                    </div>
                    <div className="summary-stat">
                        <div className="summary-stat-label">Extra</div>
                        <div className="summary-stat-value stat-extra">+{formatDecimalToTime(stats.extraordinary)}</div>
                    </div>
                    <div className="summary-stat">
                        <div className="summary-stat-label">Permessi</div>
                        <div className="summary-stat-value stat-leave">{formatDecimalToTime(stats.permesso)}</div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="action-section">
                <button className="save-btn" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Salvataggio...' : <><Save size={22} /> Salva Registro</>}
                </button>
                {stats.total === 0 && !localRecord?.is_vacation && (
                    <button
                        className="secondary-btn"
                        onClick={() => setLocalRecord(prev => prev ? { ...prev, is_vacation: true } : null)}
                        style={{ color: 'var(--md-success)' }}
                    >
                        <Calendar size={18} /> Segna Ferie
                    </button>
                )}
                {localRecord?.is_vacation && (
                    <button
                        className="secondary-btn"
                        onClick={() => setLocalRecord(prev => prev ? { ...prev, is_vacation: false } : null)}
                        style={{ color: 'var(--md-error)' }}
                    >
                        <X size={18} /> Rimuovi Ferie
                    </button>
                )}
                <button className="secondary-btn" onClick={onViewHistory}>
                    <History size={18} /> Visualizza Storico
                </button>
            </div>
        </div>
    );
};
