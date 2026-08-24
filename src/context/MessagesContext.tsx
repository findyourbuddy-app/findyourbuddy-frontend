import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { listMyMatches } from "../api/matches";
import { useAuth } from "./AuthContext";
import type { Match } from "../types";

interface MessagesContextValue {
  matches: Match[];
  isLoading: boolean;
  hasUnreadMessages: boolean;
  loadMatches: (silent?: boolean) => Promise<Match[]>;
  refreshUnread: () => Promise<void>;
  updateMatchLastMessage: (matchId: number, lastMessage: Match["last_message"]) => void;
  removeMatch: (matchId: number) => void;
}

const MessagesContext = createContext<MessagesContextValue | undefined>(undefined);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const updateUnreadState = useCallback(
    (matchList: Match[]) => {
      if (!user) {
        setHasUnreadMessages(false);
        return;
      }
      setHasUnreadMessages(
        matchList.some(
          (m) =>
            m.last_message &&
            !m.last_message.is_read &&
            m.last_message.sender_id !== user.id
        )
      );
    },
    [user]
  );

  const loadMatches = useCallback(
    async (silent = false): Promise<Match[]> => {
      if (!user) {
        setMatches([]);
        setHasUnreadMessages(false);
        return [];
      }
      if (!silent && matches.length === 0) {
        setIsLoading(true);
      }
      try {
        const fetched = await listMyMatches();
        setMatches(fetched);
        updateUnreadState(fetched);
        return fetched;
      } catch {
        return matches;
      } finally {
        setIsLoading(false);
      }
    },
    [user, matches, updateUnreadState]
  );

  const refreshUnread = useCallback(async (): Promise<void> => {
    await loadMatches(true);
  }, [loadMatches]);

  const updateMatchLastMessage = useCallback(
    (matchId: number, lastMessage: Match["last_message"]) => {
      setMatches((prev) => {
        const next = prev.map((m) => {
          if (m.id === matchId) {
            return { ...m, last_message: lastMessage };
          }
          return m;
        });
        updateUnreadState(next);
        return next;
      });
    },
    [updateUnreadState]
  );

  const removeMatch = useCallback(
    (matchId: number) => {
      setMatches((prev) => {
        const next = prev.filter((m) => m.id !== matchId);
        updateUnreadState(next);
        return next;
      });
    },
    [updateUnreadState]
  );

  useEffect(() => {
    if (user) {
      loadMatches(true);
    } else {
      setMatches([]);
      setHasUnreadMessages(false);
    }
  }, [user]);

  const value = useMemo<MessagesContextValue>(
    () => ({
      matches,
      isLoading,
      hasUnreadMessages,
      loadMatches,
      refreshUnread,
      updateMatchLastMessage,
      removeMatch,
    }),
    [
      matches,
      isLoading,
      hasUnreadMessages,
      loadMatches,
      refreshUnread,
      updateMatchLastMessage,
      removeMatch,
    ]
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
