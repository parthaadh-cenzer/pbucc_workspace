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
  DEMO_MODE_TEAM_COOKIE_NAME,
} from "@/lib/demo-mode-constants";
import {
  findWorkspaceTeamById,
  findWorkspaceUserForTeam,
  listWorkspaceUsersForTeam,
  workspaceTeams,
  type WorkspaceTeam,
  type WorkspaceUser,
} from "@/lib/mock-users";

const DEMO_TEAM_STORAGE_KEY = "workspace-demo-team";
const DEMO_USER_STORAGE_KEY = "workspace-demo-user";
const DEMO_USER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type DemoUserContextValue = {
  demoMode: boolean;
  teams: WorkspaceTeam[];
  selectedTeam: WorkspaceTeam | null;
  availableUsers: WorkspaceUser[];
  currentUser: WorkspaceUser | null;
  setSelectedTeam: (teamId: string) => WorkspaceTeam | null;
  setCurrentUser: (userId: string) => WorkspaceUser | null;
  clearSelection: () => void;
};

const DemoUserContext = createContext<DemoUserContextValue | null>(null);

function persistDemoSelection(selection: {
  team: WorkspaceTeam | null;
  user: WorkspaceUser | null;
}) {
  if (typeof window === "undefined") {
    return;
  }

  if (!selection.team) {
    window.localStorage.removeItem(DEMO_TEAM_STORAGE_KEY);
    document.cookie = `${DEMO_MODE_TEAM_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  } else {
    window.localStorage.setItem(DEMO_TEAM_STORAGE_KEY, selection.team.id);
    document.cookie = `${DEMO_MODE_TEAM_COOKIE_NAME}=${encodeURIComponent(selection.team.id)}; path=/; max-age=${DEMO_USER_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  }

  if (!selection.user) {
    window.localStorage.removeItem(DEMO_USER_STORAGE_KEY);
    document.cookie = `${DEMO_MODE_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    return;
  }

  window.localStorage.setItem(DEMO_USER_STORAGE_KEY, selection.user.id);
  document.cookie = `${DEMO_MODE_COOKIE_NAME}=${encodeURIComponent(selection.user.id)}; path=/; max-age=${DEMO_USER_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function DemoUserProvider({
  children,
  demoMode,
  initialTeamId,
  initialUserId,
}: {
  children: ReactNode;
  demoMode: boolean;
  initialTeamId: string | null;
  initialUserId: string | null;
}) {
  const [selectedTeam, setSelectedTeamState] = useState<WorkspaceTeam | null>(() => {
    if (!demoMode || !initialTeamId) {
      return null;
    }

    return findWorkspaceTeamById(initialTeamId);
  });

  const [currentUser, setCurrentUserState] = useState<WorkspaceUser | null>(() => {
    if (!demoMode) {
      return null;
    }

    if (!initialTeamId || !initialUserId) {
      return null;
    }

    return findWorkspaceUserForTeam({
      teamId: initialTeamId,
      userId: initialUserId,
    });
  });

  const availableUsers = useMemo(
    () => (selectedTeam ? listWorkspaceUsersForTeam(selectedTeam.id) : []),
    [selectedTeam],
  );

  useEffect(() => {
    if (!demoMode) {
      setSelectedTeamState(null);
      setCurrentUserState(null);
      return;
    }

    const savedTeamId = window.localStorage.getItem(DEMO_TEAM_STORAGE_KEY);
    const savedUserId = window.localStorage.getItem(DEMO_USER_STORAGE_KEY);

    const nextTeam = savedTeamId
      ? findWorkspaceTeamById(savedTeamId)
      : initialTeamId
        ? findWorkspaceTeamById(initialTeamId)
        : null;

    setSelectedTeamState(nextTeam);

    if (!nextTeam) {
      setCurrentUserState(null);
      persistDemoSelection({ team: null, user: null });
      return;
    }

    if (savedUserId) {
      const savedUser = findWorkspaceUserForTeam({
        teamId: nextTeam.id,
        userId: savedUserId,
      });

      if (savedUser) {
        setCurrentUserState(savedUser);
        persistDemoSelection({ team: nextTeam, user: savedUser });
        return;
      }
    }

    if (initialUserId) {
      const initialUser = findWorkspaceUserForTeam({
        teamId: nextTeam.id,
        userId: initialUserId,
      });

      if (initialUser) {
        setCurrentUserState(initialUser);
        persistDemoSelection({ team: nextTeam, user: initialUser });
        return;
      }
    }

    setCurrentUserState(null);
    persistDemoSelection({ team: nextTeam, user: null });
  }, [demoMode, initialTeamId, initialUserId]);

  const setSelectedTeam = useCallback((teamId: string) => {
    if (!demoMode) {
      return null;
    }

    const team = findWorkspaceTeamById(teamId);

    if (!team) {
      return null;
    }

    setSelectedTeamState(team);
    setCurrentUserState((previousUser) => {
      const stillValid = previousUser?.teamId === team.id ? previousUser : null;
      persistDemoSelection({ team, user: stillValid });
      return stillValid;
    });

    return team;
  }, [demoMode]);

  const setCurrentUser = useCallback((userId: string) => {
    if (!demoMode || !selectedTeam) {
      return null;
    }

    const matched = findWorkspaceUserForTeam({
      teamId: selectedTeam.id,
      userId,
    });

    if (!matched) {
      return null;
    }

    setCurrentUserState(matched);
    persistDemoSelection({ team: selectedTeam, user: matched });
    return matched;
  }, [demoMode, selectedTeam]);

  const clearSelection = useCallback(() => {
    setSelectedTeamState(null);
    setCurrentUserState(null);
    persistDemoSelection({ team: null, user: null });
  }, []);

  const value = useMemo<DemoUserContextValue>(() => ({
    demoMode,
    teams: workspaceTeams,
    selectedTeam,
    availableUsers,
    currentUser,
    setSelectedTeam,
    setCurrentUser,
    clearSelection,
  }), [availableUsers, clearSelection, currentUser, demoMode, selectedTeam, setCurrentUser, setSelectedTeam]);

  return <DemoUserContext.Provider value={value}>{children}</DemoUserContext.Provider>;
}

export function useDemoUser() {
  const context = useContext(DemoUserContext);

  if (!context) {
    throw new Error("useDemoUser must be used within DemoUserProvider.");
  }

  return context;
}
