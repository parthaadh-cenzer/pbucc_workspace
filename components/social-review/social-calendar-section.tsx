"use client";

import { useMemo, useState } from "react";
import {
  Briefcase,
  CalendarDays,
  CalendarRange,
  Clock3,
  Globe,
  Image as ImageIcon,
  Mail,
  MessageCircle,
  Plus,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CampaignRecord } from "@/lib/campaign-flow";
import {
  socialPlatforms,
  socialPostStatuses,
  type SocialPlatform,
  type SocialPostStatus,
  type SocialReviewPost,
} from "@/lib/mock-social-review";

type CalendarView = "Month" | "Week" | "Day";

type StatusFilter = "All" | SocialPostStatus;
type PlatformFilter = "All" | SocialPlatform;

type CalendarCellDay = {
  date: Date;
  dateKey: string;
  inCurrentMonth: boolean;
};

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const campaignPalette = [
  "#0ea5e9",
  "#f97316",
  "#22c55e",
  "#14b8a6",
  "#ec4899",
  "#f59e0b",
  "#6366f1",
  "#84cc16",
  "#ef4444",
  "#06b6d4",
];

const platformIconMap: Record<SocialPlatform, LucideIcon> = {
  Instagram: ImageIcon,
  Facebook: MessageCircle,
  LinkedIn: Briefcase,
  Email: Mail,
  Website: Globe,
};

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMondayStart(date: Date) {
  const clone = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = clone.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  clone.setDate(clone.getDate() + mondayOffset);
  return clone;
}

