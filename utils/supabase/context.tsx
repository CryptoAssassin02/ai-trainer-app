"use client"

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SupabaseClient } from "@supabase/supabase-js";
import { createContext, useContext, useMemo, ReactNode } from "react";

const SupabaseContext = createContext<SupabaseClient | undefined>(undefined);

export function SupabaseProvider({ children }: { children: ReactNode }) {
    const supabase = useMemo(() => {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        
        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('[SUPABASE CONTEXT] Missing environment variables')
            throw new Error('Missing Supabase environment variables')
        }
        
        console.log('[SUPABASE CONTEXT] Initializing with:', {
            url: supabaseUrl,
            key: supabaseAnonKey.substring(0, 50) + '...',
            env: process.env.NODE_ENV
        })
        
        return createSupabaseClient(
            supabaseUrl,
            supabaseAnonKey,
            {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                }
            }
        );
    }, []);

    return (
        <SupabaseContext.Provider value={supabase}>
            {children}
        </SupabaseContext.Provider>
    );
}

// Hook to use the Supabase client
export function useSupabase() {
    const context = useContext(SupabaseContext);
    if (context === undefined) {
        throw new Error('useSupabase must be used within a SupabaseProvider');
    }
    return context;
}