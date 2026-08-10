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
import { API_URL, logoutSession, refreshSession, type CurrentUser } from "./api";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: CurrentUser | null;
  accessToken: string | null;
  /** Restores the session from the httpOnly refresh cookie. Concurrent calls share one in-flight request instead of racing the token-rotation endpoint. */
  restoreSession: () => Promise<boolean>;
  logout: () => Promise<void>;
  /** Authenticated fetch to the API: attaches the access token and, on a 401, retries once after a session restore (the access token may have simply expired). */
  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
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
  // Mirrors accessToken for authFetch: reading state directly would risk
  // an authFetch call closed over a stale token from before a restore.
  const accessTokenRef = useRef<string | null>(null);

  const restoreSession = useCallback(() => {
    if (inFlight.current) return inFlight.current;

    const promise = refreshSession()
      .then((result) => {
        if (result) {
          setUser(result.user);
          setAccessToken(result.accessToken);
          accessTokenRef.current = result.accessToken;
          setStatus("authenticated");
          return true;
        }
        setUser(null);
        setAccessToken(null);
        accessTokenRef.current = null;
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
    accessTokenRef.current = null;
    setStatus("unauthenticated");
  }, []);

  const authFetch = useCallback(
    async (path: string, init: RequestInit = {}): Promise<Response> => {
      const run = (token: string | null) =>
        fetch(`${API_URL}${path}`, {
          ...init,
          headers: {
            ...(init.body ? { "Content-Type": "application/json" } : {}),
            ...init.headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

      const res = await run(accessTokenRef.current);
      if (res.status !== 401) return res;

      const restored = await restoreSession();
      return restored ? run(accessTokenRef.current) : res;
    },
    [restoreSession],
  );

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  return (
    <AuthContext.Provider
      value={{ status, user, accessToken, restoreSession, logout, authFetch }}
    >
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
