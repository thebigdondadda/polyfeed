import type { Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "../lib/supabase";

function peekStoredSession(): Session | null {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith("sb-") || !key.includes("-auth-token")) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed: unknown = JSON.parse(raw);
      const row = parsed !== null && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
      const nested = row && (row.currentSession ?? row.session);
      const session = (nested !== null && typeof nested === "object" ? nested : parsed) as Session;
      if (session?.access_token && session.user) return session;
    }
  } catch {
    return null;
  }
  return null;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(() => peekStoredSession());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setSession(data.session);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, username?: string) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/#home`,
        data: username ? { username, display_name: username } : undefined,
      },
    });
    if (error) throw error;
    return data.session;
  };

  const signInWithGoogle = async () => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/#home` },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    configured: supabaseConfigured,
    loading,
    session,
    user: (session?.user ?? null) as User | null,
    signedIn: Boolean(session),
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  };
}
