"use client";

import Link from "next/link";
import { CampaignDetailReport } from "@/components/campaigns/campaign-detail-report";
import { useCampaigns } from "@/components/campaigns/campaigns-provider";
import { Card } from "@/components/ui/card";

export function CampaignDetailPageClient({ slug }: { slug: string }) {
  const { hydrated, getCampaignBySlug } = useCampaigns();
  const campaign = getCampaignBySlug(slug);

  if (!campaign && !hydrated) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted">Loading campaign report...</p>
      </Card>
    );
  }

  if (!campaign) {
    return (
      <Card className="p-6">
        <h2 className="text-2xl font-bold tracking-tight">Campaign Not Found</h2>
        <p className="mt-2 text-sm text-muted">
          The requested campaign was not found in local mock state.
        </p>
        <Link
          href="/marketing/ongoing-campaigns"
          className="mt-4 inline-flex rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          Back to Ongoing Campaigns
        </Link>
      </Card>
    );
  }

  return <CampaignDetailReport campaign={campaign} />;
}
