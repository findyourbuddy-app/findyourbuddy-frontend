import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { setAuthToken } from "../api/client";
import { login as loginRequest, register as registerRequest } from "../api/auth";
import { getCurrentUser } from "../api/users";
import { registerDeviceToken, unregisterDeviceToken } from "../api/notifications";
import { getMySubscription } from "../api/subscriptions";
import { AUTH_TOKEN_STORAGE_KEY } from "../constants/config";
import { deleteToken, getToken, setToken } from "../utils/tokenStorage";
import { getExpoPushToken } from "../utils/pushNotifications";
import type { LoginPayload, RegisterPayload, SubscriptionStatus, User } from "../types";

async function fetchSubscription(): Promise<SubscriptionStatus> {
  try {
    return await getMySubscription();
  } catch {
    return { is_premium: false, expires_at: null };
  }
}

async function syncPushToken(): Promise<void> {
  try {
    const token = await getExpoPushToken();
    if (token) {
      await registerDeviceToken(token);
    }
  } catch {
    // Push registration is best-effort; auth flow must not fail because of it.
  }
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  justRegistered: boolean;
  isPremium: boolean;
  premiumExpiresAt: string | null;
  refreshSubscription: () => Promise<void>;
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
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    is_premium: false,
    expires_at: null,
  });

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession(): Promise<void> {
    const token = await getToken(AUTH_TOKEN_STORAGE_KEY);
    if (token) {
      setAuthToken(token);
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        setTimeout(() => {
          syncPushToken().catch(() => {});
          fetchSubscription().then((sub) => setSubscription(sub)).catch(() => {});
        }, 50);
      } catch {
        await deleteToken(AUTH_TOKEN_STORAGE_KEY);
        setAuthToken(null);
      }
    }
    setIsLoading(false);
  }

  async function signIn(payload: LoginPayload): Promise<void> {
    const token = await loginRequest(payload);
    setAuthToken(token.access_token);
    setToken(AUTH_TOKEN_STORAGE_KEY, token.access_token).catch(() => {});

    const currentUser = await getCurrentUser();
    setUser(currentUser);

    // Non-blocking background syncs so screen transition is instant
    setTimeout(() => {
      syncPushToken().catch(() => {});
      fetchSubscription().then((sub) => setSubscription(sub)).catch(() => {});
    }, 50);
  }

  async function refreshSubscription(): Promise<void> {
    setSubscription(await fetchSubscription());
  }

  async function signUp(payload: RegisterPayload): Promise<void> {
    await registerRequest(payload);
    await signIn({ email: payload.email, password: payload.password });
    setJustRegistered(true);
  }

  async function signOut(): Promise<void> {
    try {
      const token = await getExpoPushToken();
      if (token) {
        await unregisterDeviceToken(token);
      }
    } catch {
      // Best-effort cleanup; sign-out must proceed regardless.
    }
    await deleteToken(AUTH_TOKEN_STORAGE_KEY);
    setAuthToken(null);
    setUser(null);
    setJustRegistered(false);
    setSubscription({ is_premium: false, expires_at: null });
  }

  function updateUser(nextUser: User): void {
    setUser(nextUser);
  }

  function clearJustRegistered(): void {
    setJustRegistered(false);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      justRegistered,
      isPremium: subscription.is_premium,
      premiumExpiresAt: subscription.expires_at,
      refreshSubscription,
      signIn,
      signUp,
      signOut,
      updateUser,
      clearJustRegistered,
    }),
    [user, isLoading, justRegistered, subscription]
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
