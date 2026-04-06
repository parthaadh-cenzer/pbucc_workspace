"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { useCampaigns } from "@/components/campaigns/campaigns-provider";
import { useSocialPosts } from "@/components/social-review/social-posts-provider";
import { UploadSocialPostModal } from "@/components/social-review/upload-social-post-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  addMonths,
  getMonthKey,
  socialPostStatuses,
  socialReviewTeamMembers,
  type NewSocialPostInput,
  type SocialPostStatus,
  type SocialReviewPost,
} from "@/lib/mock-social-review";
import { getWorkspaceUserName } from "@/lib/mock-users";

type ReviewStatusFilter = "All" | SocialPostStatus;

function statusBadgeClass(status: SocialPostStatus) {
  if (status === "Approved" || status === "Posted") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  }

  if (status === "Pending Review" || status === "Scheduled") {
    return "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300";
  }

  if (status === "Changes Requested") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

export function SocialReviewWorkspace() {
  const { campaigns } = useCampaigns();
  const { posts, addPost, updatePost } = useSocialPosts();
  const [selectedPostId, setSelectedPostId] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey(new Date()));
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>("All");
  const [campaignFilter, setCampaignFilter] = useState("All");
  const [remarks, setRemarks] = useState("");
  const [actionError, setActionError] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);

  const campaignMap = useMemo(
    () => new Map(campaigns.map((campaign) => [campaign.slug, campaign])),
    [campaigns],
  );

  const reviewerMap = useMemo(
    () => new Map(socialReviewTeamMembers.map((member) => [member.id, member])),
    [],
  );

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const monthMatch = getMonthKey(post.date) === selectedMonth;
      const statusMatch = statusFilter === "All" || post.status === statusFilter;
      const campaignMatch =
        campaignFilter === "All" || post.campaignSlugs.includes(campaignFilter);
      return monthMatch && statusMatch && campaignMatch;
    });
  }, [campaignFilter, posts, selectedMonth, statusFilter]);

  const selectedPost = useMemo(
    () => filteredPosts.find((post) => post.id === selectedPostId) ?? filteredPosts[0] ?? null,
    [filteredPosts, selectedPostId],
  );

  const appendHistory = (
    post: SocialReviewPost,
    action: string,
    remarksText?: string,
  ) => {
    const nextId = post.reviewHistory.length + 1;
    return [
      {
        id: nextId,
        action,
        by: getWorkspaceUserName("partha"),
        at: new Date().toLocaleString("en-US"),
        remarks: remarksText?.trim() || undefined,
      },
      ...post.reviewHistory,
    ];
  };

  const handleApprove = () => {
    if (!selectedPost) {
      return;
    }

    updatePost(selectedPost.id, (post) => ({
      ...post,
      status: "Approved",
      reviewHistory: appendHistory(post, "Approved", remarks),
    }));

    setRemarks("");
    setActionError("");
  };

  const handleSendForChange = () => {
    if (!selectedPost) {
      return;
    }

    if (!remarks.trim()) {
      setActionError("Remarks are required when sending for change.");
      return;
    }

    updatePost(selectedPost.id, (post) => ({
      ...post,
      status: "Changes Requested",
      reviewHistory: appendHistory(post, "Sent for change", remarks),
    }));

    setRemarks("");
    setActionError("");
  };

  const handleUpload = (input: NewSocialPostInput) => {
    const created = addPost(input);
    setSelectedPostId(created.id);
    setSelectedMonth(getMonthKey(created.date));
    setStatusFilter("All");
    setCampaignFilter("All");
  };

  const openUploadModal = () => {
    setUploadOpen(true);
  };

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Social Review</h2>
            <p className="text-sm text-muted">
              Review, approve, or request changes for campaign posts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                Month
              </span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="bg-transparent text-sm outline-none"
              />
            </label>

            <Button
              variant="secondary"
              className="px-3 py-2 text-xs"
              onClick={() => setSelectedMonth((previous) => addMonths(previous, 1))}
            >
              Next Month
            </Button>

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
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ReviewStatusFilter)}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
            >
              <option value="All">All Statuses</option>
              {socialPostStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <Button
              variant="primary"
              className="gap-1.5"
              onClick={() => openUploadModal()}
            >
              <Upload size={14} />
              Upload for Review
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[290px_1fr_330px]">
        <Card className="p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">
            Review Queue
          </h3>
          <div className="mt-3 space-y-3">
            {filteredPosts.length < 1 ? (
              <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-xs text-muted">
                No posts in queue for selected filters.
              </p>
            ) : (
              filteredPosts.map((post) => {
                const selected = selectedPost?.id === post.id;
                const campaignNames = post.campaignSlugs
                  .map((slug) => campaignMap.get(slug)?.title)
                  .filter((title): title is string => Boolean(title));

                const campaignSummary =
                  campaignNames.length > 1
                    ? `${campaignNames[0]} +${campaignNames.length - 1}`
                    : campaignNames[0] ?? "Unlinked Campaign";

                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => {
                      setSelectedPostId(post.id);
                      setActionError("");
                    }}
                    className={`w-full rounded-xl border p-2 text-left transition ${
                      selected
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-muted)]"
                    }`}
                  >
                    <img
                      src={post.imageUrl}
                      alt="Post thumbnail"
                      className="h-20 w-full rounded-lg object-cover"
                    />
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-semibold">{post.platform}</p>
                      <p className="text-xs text-muted">{post.date}</p>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(post.status)}`}
                      >
                        {post.status}
                      </span>
                      <p className="text-xs text-muted">{campaignSummary}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="p-4">
          {selectedPost ? (
            <>
              <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">
                Selected Post
              </h3>

              <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                <div
                  className="mx-auto flex aspect-square w-full max-w-full items-center justify-center rounded-lg bg-[var(--color-surface-muted)]"
                  style={{ maxWidth: 1920, maxHeight: 1920 }}
                >
                  <img
                    src={selectedPost.imageUrl}
                    alt="Selected social post"
                    className="h-full w-full object-contain object-center"
                  />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                    Caption
                  </p>
                  <p className="mt-1 text-sm">{selectedPost.caption}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                      Linked Campaigns
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {selectedPost.campaignSlugs.map((campaignSlug) => {
                        const campaign = campaignMap.get(campaignSlug);

                        return (
                          <Link
                            key={campaignSlug}
                            href={`/marketing/ongoing-campaigns/${campaignSlug}`}
                            className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-1 text-xs font-semibold text-[var(--color-accent)]"
                          >
                            {campaign?.title ?? "Unlinked Campaign"}
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                      Sent for Review
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPost.reviewerIds.length > 0 ? (
                        selectedPost.reviewerIds.map((reviewerId) => {
                          const reviewer = reviewerMap.get(reviewerId);

                          return (
                            <span
                              key={reviewerId}
                              className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-1 text-xs font-semibold"
                            >
                              {reviewer?.name ?? reviewerId}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-muted">No reviewers assigned</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                      Platform
                    </p>
                    <p className="mt-1 text-sm font-semibold">{selectedPost.platform}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                      Scheduled/Post Date
                    </p>
                    <p className="mt-1 text-sm font-semibold">{selectedPost.date}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">Select a post from the review queue.</p>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">
            Review Actions
          </h3>

          {selectedPost ? (
            <>
              <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  Current Status
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(selectedPost.status)}`}
                >
                  {selectedPost.status}
                </span>
              </div>

              <label className="mt-3 block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  Remarks
                </span>
                <textarea
                  rows={5}
                  value={remarks}
                  onChange={(event) => {
                    setRemarks(event.target.value);
                    setActionError("");
                  }}
                  placeholder="Add review remarks..."
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
                />
              </label>

              {actionError ? (
                <p className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {actionError}
                </p>
              ) : null}

              <div className="mt-3 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={handleSendForChange}>
                  Send for Change
                </Button>
                <Button variant="primary" className="flex-1" onClick={handleApprove}>
                  Accept
                </Button>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  Review History
                </p>
                <div className="mt-2 space-y-2">
                  {selectedPost.reviewHistory.map((item) => (
                    <div
                      key={`${selectedPost.id}-${item.id}`}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2.5"
                    >
                      <p className="text-xs font-semibold">{item.action}</p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {item.by} · {item.at}
                      </p>
                      {item.remarks ? (
                        <p className="mt-1 text-[11px] text-muted">Remarks: {item.remarks}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Select a post to review actions and history.
            </p>
          )}
        </Card>
      </div>

      <UploadSocialPostModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        campaigns={campaigns}
        onUpload={handleUpload}
      />
    </div>
  );
}
