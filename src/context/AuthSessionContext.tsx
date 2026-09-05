"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

type AuthSessionContextValue = {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

type AuthSessionProviderProps = {
  children: ReactNode;
  initialIsAuthenticated: boolean;
  initialIsAdmin: boolean;
};

export function AuthSessionProvider({
  children,
  initialIsAuthenticated,
  initialIsAdmin,
}: AuthSessionProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated);
  const [isLoading, setIsLoading] = useState(!initialIsAuthenticated);

  useEffect(() => {
    setIsAuthenticated(initialIsAuthenticated);
    if (initialIsAuthenticated) {
      setIsLoading(false);
    }
  }, [initialIsAuthenticated]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function syncAuthState() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (session?.user) {
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) {
        return;
      }

      if (user) {
        setIsAuthenticated(true);
      } else if (!initialIsAuthenticated) {
        setIsAuthenticated(false);
      }

      setIsLoading(false);
    }

    void syncAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user));
      setIsLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [initialIsAuthenticated]);

  const value = useMemo(
    () => ({
      isAuthenticated,
      isAdmin: isAuthenticated && initialIsAdmin,
      isLoading,
    }),
    [initialIsAdmin, isAuthenticated, isLoading]
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionContextValue {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error("useAuthSession must be used within AuthSessionProvider");
  }

  return context;
}
