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
import {
  DEMO_MODE_COOKIE_NAME,
} from "@/lib/demo-mode-constants";
import {
  findWorkspaceUserById,
  findWorkspaceUserByUsername,
  type WorkspaceUser,
} from "@/lib/mock-users";

const DEMO_USER_STORAGE_KEY = "workspace-demo-user";
const DEMO_USER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type DemoUserContextValue = {
  demoMode: boolean;
  currentUser: WorkspaceUser | null;
  setCurrentUserByUsername: (username: string) => WorkspaceUser | null;
  clearCurrentUser: () => void;
};

const DemoUserContext = createContext<DemoUserContextValue | null>(null);

function persistDemoUser(user: WorkspaceUser | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!user) {
    window.localStorage.removeItem(DEMO_USER_STORAGE_KEY);
    document.cookie = `${DEMO_MODE_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    return;
  }

  window.localStorage.setItem(DEMO_USER_STORAGE_KEY, user.id);
  document.cookie = `${DEMO_MODE_COOKIE_NAME}=${encodeURIComponent(user.id)}; path=/; max-age=${DEMO_USER_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function DemoUserProvider({
  children,
  demoMode,
  initialUserId,
}: {
  children: ReactNode;
  demoMode: boolean;
  initialUserId: string | null;
}) {
  const [currentUser, setCurrentUser] = useState<WorkspaceUser | null>(() => {
    if (!demoMode) {
      return null;
    }

    if (!initialUserId) {
      return null;
    }

    return findWorkspaceUserById(initialUserId);
  });

  useEffect(() => {
    if (!demoMode) {
      setCurrentUser(null);
      return;
    }

    const savedUserId = window.localStorage.getItem(DEMO_USER_STORAGE_KEY);

    if (savedUserId) {
      const savedUser = findWorkspaceUserById(savedUserId);

      if (savedUser) {
        setCurrentUser(savedUser);
        persistDemoUser(savedUser);
        return;
      }
    }

    if (initialUserId) {
      const initialUser = findWorkspaceUserById(initialUserId);

      if (initialUser) {
        setCurrentUser(initialUser);
        persistDemoUser(initialUser);
      }
    }
  }, [demoMode, initialUserId]);

  const setCurrentUserByUsername = useCallback((username: string) => {
    if (!demoMode) {
      return null;
    }

    const matched = findWorkspaceUserByUsername(username);

    if (!matched) {
      return null;
    }

    setCurrentUser(matched);
    persistDemoUser(matched);
    return matched;
  }, [demoMode]);

  const clearCurrentUser = useCallback(() => {
    setCurrentUser(null);
    persistDemoUser(null);
  }, []);

  const value = useMemo<DemoUserContextValue>(() => ({
    demoMode,
    currentUser,
    setCurrentUserByUsername,
    clearCurrentUser,
  }), [clearCurrentUser, currentUser, demoMode, setCurrentUserByUsername]);

  return <DemoUserContext.Provider value={value}>{children}</DemoUserContext.Provider>;
}

export function useDemoUser() {
  const context = useContext(DemoUserContext);

  if (!context) {
    throw new Error("useDemoUser must be used within DemoUserProvider.");
  }

  return context;
}
