"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Download, ExternalLink, FileUp, Send, ShieldCheck, ShieldX } from "lucide-react";
import { MultiSelectDropdown } from "@/components/social-review/multi-select-dropdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReviewFilePreview } from "@/components/review/review-file-preview";
import { useReviewWorkspace } from "@/components/review/review-provider";
import type { ReviewFileType, ReviewItem, ReviewStatus } from "@/lib/review-types";

type ReviewTab = "send" | "review" | "approved";

const EMPTY_SELECTION_ID = "__empty__";

function statusBadgeClass(status: ReviewStatus) {
  if (status === "Approved") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  }

  if (status === "Rejected") {
    return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
  }

  if (status === "Update Requested") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  }

  if (status === "In Review") {
    return "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function resolveFileType(file: File): ReviewFileType | null {
  const lower = file.name.toLowerCase();

  if (file.type.startsWith("image/")) {
    return "IMAGE";
  }

  if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
    return "PDF";
  }

  const isWordByName = lower.endsWith(".docx") || lower.endsWith(".doc");
  const isWordByType =
    file.type.includes("word") ||
    file.type.includes("officedocument") ||
    file.type === "application/msword";

  if (isWordByName || isWordByType) {
    return "WORD";
  }

  return null;
}

function tabFromQuery(value: string | null): ReviewTab {
  if (value === "approved") {
    return "approved";
  }

  return value === "review" ? "review" : "send";
}

function toDueDateTime(dueDate: string) {
  return new Date(`${dueDate}T23:59:59`).getTime();
}

