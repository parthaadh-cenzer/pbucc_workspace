"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, PlusCircle } from "lucide-react";
import { useCampaigns } from "@/components/campaigns/campaigns-provider";
import { CreateCampaignWizard } from "@/components/campaigns/create-campaign-wizard";
import { Card } from "@/components/ui/card";
import type { CreateCampaignInput } from "@/lib/campaign-flow";

function statusStyles(status: string) {
  if (status === "On Track") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  }

  if (status === "Monitoring") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  }

  if (status === "Draft") {
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }

  return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
}

function performanceSnapshot(status: string) {
  if (status === "On Track") {
    return "Strong momentum this period";
  }

  if (status === "Monitoring") {
    return "Mixed performance signals";
  }

  if (status === "Draft") {
    return "No live data yet";
  }

  return "Needs optimization focus";
}

export function OngoingCampaignsSection({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const { campaigns, addCampaign } = useCampaigns();
  const [wizardOpen, setWizardOpen] = useState(false);

  const handleCreateCampaign = (input: CreateCampaignInput) => {
    const createdCampaign = addCampaign(input);
    setWizardOpen(false);
    router.push(`/marketing/ongoing-campaigns/${createdCampaign.slug}`);
  };

  return (
    <>
      <Card className="p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Ongoing Campaigns</h2>
            <p className="mt-1 text-sm text-muted">
              Track active campaign performance and open detailed reports.
            </p>
          </div>
          <Link
            href="/marketing/ongoing-campaigns"
            className="text-sm font-semibold text-[var(--color-accent)]"
          >
            View all
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.slug}
              href={`/marketing/ongoing-campaigns/${campaign.slug}`}
              className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--color-accent)]"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold leading-snug">{campaign.title}</h3>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.09em] ${statusStyles(campaign.status)}`}
                >
                  {campaign.status}
                </span>
              </div>

              <p className="mt-2 text-xs text-muted">{campaign.dateRange}</p>
              <p className="mt-2 text-xs text-muted">{campaign.objective}</p>

              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                {campaign.ownerTeam}
              </p>

              {!compact ? (
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-[var(--color-text)]">
                    Performance Snapshot
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-accent)]">
                    Open report
                    <ArrowRight size={14} />
                  </span>
                </div>
              ) : (
                <p className="mt-3 text-xs font-semibold text-[var(--color-accent)]">
                  Open report
                </p>
              )}

              {!compact ? (
                <p className="mt-1 text-xs text-muted">
                  {performanceSnapshot(campaign.status)}
                </p>
              ) : null}
            </Link>
          ))}

          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="group rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--color-accent)]"
          >
            <div className="flex h-full flex-col justify-between gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                <PlusCircle size={18} />
              </div>

              <div>
                <h3 className="text-base font-semibold">Create Campaign</h3>
                <p className="mt-1 text-xs text-muted">
                  Launch guided setup for a new campaign workspace.
                </p>
              </div>

              <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-accent)]">
                Open wizard
                <ArrowRight size={14} />
              </span>
            </div>
          </button>
        </div>
      </Card>

      <CreateCampaignWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreate={handleCreateCampaign}
        existingCampaignNames={campaigns.map((campaign) => campaign.name)}
      />
    </>
  );
}
