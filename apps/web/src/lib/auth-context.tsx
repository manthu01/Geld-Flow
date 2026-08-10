"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { logoutSession, refreshSession, type CurrentUser } from "./api";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: CurrentUser | null;
  accessToken: string | null;
  /** Restores the session from the httpOnly refresh cookie. Concurrent calls share one in-flight request instead of racing the token-rotation endpoint. */
  restoreSession: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Refresh tokens are single-use (rotated on every call). Two callers
  // racing the same request — e.g. React Strict Mode's double-invoked
  // mount effect — would otherwise send two concurrent refresh calls
  // against the same cookie, and only one can win. Sharing one in-flight
  // promise means every caller in that window gets the same outcome.
  const inFlight = useRef<Promise<boolean> | null>(null);

  const restoreSession = useCallback(() => {
    if (inFlight.current) return inFlight.current;

    const promise = refreshSession()
      .then((result) => {
        if (result) {
          setUser(result.user);
          setAccessToken(result.accessToken);
          setStatus("authenticated");
          return true;
        }
        setUser(null);
        setAccessToken(null);
        setStatus("unauthenticated");
        return false;
      })
      .finally(() => {
        inFlight.current = null;
      });

    inFlight.current = promise;
    return promise;
  }, []);

  const logout = useCallback(async () => {
    await logoutSession();
    setUser(null);
    setAccessToken(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  return (
    <AuthContext.Provider value={{ status, user, accessToken, restoreSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
