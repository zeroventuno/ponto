import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface Profile {
    id: string;
    full_name: string | null;
    role: 'user' | 'admin';
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (!error && data) {
            setProfile(data as Profile);
        } else {
            setProfile(null);
        }
    };

    useEffect(() => {
        // Quick session check resolves immediately
        supabase.auth.getSession().then(({ data: { session } }) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            setLoading(false); // Make app render fast

            if (currentUser) {
                fetchProfile(currentUser.id);
            }
        }).catch(() => {
            setLoading(false);
        });

        // Listen for Auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            setLoading(false);

            if (currentUser) {
                fetchProfile(currentUser.id);
            } else {
                setProfile(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return { user, profile, loading, fetchProfile };
}
