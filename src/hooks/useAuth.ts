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
        // Safety timeout to prevent infinite loading
        const safetyTimer = setTimeout(() => {
            if (loading) {
                console.warn("Auth check timed out, forcing loading false");
                setLoading(false);
            }
        }, 5000);

        // Check active session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            try {
                if (currentUser) {
                    await fetchProfile(currentUser.id);
                } else {
                    setProfile(null);
                }
            } catch (err) {
                console.error("Initial session error:", err);
            } finally {
                setLoading(false);
                clearTimeout(safetyTimer);
            }
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            try {
                if (currentUser) {
                    await fetchProfile(currentUser.id);
                } else {
                    setProfile(null);
                }
            } catch (err) {
                console.error("Auth change error:", err);
            } finally {
                setLoading(false);
                clearTimeout(safetyTimer);
            }
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(safetyTimer);
        };
    }, []);

    return { user, profile, loading };
}
