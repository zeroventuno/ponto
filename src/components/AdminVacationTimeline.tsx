import React, { useMemo, useState } from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, User } from 'lucide-react';

interface Vacation {
    id: string;
    user_id: string;
    start_date: string;
    end_date: string;
    status: string;
}

interface UserProfile {
    id: string;
    full_name: string | null;
}

interface AdminTimelineProps {
    users: UserProfile[];
    vacations: Vacation[];
}

export const AdminVacationTimeline: React.FC<AdminTimelineProps> = ({ users, vacations }) => {
    const [currentDate, setCurrentDate] = useState(new Date()); // Start with current month

    const daysInMonth = useMemo(() => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        return eachDayOfInterval({ start, end });
    }, [currentDate]);

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    // Filter to only approved vacations
    const approvedVacations = vacations.filter(v => v.status === 'approved');

    return (
        <div className="admin-timeline-container" style={{ overflowX: 'auto', background: 'var(--md-surface)', borderRadius: 16, border: '1px solid var(--md-outline-variant)' }}>

            <div style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--md-outline-variant)' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Piano Ferie</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button className="icon-btn" onClick={handlePrevMonth}><ChevronLeft size={20} /></button>
                    <span style={{ fontWeight: 600, minWidth: 120, textAlign: 'center', textTransform: 'capitalize' }}>
                        {format(currentDate, 'MMMM yyyy', { locale: it })}
                    </span>
                    <button className="icon-btn" onClick={handleNextMonth}><ChevronRight size={20} /></button>
                </div>
            </div>

            <div style={{ minWidth: 800 }}>
                {/* Header Row (Days) */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--md-outline-variant)', backgroundColor: 'var(--md-surface-variant)' }}>
                    <div style={{ width: 200, flexShrink: 0, borderRight: '1px solid var(--md-outline-variant)', padding: 12, fontWeight: 600, color: 'var(--md-on-surface-variant)', fontSize: 13 }}>
                        Dipendente
                    </div>
                    {daysInMonth.map((day, i) => (
                        <div key={i} style={{
                            flex: 1,
                            minWidth: 32,
                            textAlign: 'center',
                            padding: '8px 4px',
                            fontSize: 12,
                            borderRight: '1px solid var(--md-outline-variant)',
                            backgroundColor: (day.getDay() === 0 || day.getDay() === 6) ? 'var(--md-surface)' : 'transparent',
                            color: (day.getDay() === 0 || day.getDay() === 6) ? 'var(--md-error)' : 'inherit',
                        }}>
                            <div style={{ fontWeight: 700 }}>{format(day, 'd')}</div>
                            <div style={{ fontSize: 10, textTransform: 'uppercase' }}>{format(day, 'ee', { locale: it })}</div>
                        </div>
                    ))}
                </div>

                {/* Body Rows (Users) */}
                {users.map((user, i) => (
                    <div key={user.id} style={{ display: 'flex', borderBottom: i === users.length - 1 ? 'none' : '1px solid var(--md-outline-variant)' }}>
                        <div style={{
                            width: 200,
                            flexShrink: 0,
                            borderRight: '1px solid var(--md-outline-variant)',
                            padding: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            fontSize: 14,
                            fontWeight: 500
                        }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold' }}>
                                {user.full_name?.[0]?.toUpperCase() || <User size={14} />}
                            </div>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user.full_name || 'Utente'}
                            </span>
                        </div>

                        {/* Vacation Cells */}
                        {daysInMonth.map((day, j) => {
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                            // Check if this user is on vacation on this day
                            const userVacations = approvedVacations.filter(v => v.user_id === user.id);
                            const onVacation = userVacations.find(v => {
                                const start = new Date(v.start_date);
                                start.setHours(0, 0, 0, 0);
                                const end = new Date(v.end_date);
                                end.setHours(23, 59, 59, 999);
                                return day >= start && day <= end;
                            });

                            let isStart = false;
                            let isEnd = false;

                            if (onVacation) {
                                isStart = isSameDay(day, new Date(onVacation.start_date));
                                isEnd = isSameDay(day, new Date(onVacation.end_date));
                            }

                            return (
                                <div key={j} style={{
                                    flex: 1,
                                    minWidth: 32,
                                    borderRight: '1px solid var(--md-outline-variant)',
                                    backgroundColor: isWeekend ? 'var(--md-surface-variant)' : 'transparent',
                                    position: 'relative',
                                    padding: '8px 0'
                                }}>
                                    {onVacation && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            left: isStart ? '10%' : '0',
                                            right: isEnd ? '10%' : '0',
                                            height: 24,
                                            backgroundColor: 'var(--md-primary)',
                                            borderRadius: isStart && isEnd ? 12 : isStart ? '12px 0 0 12px' : isEnd ? '0 12px 12px 0' : 0,
                                            opacity: 0.85,
                                            zIndex: 1
                                        }} title={`Ferie: ${format(new Date(onVacation.start_date), 'dd/MM/yy')} - ${format(new Date(onVacation.end_date), 'dd/MM/yy')}`}>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}

                {users.length === 0 && (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--md-on-surface-variant)' }}>
                        Nessun dipendente trovato
                    </div>
                )}
            </div>
        </div>
    );
};
