import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppRole = 'ADMIN' | 'SUPER_ADMIN' | 'STORE_OWNER' | 'STAFF' | 'PLAYER';

export interface AppUser {
    id: string;
    email: string;
    fullName?: string;
    role: AppRole;
    organizationId?: string;
    organizationName?: string;
    orgIsActive?: boolean;
    orgCreatedAt?: string;
    branchId?: string;
    allowedPaymentMethods?: string[];
}

interface AuthContextType {
    session: Session | null;
    user: User | null;           // raw Supabase user
    appUser: AppUser | null;     // enriched DB profile
    role: AppRole | null;        // convenience shortcut
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    appUser: null,
    role: null,
    loading: true,
    signOut: async () => { },
    refreshProfile: async () => { },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchProfile(accessToken: string): Promise<AppUser | null> {
    try {
        const res = await fetch(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    const loadProfile = useCallback(async (sess: Session | null) => {
        if (!sess) {
            setAppUser(null);
            return;
        }
        const profile = await fetchProfile(sess.access_token);
        if (profile) {
            setAppUser(profile);
        } else {
            // Fallback: use Supabase metadata if backend unreachable
            const meta = sess.user.user_metadata;
            setAppUser({
                id: sess.user.id,
                email: sess.user.email ?? '',
                fullName: meta?.full_name,
                role: (meta?.role as AppRole) ?? 'PLAYER',
            });
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        const { data: { session: current } } = await supabase.auth.getSession();
        await loadProfile(current);
    }, [loadProfile]);

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session: sess } }) => {
            setSession(sess);
            setUser(sess?.user ?? null);
            await loadProfile(sess);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, sess) => {
                setSession(sess);
                setUser(sess?.user ?? null);
                await loadProfile(sess);
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, [loadProfile]);

    const signOut = async () => {
        await supabase.auth.signOut();
        setAppUser(null);
    };

    return (
        <AuthContext.Provider value={{
            session,
            user,
            appUser,
            role: appUser?.role ?? null,
            loading,
            signOut,
            refreshProfile,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
