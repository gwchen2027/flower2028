"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSupabaseConfig } from "@/lib/supabase-config-inject";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface MemberData {
  credits: number;
  membership_expires_at: string | null;
  is_member: boolean;
  days_left: number;
  role: string;
  total_letters: number;
}

interface AuthContextValue {
  supabase: SupabaseClient | null;
  user: { id: string; email: string | null } | null;
  member: MemberData | null;
  loading: boolean;
  refreshMember: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  supabase: null,
  user: null,
  member: null,
  loading: true,
  refreshMember: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoading: configLoading } = useSupabaseConfig();
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMember = useCallback(async (client: SupabaseClient) => {
    try {
      const { data: sessionData } = await client.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setMember(null);
        return;
      }
      const res = await fetch("/api/member/me", { headers: { "x-session": token } });
      if (res.ok) {
        const data = await res.json();
        setMember({
          credits: data.credits,
          membership_expires_at: data.membership_expires_at,
          is_member: data.is_member,
          days_left: data.days_left,
          role: data.role,
          total_letters: data.total_letters,
        });
      } else {
        setMember(null);
      }
    } catch {
      setMember(null);
    }
  }, []);

  useEffect(() => {
    if (configLoading) return;
    let client: SupabaseClient;
    try {
      client = getSupabaseBrowserClient();
    } catch {
      setLoading(false);
      return;
    }
    setSupabase(client);

    const init = async () => {
      const {
        data: { user: u },
      } = await client.auth.getUser();
      setUser(u ? { id: u.id, email: u.email ?? null } : null);
      if (u) await fetchMember(client);
      setLoading(false);
    };
    init();

    const { data: sub } = client.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user;
      setUser(u ? { id: u.id, email: u.email ?? null } : null);
      if (u) {
        await fetchMember(client);
      } else {
        setMember(null);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [configLoading, fetchMember]);

  const refreshMember = useCallback(async () => {
    if (!supabase) return;
    await fetchMember(supabase);
  }, [supabase, fetchMember]);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setMember(null);
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ supabase, user, member, loading, refreshMember, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
