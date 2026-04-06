import type { ComponentType } from "react";
import {
  Download,
  FileDown,
  FilePenLine,
  Link2,
  QrCode,
  Share2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CampaignRecord } from "@/lib/campaign-flow";

function clampHeight(value: number, max: number) {
  return Math.max(12, Math.round((value / max) * 100));
}

function statusBadgeClass(status: string) {
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

function healthSnapshot(status: string) {
  if (status === "On Track") {
    return "Execution is stable with strong channel alignment.";
  }

  if (status === "Monitoring") {
    return "Watching channel mix and pacing for optimization opportunities.";
  }

  if (status === "Draft") {
    return "Campaign is in draft mode. Performance tracking starts after launch.";
  }

  return "Performance needs intervention on key assets and channel strategy.";
}

function progressPercent(current: number, target: number) {
  if (target <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((current / target) * 100));
}

export function CampaignDetailReport({
  campaign,
}: {
  campaign: CampaignRecord;
}) {
  const maxPerformanceValue = Math.max(
    ...campaign.performanceGraph.flatMap((entry) => [
      entry.urlClicks,
      entry.qrScans,
      entry.impressions,
      entry.engagements,
    ]),
  );

  const goalPercent = progressPercent(
    campaign.goalsProgress.current,
    campaign.goalsProgress.target,
  );

  return (
    <div className="space-y-6">
      <Card className="p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Campaign Detail
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">{campaign.title}</h2>
            <p className="mt-2 text-sm text-muted">{campaign.objective}</p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2.5 py-1">
                {campaign.dateRange}
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2.5 py-1">
                {campaign.ownerTeam}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 font-semibold ${statusBadgeClass(campaign.status)}`}
              >
                {campaign.status}
              </span>
            </div>
          </div>

          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2 lg:grid-cols-3">
            <HeaderAction icon={FilePenLine} label="Edit Campaign" />
            <HeaderAction icon={FileDown} label="Export Report" />
            <HeaderAction icon={Link2} label="Add URL" />
            <HeaderAction icon={QrCode} label="Add QR" />
            <HeaderAction icon={Share2} label="Add Social Report" />
          </div>
        </div>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiTile label="Impressions" value={campaign.kpis.impressions} />
        <KpiTile label="URL Clicks" value={campaign.kpis.urlClicks} />
        <KpiTile label="QR Scans" value={campaign.kpis.qrScans} />
        <KpiTile label="Engagements" value={campaign.kpis.engagements} />
        <KpiTile
          label="Goal Completion"
          value={`${campaign.kpis.goalCompletion}%`}
          subValue={`${campaign.kpis.conversions.toLocaleString()} conversions`}
        />
      </section>

      <Card className="p-5 lg:p-6">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-[var(--color-accent)]" />
          <h3 className="text-lg font-semibold">Campaign Performance Overview</h3>
        </div>
        <p className="mt-1 text-sm text-muted">
          Combined trend view of URL Clicks, QR Scans, Impressions, and Engagements.
        </p>

        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-6 gap-3">
              {campaign.performanceGraph.map((point) => (
                <div
                  key={point.label}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3"
                >
                  <p className="text-center text-xs font-semibold text-muted">{point.label}</p>
                  <div className="mt-3 flex h-28 items-end justify-center gap-1.5">
                    <Bar
                      colorClass="bg-[var(--color-accent)]"
                      value={point.urlClicks}
                      max={maxPerformanceValue}
                      label={`URL Clicks: ${point.urlClicks.toLocaleString()}`}
                    />
                    <Bar
                      colorClass="bg-sky-500"
                      value={point.qrScans}
                      max={maxPerformanceValue}
                      label={`QR Scans: ${point.qrScans.toLocaleString()}`}
                    />
                    <Bar
                      colorClass="bg-emerald-500"
                      value={point.impressions}
                      max={maxPerformanceValue}
                      label={`Impressions: ${point.impressions.toLocaleString()}`}
                    />
                    <Bar
                      colorClass="bg-amber-500"
                      value={point.engagements}
                      max={maxPerformanceValue}
                      label={`Engagements: ${point.engagements.toLocaleString()}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              <LegendDot colorClass="bg-[var(--color-accent)]" label="URL Clicks" />
              <LegendDot colorClass="bg-sky-500" label="QR Scans" />
              <LegendDot colorClass="bg-emerald-500" label="Impressions" />
              <LegendDot colorClass="bg-amber-500" label="Engagements" />
            </div>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Campaign Health (Beta)
          </p>
          <div className="mt-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(campaign.status)}`}
            >
              {campaign.status}
            </span>
            <p className="mt-2 text-sm text-muted">{healthSnapshot(campaign.status)}</p>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Top Performing Asset
          </p>
          <p className="mt-2 text-sm font-semibold">{campaign.topPerformingAsset}</p>
          <p className="mt-1 text-xs text-muted">
            Strongest combined impact across traffic and engagement.
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Goal Progress
          </p>
          <p className="mt-2 text-sm font-semibold">{campaign.goalsProgress.goal}</p>
          <p className="mt-1 text-xs text-muted">
            {campaign.goalsProgress.current.toLocaleString()} /{" "}
            {campaign.goalsProgress.target.toLocaleString()} {campaign.goalsProgress.unit}
          </p>
          <div className="mt-3 h-2.5 rounded-full bg-[var(--color-surface-muted)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent)]"
              style={{ width: `${goalPercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs font-semibold text-[var(--color-accent)]">
            {goalPercent}% complete
          </p>
        </Card>
      </section>

      <Card className="p-5 lg:p-6">
        <h3 className="text-lg font-semibold">URL Links Report</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-muted">
                <th className="pb-2 font-semibold">Link Name</th>
                <th className="pb-2 font-semibold">Destination URL</th>
                <th className="pb-2 font-semibold">Short URL / Slug</th>
                <th className="pb-2 font-semibold">Platform / Source</th>
                <th className="pb-2 font-semibold">Clicks</th>
                <th className="pb-2 font-semibold">CTR</th>
                <th className="pb-2 font-semibold">Created Date</th>
                <th className="pb-2 font-semibold">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {campaign.urlLinksReport.map((item) => (
                <tr key={item.id} className="border-t border-[var(--color-border)]">
                  <td className="py-3 font-semibold">{item.linkName}</td>
                  <td className="py-3 text-muted">{item.destinationUrl}</td>
                  <td className="py-3 text-[var(--color-accent)]">{item.slug}</td>
                  <td className="py-3">{item.platformSource}</td>
                  <td className="py-3">{item.clicks.toLocaleString()}</td>
                  <td className="py-3">{item.ctr}</td>
                  <td className="py-3 text-muted">{item.createdDate}</td>
                  <td className="py-3 text-muted">{item.lastActivity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5 lg:p-6">
        <h3 className="text-lg font-semibold">QR Codes Report</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-muted">
                <th className="pb-2 font-semibold">QR Name</th>
                <th className="pb-2 font-semibold">Linked Destination</th>
                <th className="pb-2 font-semibold">Usage Type</th>
                <th className="pb-2 font-semibold">Total Scans</th>
                <th className="pb-2 font-semibold">Unique Scans</th>
                <th className="pb-2 font-semibold">Created Date</th>
                <th className="pb-2 font-semibold">Last Activity</th>
                <th className="pb-2 font-semibold">Download</th>
              </tr>
            </thead>
            <tbody>
              {campaign.qrCodesReport.map((item) => (
                <tr key={item.id} className="border-t border-[var(--color-border)]">
                  <td className="py-3 font-semibold">{item.qrName}</td>
                  <td className="py-3 text-muted">{item.linkedDestination}</td>
                  <td className="py-3 capitalize">{item.usageType}</td>
                  <td className="py-3">{item.totalScans.toLocaleString()}</td>
                  <td className="py-3">{item.uniqueScans.toLocaleString()}</td>
                  <td className="py-3 text-muted">{item.createdDate}</td>
                  <td className="py-3 text-muted">{item.lastActivity}</td>
                  <td className="py-3">
                    <Button variant="secondary" className="gap-1.5 px-2.5 py-1.5 text-xs">
                      <Download size={12} />
                      Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5 lg:p-6">
        <h3 className="text-lg font-semibold">Social Review</h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {campaign.socialPlatformSummary.map((platform) => (
            <div
              key={platform.platform}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                {platform.platform}
              </p>
              <p className="mt-1 text-lg font-bold">{platform.impressions.toLocaleString()}</p>
              <p className="text-xs text-muted">Impressions</p>
              <p className="mt-1 text-xs text-muted">
                Clicks: {platform.clicks.toLocaleString()} | ER: {platform.engagementRate}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-muted">
                <th className="pb-2 font-semibold">Platform</th>
                <th className="pb-2 font-semibold">Post/Asset Name</th>
                <th className="pb-2 font-semibold">Date</th>
                <th className="pb-2 font-semibold">Impressions</th>
                <th className="pb-2 font-semibold">Reach</th>
                <th className="pb-2 font-semibold">Clicks</th>
                <th className="pb-2 font-semibold">Likes</th>
                <th className="pb-2 font-semibold">Comments</th>
                <th className="pb-2 font-semibold">Shares</th>
                <th className="pb-2 font-semibold">Saves</th>
                <th className="pb-2 font-semibold">Engagement Rate</th>
              </tr>
            </thead>
            <tbody>
              {campaign.socialDetails.map((item) => (
                <tr key={item.id} className="border-t border-[var(--color-border)]">
                  <td className="py-3">{item.platform}</td>
                  <td className="py-3 font-semibold">{item.assetName}</td>
                  <td className="py-3 text-muted">{item.date}</td>
                  <td className="py-3">{item.impressions.toLocaleString()}</td>
                  <td className="py-3">{item.reach.toLocaleString()}</td>
                  <td className="py-3">{item.clicks.toLocaleString()}</td>
                  <td className="py-3">{item.likes.toLocaleString()}</td>
                  <td className="py-3">{item.comments.toLocaleString()}</td>
                  <td className="py-3">{item.shares.toLocaleString()}</td>
                  <td className="py-3">{item.saves.toLocaleString()}</td>
                  <td className="py-3 text-[var(--color-accent)]">{item.engagementRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
          <div className="mt-3 space-y-3">
            {campaign.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3"
              >
                <p className="text-sm font-semibold">{activity.title}</p>
                <p className="mt-1 text-xs text-muted">{activity.detail}</p>
                <p className="mt-1.5 text-[11px] font-medium text-[var(--color-accent)]">
                  {activity.time}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-semibold">Notes</h3>
          <div className="mt-3 space-y-2">
            {campaign.notes.map((note, index) => (
              <div
                key={`${campaign.slug}-note-${index + 1}`}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3"
              >
                <p className="text-sm text-[var(--color-text)]">{note}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

function HeaderAction({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ size?: number }>;
  label: string;
}) {
  return (
    <Button variant="secondary" className="justify-start gap-1.5 px-3 py-2 text-xs">
      <Icon size={14} />
      {label}
    </Button>
  );
}

function KpiTile({
  label,
  value,
  subValue,
}: {
  label: string;
  value: number | string;
  subValue?: string;
}) {
  const formattedValue =
    typeof value === "number" ? value.toLocaleString() : value;

  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{formattedValue}</p>
      {subValue ? <p className="mt-1 text-xs text-muted">{subValue}</p> : null}
    </Card>
  );
}

function LegendDot({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded ${colorClass}`} />
      {label}
    </span>
  );
}

function Bar({
  colorClass,
  value,
  max,
  label,
}: {
  colorClass: string;
  value: number;
  max: number;
  label: string;
}) {
  return (
    <div
      className={`w-2.5 rounded ${colorClass}`}
      style={{ height: `${clampHeight(value, max)}%` }}
      title={label}
    />
  );
}