function isOverdue(item: ReviewItem) {
  return Date.now() > toDueDateTime(item.dueDate);
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateOnly(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function sortReviewQueue(items: ReviewItem[]) {
  return [...items].sort((a, b) => {
    const overdueA = isOverdue(a) ? 1 : 0;
    const overdueB = isOverdue(b) ? 1 : 0;

    if (overdueA !== overdueB) {
      return overdueB - overdueA;
    }

    const dueDiff = toDueDateTime(a.dueDate) - toDueDateTime(b.dueDate);
    if (dueDiff !== 0) {
      return dueDiff;
    }

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

function sortApprovedItems(items: ReviewItem[]) {
  return [...items].sort((a, b) => {
    const approvedA = new Date(a.approvedAt ?? a.updatedAt).getTime();
    const approvedB = new Date(b.approvedAt ?? b.updatedAt).getTime();
    return approvedB - approvedA;
  });
}

export function ReviewWorkspace({ currentUserName }: { currentUserName: string }) {
  const {
    reviewItems,
    teamMembers,
    createReviewItem,
    setReviewInProgress,
    approveReviewItem,
    rejectReviewItem,
    sendForUpdate,
  } = useReviewWorkspace();
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = tabFromQuery(searchParams.get("tab"));
  const selectedItemParam = searchParams.get("item");

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [reviewerIds, setReviewerIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<ReviewFileType | null>(null);
  const [formError, setFormError] = useState("");

  const [selectedItemId, setSelectedItemId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [updateAssigneeIds, setUpdateAssigneeIds] = useState<string[]>([]);
  const [actionError, setActionError] = useState("");

  const queueItems = useMemo(() => {
    const activeItems = reviewItems.filter(
      (item) => item.status === "Pending Review" || item.status === "In Review",
    );

    return sortReviewQueue(activeItems);
  }, [reviewItems]);

  const approvedItems = useMemo(
    () => sortApprovedItems(reviewItems.filter((item) => item.status === "Approved")),
    [reviewItems],
  );

  const selectedItem = useMemo(() => {
    if (selectedItemId === EMPTY_SELECTION_ID) {
      return null;
    }

    if (selectedItemId) {
      return queueItems.find((item) => item.id === selectedItemId) ?? null;
    }

    return queueItems[0] ?? null;
  }, [queueItems, selectedItemId]);

  const teamMemberOptions = useMemo(
    () =>
      teamMembers.map((member) => ({
        value: member.id,
        label: member.name,
        description: member.role,
      })),
    [teamMembers],
  );

  const memberMap = useMemo(() => new Map(teamMembers.map((member) => [member.id, member])), [teamMembers]);

  const openReviewItem = useCallback(
    (itemId: string | null) => {
      if (!itemId) {
        setSelectedItemId(EMPTY_SELECTION_ID);
        setUpdateAssigneeIds([]);
        router.replace("/marketing/review?tab=review");
        return;
      }

      const found = queueItems.find((item) => item.id === itemId);
      setSelectedItemId(itemId);
      setUpdateAssigneeIds(found?.currentAssignees ?? []);
      router.replace(`/marketing/review?tab=review&item=${itemId}`);
    },
    [queueItems, router],
  );

  const getNextQueueItemId = useCallback(
    (currentId: string) => {
      const index = queueItems.findIndex((item) => item.id === currentId);

      if (index < 0) {
        return queueItems[0]?.id ?? null;
      }

      return queueItems[index + 1]?.id ?? null;
    },
    [queueItems],
  );

  useEffect(() => {
    if (activeTab !== "review") {
      return;
    }

    if (!selectedItemParam) {
      return;
    }

    const found = queueItems.find((item) => item.id === selectedItemParam);
    if (found) {
      setSelectedItemId(found.id);
      setUpdateAssigneeIds(found.currentAssignees);
    }
  }, [activeTab, queueItems, selectedItemParam]);

  useEffect(() => {
    if (activeTab !== "review") {
      return;
    }

    if (selectedItemId || selectedItemParam) {
      return;
    }

    if (queueItems.length > 0) {
      setSelectedItemId(queueItems[0].id);
      setUpdateAssigneeIds(queueItems[0].currentAssignees);
      router.replace(`/marketing/review?tab=review&item=${queueItems[0].id}`);
    }
  }, [activeTab, queueItems, router, selectedItemId, selectedItemParam]);

  useEffect(() => {
    if (selectedItem && activeTab === "review") {
      setReviewInProgress({ id: selectedItem.id, by: currentUserName });
    }
  }, [activeTab, currentUserName, selectedItem, setReviewInProgress]);

  const switchTab = (tab: ReviewTab) => {
    if (tab === "send") {
      router.replace("/marketing/review?tab=send");
      return;
    }

    if (tab === "approved") {
      const firstApproved = approvedItems[0];
      const query = firstApproved ? `?tab=approved&item=${firstApproved.id}` : "?tab=approved";
      router.replace(`/marketing/review${query}`);
      return;
    }

    const query = selectedItem ? `?tab=review&item=${selectedItem.id}` : "?tab=review";
    router.replace(`/marketing/review${query}`);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);

    if (!file) {
      setFileType(null);
      return;
    }

    const nextType = resolveFileType(file);
    setFileType(nextType);

    if (!nextType) {
      setFormError("Supported file types: Word, PDF, and images.");
    } else {
      setFormError("");
    }
  };

  const resetSendForm = () => {
    setTitle("");
    setDueDate("");
    setReviewerIds([]);
    setNote("");
    setSelectedFile(null);
    setFileType(null);
    setFormError("");
  };

  const handleSubmitForReview = () => {
    if (!selectedFile || !fileType) {
      setFormError("Upload a supported file before submitting.");
      return;
    }

    if (!title.trim()) {
      setFormError("Header / Title is required.");
      return;
    }

    if (!dueDate) {
      setFormError("Due date is required.");
      return;
    }

    if (reviewerIds.length < 1) {
      setFormError("Assign at least one reviewer.");
      return;
    }

    const fileUrl = URL.createObjectURL(selectedFile);
    const created = createReviewItem({
      title,
      fileType,
      fileName: selectedFile.name,
      fileUrl,
      dueDate,
      createdBy: currentUserName,
      reviewerIds,
      note,
    });

    resetSendForm();
    setSelectedItemId(created.id);
    setUpdateAssigneeIds(created.currentAssignees);
    router.push(`/marketing/review?tab=review&item=${created.id}`);
  };

  const handleApprove = () => {
    if (!selectedItem) {
      return;
    }

    const nextItemId = getNextQueueItemId(selectedItem.id);

    approveReviewItem({
      id: selectedItem.id,
      by: currentUserName,
      remarks,
    });

    openReviewItem(nextItemId);
    setRemarks("");
    setActionError("");
  };

  const handleReject = () => {
    if (!selectedItem) {
      return;
    }

    const nextItemId = getNextQueueItemId(selectedItem.id);

    rejectReviewItem({
      id: selectedItem.id,
      by: currentUserName,
      remarks,
    });

    openReviewItem(nextItemId);
    setRemarks("");
    setActionError("");
  };

  const handleSendForUpdate = () => {
    if (!selectedItem) {
      return;
    }

    if (!remarks.trim()) {
      setActionError("Remarks are required when sending for update.");
      return;
    }

    if (updateAssigneeIds.length < 1) {
      setActionError("Select one or more assignees for update.");
      return;
    }

    const nextItemId = getNextQueueItemId(selectedItem.id);

    sendForUpdate({
      id: selectedItem.id,
      by: currentUserName,
      remarks,
      assigneeIds: updateAssigneeIds,
    });

    openReviewItem(nextItemId);
    setRemarks("");
    setActionError("");
  };

  const actionsDisabled = !selectedItem;

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Review</h2>
            <p className="text-sm text-muted">Submit files, assign reviewers, and close approvals.</p>
          </div>

          <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1">
            <button
              type="button"
              onClick={() => switchTab("send")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                activeTab === "send"
                  ? "bg-[var(--color-surface)] text-[var(--color-text)]"
                  : "text-muted"
              }`}
            >
              Send for Review
            </button>
            <button
              type="button"
              onClick={() => switchTab("review")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                activeTab === "review"
                  ? "bg-[var(--color-surface)] text-[var(--color-text)]"
                  : "text-muted"
              }`}
            >
              Review
            </button>
            <button
              type="button"
              onClick={() => switchTab("approved")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                activeTab === "approved"
                  ? "bg-[var(--color-surface)] text-[var(--color-text)]"
                  : "text-muted"
              }`}
            >
              Approved
            </button>
          </div>
        </div>
      </Card>

      {activeTab === "send" ? (
        <Card className="p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Upload file *</span>
              <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <FileUp size={16} />
                  Word, PDF, or image
                </div>
                <input
                  type="file"
                  accept=".doc,.docx,.pdf,image/*"
                  onChange={handleFileChange}
                  className="mt-3 block w-full text-sm"
                />
                {selectedFile ? <p className="mt-2 text-xs text-muted">{selectedFile.name}</p> : null}
              </div>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Header / Title *</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Enter review title"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Due date *</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
              />
            </label>

            <MultiSelectDropdown
              label="Reviewer assignment"
              required
              placeholder="Select reviewer(s)"
              selectedValues={reviewerIds}
              options={teamMemberOptions}
              onChange={setReviewerIds}
              helperText="Assign one or multiple team members"
              searchPlaceholder="Search team members"
            />

            <label className="space-y-1.5 lg:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Optional short note</span>
              <textarea
                rows={4}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add context for reviewer(s)"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
              />
            </label>
          </div>

          {formError ? (
            <p className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
              {formError}
            </p>
          ) : null}

          <div className="mt-4">
            <Button variant="primary" className="gap-1.5" onClick={handleSubmitForReview}>
              <Send size={14} />
              Submit for Review
            </Button>
          </div>
        </Card>
      ) : activeTab === "approved" ? (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Approved Items</h3>
              <p className="text-sm text-muted">Latest approvals appear first.</p>
            </div>
          </div>

          <div className="mt-4 max-h-[700px] space-y-3 overflow-y-auto pr-1">
            {approvedItems.length < 1 ? (
              <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-muted">
                No approved items yet.
              </p>
            ) : (
              approvedItems.map((item) => {
                const focused = selectedItemParam === item.id;

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-4 ${
                      focused
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-muted)]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="mt-1 text-xs text-muted">{item.fileName}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-2 lg:grid-cols-3">
                      <p>Approved by <span className="font-semibold text-[var(--color-text)]">{item.approvedBy ?? "-"}</span></p>
                      <p>Approved at <span className="font-semibold text-[var(--color-text)]">{formatDate(item.approvedAt)}</span></p>
                      <p>Submitted by <span className="font-semibold text-[var(--color-text)]">{item.submittedBy}</span></p>
                      <p>Due date <span className="font-semibold text-[var(--color-text)]">{formatDateOnly(item.dueDate)}</span></p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold transition hover:bg-[var(--color-surface-muted)]"
                      >
                        <ExternalLink size={13} />
                        Open
                      </a>
                      <a
                        href={item.fileUrl}
                        download={item.fileName}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold transition hover:bg-[var(--color-surface-muted)]"
                      >
                        <Download size={13} />
                        Download
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[290px_1fr_340px]">
          <Card className="p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">Review Queue</h3>
            <p className="mt-1 text-xs text-muted">Sorted by due date (earliest first). Overdue items are highlighted.</p>
            <div className="mt-3 max-h-[700px] space-y-2 overflow-y-auto pr-1">
              {queueItems.length < 1 ? (
                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-sm text-muted">
                  Queue is clear. No review items are pending.
                </p>
              ) : (
                queueItems.map((item) => {
                  const selected = selectedItem?.id === item.id;
                  const overdue = isOverdue(item);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        openReviewItem(item.id);
                      }}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selected
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                          : overdue
                            ? "border-rose-300 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-900/20"
                            : "border-[var(--color-border)] bg-[var(--color-surface-muted)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold">{item.title}</p>
                        {overdue ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                            <AlertTriangle size={11} />
                            Overdue
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 grid gap-1 text-xs text-muted">
                        <p>Due: {formatDateOnly(item.dueDate)}</p>
                        <p>Status: {item.status}</p>
                        <p>Sender: {item.submittedBy}</p>
                        <p>File: {item.fileType} · {item.fileName}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="p-4">
            {selectedItem ? (
              <>
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">Selected File</h3>
                <p className="mt-1 text-xs text-muted">{selectedItem.fileName}</p>
                <div className="mt-3">
                  <ReviewFilePreview item={selectedItem} />
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                <p className="text-sm font-semibold">No item selected</p>
                <p className="mt-1 text-sm text-muted">
                  Select an item from the queue to preview it, or you are all caught up.
                </p>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">Review Actions</h3>

            {selectedItem ? (
              <>
                <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Current Status</p>
                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(selectedItem.status)}`}
                  >
                    {selectedItem.status}
                  </span>
                </div>

                <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-xs text-muted">
                  <p>
                    Sender <span className="font-semibold text-[var(--color-text)]">{selectedItem.submittedBy}</span>
                  </p>
                  <p className="mt-1">Assigned to {selectedItem.currentAssignees.map((id) => memberMap.get(id)?.name ?? id).join(", ") || "No assignee"}</p>
                  <p className="mt-1">Due date {selectedItem.dueDate}</p>
                  <p className="mt-1">File type {selectedItem.fileType}</p>
                </div>

                <label className="mt-3 block space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Remarks</span>
                  <textarea
                    rows={5}
                    value={remarks}
                    onChange={(event) => {
                      setRemarks(event.target.value);
                      setActionError("");
                    }}
                    placeholder="Add remarks for this action"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
                  />
                </label>

                <div className="mt-3">
                  <MultiSelectDropdown
                    label="Reassign for update"
                    placeholder="Choose assignee(s)"
                    selectedValues={updateAssigneeIds}
                    options={teamMemberOptions}
                    onChange={(values) => {
                      setUpdateAssigneeIds(values);
                      setActionError("");
                    }}
                    helperText="Used when sending item for update"
                    searchPlaceholder="Search team members"
                  />
                </div>

                {actionError ? (
                  <p className="mt-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
                    {actionError}
                  </p>
                ) : null}

                <div className="mt-3 grid grid-cols-1 gap-2">
                  <Button
                    variant="primary"
                    className="justify-start gap-1.5"
                    onClick={handleApprove}
                    disabled={actionsDisabled}
                  >
                    <ShieldCheck size={15} />
                    Approve
                  </Button>
                  <Button
                    variant="secondary"
                    className="justify-start gap-1.5"
                    onClick={handleReject}
                    disabled={actionsDisabled}
                  >
                    <ShieldX size={15} />
                    Reject
                  </Button>
                  <Button
                    variant="secondary"
                    className="justify-start"
                    onClick={handleSendForUpdate}
                    disabled={actionsDisabled}
                  >
                    Send for Update
                  </Button>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">History</p>
                  <div className="mt-2 space-y-2">
                    {selectedItem.remarksHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2.5"
                      >
                        <p className="text-xs font-semibold">{entry.action}</p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {entry.by} · {new Date(entry.at).toLocaleString("en-US")}
                        </p>
                        {entry.remarks ? (
                          <p className="mt-1 text-[11px] text-muted">Remarks: {entry.remarks}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted">No review item selected.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
