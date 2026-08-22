import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { listMyMatches } from "../api/matches";
import { useAuth } from "./AuthContext";

interface MessagesContextValue {
  hasUnreadMessages: boolean;
  refreshUnread: () => Promise<void>;
}

const MessagesContext = createContext<MessagesContextValue | undefined>(undefined);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const refreshUnread = useCallback(async (): Promise<void> => {
    if (!user) {
      setHasUnreadMessages(false);
      return;
    }
    try {
      const matches = await listMyMatches();
      setHasUnreadMessages(
        matches.some(
          (match) => match.last_message && !match.last_message.is_read && match.last_message.sender_id !== user.id
        )
      );
    } catch {
      // Best-effort; do not crash the app on network errors
    }
  }, [user]);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  const value = useMemo<MessagesContextValue>(
    () => ({ hasUnreadMessages, refreshUnread }),
    [hasUnreadMessages, refreshUnread]
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessagesContext(): MessagesContextValue {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error("useMessagesContext must be used within a MessagesProvider");
  }
  return context;
}
