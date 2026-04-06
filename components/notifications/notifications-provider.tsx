"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useDemoUser } from "@/components/demo/demo-user-provider";
import { findWorkspaceUserByUsername } from "@/lib/mock-users";

export type NotificationSource = "Review" | "Social Review" | "Campaign" | "System";

export type WorkspaceNotification = {
  id: string;
  title: string;
  source: NotificationSource;
  message: string;
  timestamp: string;
  href: string;
  recipient?: string;
  unread: boolean;
};

type CreateNotificationInput = {
  title: string;
  source: NotificationSource;
  message: string;
  href: string;
  timestamp?: string;
  recipient?: string;
};

type NotificationsContextValue = {
  notifications: WorkspaceNotification[];
  unreadCount: number;
  addNotification: (input: CreateNotificationInput) => WorkspaceNotification;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);
const STORAGE_KEY_PREFIX = "workspace-notifications";

function createNotificationId() {
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const seedNotifications: WorkspaceNotification[] = [
  {
    id: "seed-campaign-1",
    title: "Campaign updated",
    source: "Campaign",
    message: "Spring push timeline was adjusted.",
    timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    href: "/marketing/ongoing-campaigns",
    unread: false,
  },
  {
    id: "seed-social-1",
    title: "Social review reminder",
    source: "Social Review",
    message: "Two posts are waiting in the social review queue.",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    href: "/marketing/social-review",
    unread: true,
  },
];

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { demoMode, currentUser } = useDemoUser();
  const activeUserKey = demoMode ? currentUser?.id ?? "unselected" : "auth";
  const storageKey = `${STORAGE_KEY_PREFIX}:${activeUserKey}`;
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (activeUserKey === "unselected") {
      setNotifications([]);
      setHydrated(false);
      return;
    }

    try {
      const saved = window.localStorage.getItem(storageKey);

      if (saved) {
        const parsed = JSON.parse(saved) as WorkspaceNotification[];
        setNotifications(parsed);
      } else {
        setNotifications(seedNotifications);
      }
    } catch {
      setNotifications(seedNotifications);
    } finally {
      setHydrated(true);
    }
  }, [activeUserKey, storageKey]);

  useEffect(() => {
    if (!hydrated || activeUserKey === "unselected") {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(notifications));
  }, [activeUserKey, hydrated, notifications, storageKey]);

  const addNotification = useCallback((input: CreateNotificationInput) => {
    if (activeUserKey === "unselected") {
      throw new Error("Cannot add notifications without an active workspace user.");
    }

    const recipientUser =
      demoMode && input.recipient
        ? findWorkspaceUserByUsername(input.recipient, currentUser?.teamId)
        : null;
    const targetUserKey = recipientUser?.id ?? activeUserKey;
    const targetStorageKey = `${STORAGE_KEY_PREFIX}:${targetUserKey}`;

    const created: WorkspaceNotification = {
      id: createNotificationId(),
      title: input.title,
      source: input.source,
      message: input.message,
      href: input.href,
      timestamp: input.timestamp ?? new Date().toISOString(),
      recipient: input.recipient,
      unread: true,
    };

    if (demoMode) {
      const existing = window.localStorage.getItem(targetStorageKey);
      const parsedExisting = existing ? (JSON.parse(existing) as WorkspaceNotification[]) : [];
      const nextForTarget = [created, ...parsedExisting];
      window.localStorage.setItem(targetStorageKey, JSON.stringify(nextForTarget));

      if (targetUserKey === activeUserKey) {
        setNotifications(nextForTarget);
      }

      return created;
    }

    setNotifications((previous) => [created, ...previous]);
    return created;
  }, [activeUserKey, currentUser?.teamId, demoMode]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((previous) =>
      previous.map((item) => (item.id === id ? { ...item, unread: false } : item)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((previous) => previous.map((item) => ({ ...item, unread: false })));
  }, []);

  const value = useMemo<NotificationsContextValue>(() => {
    const unreadCount = notifications.filter((item) => item.unread).length;

    return {
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
    };
  }, [addNotification, markAllAsRead, markAsRead, notifications]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider.");
  }

  return context;
}
