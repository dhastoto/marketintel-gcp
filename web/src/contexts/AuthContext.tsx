import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  full_name: string;
  business_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  plan: string;
  credits_remaining: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  isPasswordRecovery: false,
  clearPasswordRecovery: () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Detect recovery URL synchronously at module load — BEFORE Supabase client
// auto-exchanges the recovery code for a session. This is the most reliable
// way to know the user arrived via a password reset link.
const detectInitialRecovery = (): boolean => {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash || "";
  const search = window.location.search || "";
  return (
    hash.includes("type=recovery") ||
    search.includes("type=recovery") ||
    // PKCE recovery links arrive as ?code=...; if user lands on /reset-password
    // with a code param, treat as recovery.
    (search.includes("code=") && window.location.pathname.includes("reset-password"))
  );
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(detectInitialRecovery);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) setProfile(data as Profile);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const clearPasswordRecovery = () => setIsPasswordRecovery(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsPasswordRecovery(true);
        }
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsPasswordRecovery(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, isPasswordRecovery, clearPasswordRecovery, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
