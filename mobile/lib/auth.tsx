import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchMe, setApiAuth } from "./api";
import { allowDemoLogin, isSupabaseConfigured } from "./config";
import { supabase } from "./supabase";
import type { AppUser, Permission } from "./types";

const DEMO_KEY = "aeris_field_demo_user";

type AuthState = {
  loading: boolean;
  user: AppUser | null;
  permissions: Permission[];
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signInDemo: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  can: (permission: Permission) => boolean;
  demoEnabled: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

async function hydrateFromSession(): Promise<{
  user: AppUser;
  permissions: Permission[];
} | null> {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      setApiAuth({ kind: "bearer", accessToken: token });
      return fetchMe();
    }
  }

  if (allowDemoLogin) {
    const demoId = await AsyncStorage.getItem(DEMO_KEY);
    if (demoId) {
      setApiAuth({ kind: "demo", userId: demoId });
      return fetchMe();
    }
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AppUser | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const applyMe = useCallback((me: { user: AppUser; permissions: Permission[] }) => {
    setUser(me.user);
    setPermissions(me.permissions);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await hydrateFromSession();
        if (alive && me) applyMe(me);
      } catch {
        setApiAuth(null);
        await AsyncStorage.removeItem(DEMO_KEY);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    if (!supabase) return () => {
      alive = false;
    };

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.access_token) return;
      setApiAuth({ kind: "bearer", accessToken: session.access_token });
      try {
        const me = await fetchMe();
        if (alive) applyMe(me);
      } catch {
        // ignore transient refresh errors
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [applyMe]);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      if (!supabase || !isSupabaseConfigured) {
        throw new Error("Supabase is not configured for this build.");
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error || !data.session?.access_token) {
        throw new Error(error?.message ?? "Sign-in failed.");
      }
      await AsyncStorage.removeItem(DEMO_KEY);
      setApiAuth({ kind: "bearer", accessToken: data.session.access_token });
      applyMe(await fetchMe());
    },
    [applyMe],
  );

  const signInDemo = useCallback(
    async (userId: string) => {
      if (!allowDemoLogin) throw new Error("Demo login is disabled.");
      setApiAuth({ kind: "demo", userId });
      await AsyncStorage.setItem(DEMO_KEY, userId);
      applyMe(await fetchMe());
    },
    [applyMe],
  );

  const signOut = useCallback(async () => {
    setApiAuth(null);
    setUser(null);
    setPermissions([]);
    await AsyncStorage.removeItem(DEMO_KEY);
    if (supabase) await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      user,
      permissions,
      signInWithPassword,
      signInDemo,
      signOut,
      can: (permission) => permissions.includes(permission),
      demoEnabled: allowDemoLogin,
    }),
    [loading, user, permissions, signInWithPassword, signInDemo, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
