import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { setAuthToken } from "../api/client";
import { login as loginRequest, register as registerRequest } from "../api/auth";
import { getCurrentUser } from "../api/users";
import { AUTH_TOKEN_STORAGE_KEY } from "../constants/config";
import { deleteToken, getToken, setToken } from "../utils/tokenStorage";
import type { LoginPayload, RegisterPayload, User } from "../types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  justRegistered: boolean;
  signIn: (payload: LoginPayload) => Promise<void>;
  signUp: (payload: RegisterPayload) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (user: User) => void;
  clearJustRegistered: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [justRegistered, setJustRegistered] = useState(false);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession(): Promise<void> {
    const token = await getToken(AUTH_TOKEN_STORAGE_KEY);
    if (token) {
      setAuthToken(token);
      try {
        setUser(await getCurrentUser());
      } catch {
        await deleteToken(AUTH_TOKEN_STORAGE_KEY);
        setAuthToken(null);
      }
    }
    setIsLoading(false);
  }

  async function signIn(payload: LoginPayload): Promise<void> {
    const token = await loginRequest(payload);
    await setToken(AUTH_TOKEN_STORAGE_KEY, token.access_token);
    setAuthToken(token.access_token);
    setUser(await getCurrentUser());
  }

  async function signUp(payload: RegisterPayload): Promise<void> {
    await registerRequest(payload);
    await signIn({ email: payload.email, password: payload.password });
    setJustRegistered(true);
  }

  async function signOut(): Promise<void> {
    await deleteToken(AUTH_TOKEN_STORAGE_KEY);
    setAuthToken(null);
    setUser(null);
    setJustRegistered(false);
  }

  function updateUser(nextUser: User): void {
    setUser(nextUser);
  }

  function clearJustRegistered(): void {
    setJustRegistered(false);
  }

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, justRegistered, signIn, signUp, signOut, updateUser, clearJustRegistered }),
    [user, isLoading, justRegistered]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