function buildMonthGrid(focusDate: Date) {
  const monthStart = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1);
  const monthEnd = new Date(focusDate.getFullYear(), focusDate.getMonth() + 1, 0);

  const gridStart = getMondayStart(monthStart);
  const gridEnd = getMondayStart(monthEnd);
  gridEnd.setDate(gridEnd.getDate() + 6);

  const cells: CalendarCellDay[] = [];
  const cursor = new Date(gridStart);

  while (cursor <= gridEnd) {
    cells.push({
      date: new Date(cursor),
      dateKey: formatDateKey(cursor),
      inCurrentMonth: cursor.getMonth() === focusDate.getMonth(),
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return cells;
}

function getWeekDays(focusDate: Date) {
  const weekStart = getMondayStart(focusDate);
  return weekdayLabels.map((label, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);

    return {
      label,
      date,
      dateKey: formatDateKey(date),
    };
  });
}

function statusStyles(status: SocialPostStatus) {
  if (status === "Draft") {
    return {
      badge: "bg-slate-100 text-slate-700",
      dot: "bg-slate-500",
    };
  }

  if (status === "Pending Review") {
    return {
      badge: "bg-amber-100 text-amber-700",
      dot: "bg-amber-500",
    };
  }

  if (status === "Changes Requested") {
    return {
      badge: "bg-red-100 text-red-700",
      dot: "bg-red-500",
    };
  }

  if (status === "Approved") {
    return {
      badge: "bg-emerald-100 text-emerald-700",
      dot: "bg-emerald-500",
    };
  }

  if (status === "Scheduled") {
    return {
      badge: "bg-sky-100 text-sky-700",
      dot: "bg-sky-500",
    };
  }

  return {
    badge: "bg-green-200 text-green-900",
    dot: "bg-green-800",
  };
}

function truncateCaption(value: string, length: number) {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, length).trim()}...`;
}

function CalendarPostDetailModal({
  post,
  campaigns,
  colorByCampaign,
  onClose,
}: {
  post: SocialReviewPost | null;
  campaigns: CampaignRecord[];
  colorByCampaign: Map<string, string>;
  onClose: () => void;
}) {
  if (!post) {
    return null;
  }

  const statusStyle = statusStyles(post.status);
  const campaignMap = new Map(campaigns.map((campaign) => [campaign.slug, campaign]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[var(--color-border)] p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
              Calendar Post
            </p>
            <h3 className="mt-1 text-xl font-bold">Post Details</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--color-border)] p-2 transition hover:bg-[var(--color-surface-muted)]"
            aria-label="Close post details"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-[1.2fr_1fr]">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
            <img
              src={post.imageUrl}
              alt="Calendar post preview"
              className="h-[420px] w-full rounded-lg object-contain"
            />
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Caption</p>
              <p className="mt-1 text-sm">{post.caption}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Linked Campaigns</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {post.campaignSlugs.map((slug) => (
                  <span
                    key={slug}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: `${colorByCampaign.get(slug) ?? "#6b7280"}22`,
                      color: colorByCampaign.get(slug) ?? "#374151",
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: colorByCampaign.get(slug) ?? "#6b7280" }}
                    />
                    {campaignMap.get(slug)?.title ?? slug}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2.5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Platform</p>
                <p className="mt-1 text-sm font-semibold">{post.platform}</p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2.5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Date</p>
                <p className="mt-1 text-sm font-semibold">{post.date}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Status</p>
              <span
                className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle.badge}`}
              >
                <span className={`h-2 w-2 rounded-full ${statusStyle.dot}`} />
                {post.status}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SocialCalendarSection({
  posts,
  campaigns,
  onCreatePost,
  onUploadForReview,
}: {
  posts: SocialReviewPost[];
  campaigns: CampaignRecord[];
  onCreatePost: (date?: string) => void;
  onUploadForReview: () => void;
}) {
  const [view, setView] = useState<CalendarView>("Month");
  const [focusDate, setFocusDate] = useState(new Date());
  const [campaignFilter, setCampaignFilter] = useState("All");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [activePostId, setActivePostId] = useState<number | null>(null);

  const campaignMap = useMemo(
    () => new Map(campaigns.map((campaign) => [campaign.slug, campaign])),
    [campaigns],
  );

  const colorByCampaign = useMemo(() => {
    return new Map(
      campaigns.map((campaign, index) => [campaign.slug, campaignPalette[index % campaignPalette.length]]),
    );
  }, [campaigns]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const campaignMatch = campaignFilter === "All" || post.campaignSlugs.includes(campaignFilter);
      const platformMatch = platformFilter === "All" || post.platform === platformFilter;
      const statusMatch = statusFilter === "All" || post.status === statusFilter;
      return campaignMatch && platformMatch && statusMatch;
    });
  }, [campaignFilter, platformFilter, posts, statusFilter]);

  const postsByDate = useMemo(() => {
    const map = new Map<string, SocialReviewPost[]>();

    filteredPosts.forEach((post) => {
      const existing = map.get(post.date) ?? [];
      map.set(post.date, [...existing, post]);
    });

    return map;
  }, [filteredPosts]);

  const monthCells = useMemo(() => buildMonthGrid(focusDate), [focusDate]);
  const weekDays = useMemo(() => getWeekDays(focusDate), [focusDate]);
  const focusDateKey = formatDateKey(focusDate);
  const dayPosts = postsByDate.get(focusDateKey) ?? [];

  const activePost = useMemo(
    () => filteredPosts.find((post) => post.id === activePostId) ?? null,
    [activePostId, filteredPosts],
  );

  const viewLabel = useMemo(() => {
    if (view === "Month") {
      return focusDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }

    if (view === "Week") {
      const start = weekDays[0]?.date;
      const end = weekDays[6]?.date;

      if (!start || !end) {
        return "Week";
      }

      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }

    return focusDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [focusDate, view, weekDays]);

  const shiftFocusDate = (direction: "prev" | "next") => {
    const amount = direction === "prev" ? -1 : 1;
    const next = new Date(focusDate);

    if (view === "Month") {
      next.setMonth(next.getMonth() + amount);
    } else if (view === "Week") {
      next.setDate(next.getDate() + amount * 7);
    } else {
      next.setDate(next.getDate() + amount);
    }

    setFocusDate(next);
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] pb-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Social Calendar</h3>
          <p className="text-sm text-muted">Plan and schedule social posts across campaigns.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1">
            {(["Month", "Week", "Day"] as const).map((viewOption) => (
              <button
                key={viewOption}
                type="button"
                onClick={() => setView(viewOption)}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  view === viewOption
                    ? "bg-[var(--color-surface)] text-[var(--color-text)]"
                    : "text-muted"
                }`}
              >
                {viewOption === "Month" ? <CalendarDays size={14} /> : null}
                {viewOption === "Week" ? <CalendarRange size={14} /> : null}
                {viewOption === "Day" ? <Clock3 size={14} /> : null}
                {viewOption}
              </button>
            ))}
          </div>

          <select
            value={campaignFilter}
            onChange={(event) => setCampaignFilter(event.target.value)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          >
            <option value="All">All Campaigns</option>
            {campaigns.map((campaign) => (
              <option key={campaign.slug} value={campaign.slug}>
                {campaign.title}
              </option>
            ))}
          </select>

          <select
            value={platformFilter}
            onChange={(event) => setPlatformFilter(event.target.value as PlatformFilter)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          >
            <option value="All">All Platforms</option>
            {socialPlatforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          >
            <option value="All">All Statuses</option>
            {socialPostStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <Button variant="secondary" className="gap-1.5" onClick={() => onCreatePost()}>
            <Plus size={14} />
            Create Post
          </Button>

          <Button variant="primary" className="gap-1.5" onClick={onUploadForReview}>
            <Upload size={14} />
            Upload for Review
          </Button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <Button variant="ghost" className="px-2 py-1.5 text-xs" onClick={() => shiftFocusDate("prev")}>
            Prev
          </Button>
          <Button variant="ghost" className="px-2 py-1.5 text-xs" onClick={() => setFocusDate(new Date())}>
            Today
          </Button>
          <Button variant="ghost" className="px-2 py-1.5 text-xs" onClick={() => shiftFocusDate("next")}>
            Next
          </Button>
        </div>

        <p className="text-sm font-semibold">{viewLabel}</p>
      </div>

      {view === "Month" ? (
        <div className="mt-4">
          <div className="grid grid-cols-7 gap-2">
            {weekdayLabels.map((label) => (
              <div
                key={label}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-1.5 text-center text-xs font-semibold uppercase tracking-[0.08em] text-muted"
              >
                {label}
              </div>
            ))}

            {monthCells.map((cell) => {
              const dayPostsList = postsByDate.get(cell.dateKey) ?? [];

              return (
                <div
                  key={cell.dateKey}
                  className={`min-h-[138px] rounded-xl border p-2 ${
                    cell.inCurrentMonth
                      ? "border-[var(--color-border)] bg-[var(--color-surface)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface-muted)]/70"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-semibold ${cell.inCurrentMonth ? "text-[var(--color-text)]" : "text-muted"}`}>
                      {cell.date.getDate()}
                    </p>
                    {dayPostsList.length < 1 ? (
                      <button
                        type="button"
                        onClick={() => onCreatePost(cell.dateKey)}
                        className="rounded-md border border-dashed border-[var(--color-border)] px-1.5 py-0.5 text-[10px] text-muted"
                      >
                        + Post
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-1.5 space-y-1.5">
                    {dayPostsList.slice(0, 4).map((post) => {
                      const PlatformIcon = platformIconMap[post.platform];
                      const primaryCampaign = post.campaignSlugs[0] ?? "";
                      const campaignColor = colorByCampaign.get(primaryCampaign) ?? "#6b7280";
                      const statusStyle = statusStyles(post.status);

                      return (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => setActivePostId(post.id)}
                          className="flex w-full items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1.5 text-left"
                        >
                          <img
                            src={post.imageUrl}
                            alt="Calendar post thumbnail"
                            className="h-7 w-7 rounded object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <PlatformIcon size={11} className="text-muted" />
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: campaignColor }} />
                              <span className={`h-2 w-2 rounded-full ${statusStyle.dot}`} />
                            </div>
                            <p className="truncate text-[11px] text-[var(--color-text)]">
                              {truncateCaption(post.caption, 28)}
                            </p>
                          </div>
                        </button>
                      );
                    })}

                    {dayPostsList.length > 4 ? (
                      <p className="text-[11px] font-semibold text-muted">
                        +{dayPostsList.length - 4} more
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {view === "Week" ? (
        <div className="mt-4 grid gap-3 xl:grid-cols-7">
          {weekDays.map((day) => {
            const weekPosts = postsByDate.get(day.dateKey) ?? [];

            return (
              <div
                key={day.dateKey}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5"
              >
                <div className="mb-2 border-b border-[var(--color-border)] pb-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{day.label}</p>
                  <p className="text-sm font-semibold">{day.date.getDate()}</p>
                </div>

                <div className="space-y-2">
                  {weekPosts.length < 1 ? (
                    <button
                      type="button"
                      onClick={() => onCreatePost(day.dateKey)}
                      className="w-full rounded-lg border border-dashed border-[var(--color-border)] px-2 py-2 text-xs text-muted"
                    >
                      Create post
                    </button>
                  ) : (
                    weekPosts.map((post) => {
                      const statusStyle = statusStyles(post.status);
                      const primaryCampaign = post.campaignSlugs[0] ?? "";
                      const campaignColor = colorByCampaign.get(primaryCampaign) ?? "#6b7280";

                      return (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => setActivePostId(post.id)}
                          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2 text-left"
                        >
                          <img
                            src={post.imageUrl}
                            alt="Week post preview"
                            className="h-24 w-full rounded-md object-cover"
                          />
                          <p className="mt-2 text-xs">{truncateCaption(post.caption, 64)}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                              style={{
                                backgroundColor: `${campaignColor}22`,
                                color: campaignColor,
                              }}
                            >
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: campaignColor }} />
                              {campaignMap.get(primaryCampaign)?.title ?? "Campaign"}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusStyle.badge}`}
                            >
                              <span className={`h-2 w-2 rounded-full ${statusStyle.dot}`} />
                              {post.status}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {view === "Day" ? (
        <div className="mt-4">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="space-y-4 border-l border-[var(--color-border)] pl-4">
              {dayPosts.length < 1 ? (
                <button
                  type="button"
                  onClick={() => onCreatePost(focusDateKey)}
                  className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-2 text-sm text-muted"
                >
                  No posts scheduled. Create post for this date.
                </button>
              ) : (
                dayPosts.map((post) => {
                  const primaryCampaign = post.campaignSlugs[0] ?? "";
                  const campaignColor = colorByCampaign.get(primaryCampaign) ?? "#6b7280";
                  const statusStyle = statusStyles(post.status);

                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => setActivePostId(post.id)}
                      className="relative w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-left"
                    >
                      <span
                        className="absolute -left-[22px] top-6 h-3 w-3 rounded-full border-2 border-[var(--color-surface)]"
                        style={{ backgroundColor: campaignColor }}
                      />
                      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
                        <img
                          src={post.imageUrl}
                          alt="Day view post preview"
                          className="h-[360px] w-full rounded-md object-contain"
                        />
                      </div>
                      <p className="mt-2 text-sm">{post.caption}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{
                            backgroundColor: `${campaignColor}22`,
                            color: campaignColor,
                          }}
                        >
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: campaignColor }} />
                          {campaignMap.get(primaryCampaign)?.title ?? "Campaign"}
                        </span>
                        <span className="inline-flex rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs font-semibold">
                          {post.platform}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle.badge}`}
                        >
                          <span className={`h-2 w-2 rounded-full ${statusStyle.dot}`} />
                          {post.status}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}

      <CalendarPostDetailModal
        post={activePost}
        campaigns={campaigns}
        colorByCampaign={colorByCampaign}
        onClose={() => setActivePostId(null)}
      />
    </Card>
  );
}
