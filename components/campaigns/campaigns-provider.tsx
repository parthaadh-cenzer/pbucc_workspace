"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useDemoUser } from "@/components/demo/demo-user-provider";
import {
  createCampaignRecord,
  hasDuplicateCampaignName,
  normalizeSeedCampaigns,
  type CampaignRecord,
  type CreateCampaignInput,
} from "@/lib/campaign-flow";
import { ongoingCampaigns } from "@/lib/mock-campaigns";

type CampaignsContextValue = {
  campaigns: CampaignRecord[];
  addCampaign: (input: CreateCampaignInput) => CampaignRecord;
  getCampaignBySlug: (slug: string) => CampaignRecord | undefined;
  hydrated: boolean;
};

const STORAGE_KEY_PREFIX = "marketing-created-campaigns";
const seedCampaignRecords = normalizeSeedCampaigns(ongoingCampaigns);

const CampaignsContext = createContext<CampaignsContextValue | undefined>(undefined);

export function CampaignsProvider({ children }: { children: ReactNode }) {
  const { demoMode, currentUser } = useDemoUser();
  const activeUserKey = demoMode ? currentUser?.id ?? "unselected" : "auth";
  const storageKey = `${STORAGE_KEY_PREFIX}:${activeUserKey}`;
  const [createdCampaigns, setCreatedCampaigns] = useState<CampaignRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (activeUserKey === "unselected") {
      setCreatedCampaigns([]);
      setHydrated(false);
      return;
    }

    try {
      const saved = window.localStorage.getItem(storageKey);

      if (saved) {
        const parsed = JSON.parse(saved) as CampaignRecord[];
        setCreatedCampaigns(parsed);
      }
    } catch {
      setCreatedCampaigns([]);
    } finally {
      setHydrated(true);
    }
  }, [activeUserKey, storageKey]);

  useEffect(() => {
    if (!hydrated || activeUserKey === "unselected") {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(createdCampaigns));
  }, [activeUserKey, createdCampaigns, hydrated, storageKey]);

  const campaigns = useMemo(
    () => [...createdCampaigns, ...seedCampaignRecords],
    [createdCampaigns],
  );

  const addCampaign = useCallback(
    (input: CreateCampaignInput) => {
      if (hasDuplicateCampaignName(input.campaignName, campaigns)) {
        throw new Error("A campaign with this name already exists.");
      }

      const created = createCampaignRecord(input, campaigns);
      setCreatedCampaigns((previous) => [created, ...previous]);
      return created;
    },
    [campaigns],
  );

  const getCampaignBySlug = useCallback(
    (slug: string) => campaigns.find((campaign) => campaign.slug === slug),
    [campaigns],
  );

  const contextValue = useMemo(
    () => ({ campaigns, addCampaign, getCampaignBySlug, hydrated }),
    [addCampaign, campaigns, getCampaignBySlug, hydrated],
  );

  return (
    <CampaignsContext.Provider value={contextValue}>
      {children}
    </CampaignsContext.Provider>
  );
}

export function useCampaigns() {
  const context = useContext(CampaignsContext);

  if (!context) {
    throw new Error("useCampaigns must be used within CampaignsProvider");
  }

  return context;
}
