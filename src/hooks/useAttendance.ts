import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

export interface DailyRecord {
    id?: string;
    work_date: string;
    morning_enter: string;
    morning_exit: string;
    afternoon_enter: string;
    afternoon_exit: string;
    notes: string;
}

export function useAttendance(userId: string | undefined) {
    const [currentRecord, setCurrentRecord] = useState<DailyRecord | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchRecordForDate = async (date: Date) => {
        if (!userId) return;
        setLoading(true);

        const dateStr = format(date, 'yyyy-MM-dd');

        const { data, error } = await supabase
            .from('daily_records')
            .select('*')
            .eq('user_id', userId)
            .eq('work_date', dateStr)
            .maybeSingle();

        if (!error) {
            setCurrentRecord(data || {
                work_date: dateStr,
                morning_enter: '',
                morning_exit: '',
                afternoon_enter: '',
                afternoon_exit: '',
                notes: ''
            });
        }
        setLoading(false);
    };

    const saveRecord = async (record: DailyRecord) => {
        if (!userId) return;

        const { error } = await supabase
            .from('daily_records')
            .upsert({
                ...record,
                user_id: userId
            }, {
                onConflict: 'user_id, work_date'
            });

        if (!error) {
            setCurrentRecord(record);
        }
        return { error };
    };

    const calculateStats = (record: DailyRecord | null) => {
        if (!record) return { total: 0, extraordinary: 0, permesso: 0, ferie: 0 };

        const parseTime = (time: string) => {
            if (!time) return null;
            const [hours, minutes] = time.split(':').map(Number);
            return hours + minutes / 60;
        };

        const mEnter = parseTime(record.morning_enter);
        const mExit = parseTime(record.morning_exit);
        const aEnter = parseTime(record.afternoon_enter);
        const aExit = parseTime(record.afternoon_exit);

        let morningHours = 0;
        if (mEnter !== null && mExit !== null) morningHours = Math.max(0, mExit - mEnter);

        let afternoonHours = 0;
        if (aEnter !== null && aExit !== null) afternoonHours = Math.max(0, aExit - aEnter);

        const total = morningHours + afternoonHours;

        let extraordinary = 0;
        let permesso = 0;
        let ferie = 0;

        if (total === 0) {
            ferie = 8;
        } else if (total > 8) {
            extraordinary = total - 8;
        } else if (total < 8) {
            permesso = 8 - total;
        }

        return { total, extraordinary, permesso, ferie };
    };

    return {
        currentRecord,
        loading,
        fetchRecordForDate,
        saveRecord,
        calculateStats
    };
}
