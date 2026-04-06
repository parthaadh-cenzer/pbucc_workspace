"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNotifications } from "@/components/notifications/notifications-provider";
import { workspaceReviewMembers } from "@/lib/mock-review";
import type { CreateReviewItemInput, ReviewItem, ReviewRemarkHistoryItem, ReviewStatus } from "@/lib/review-types";

type ReviewTransitionInput = {
  id: string;
  by: string;
  remarks?: string;
};

type SendForUpdateInput = ReviewTransitionInput & {
  assigneeIds: string[];
};

type ReviewContextValue = {
  reviewItems: ReviewItem[];
  teamMembers: typeof workspaceReviewMembers;
  createReviewItem: (input: CreateReviewItemInput) => ReviewItem;
  setReviewInProgress: (input: { id: string; by: string }) => void;
  approveReviewItem: (input: ReviewTransitionInput) => void;
  rejectReviewItem: (input: ReviewTransitionInput) => void;
  sendForUpdate: (input: SendForUpdateInput) => void;
};

const ReviewContext = createContext<ReviewContextValue | null>(null);

function createItemId() {
  return `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createHistoryId() {
  return `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createHistoryEntry(input: {
  action: string;
  by: string;
  status: ReviewStatus;
  remarks?: string;
  assigneeIds?: string[];
}): ReviewRemarkHistoryItem {
  return {
    id: createHistoryId(),
    action: input.action,
    by: input.by,
    status: input.status,
    remarks: input.remarks,
    assigneeIds: input.assigneeIds,
    at: new Date().toISOString(),
  };
}

function dueInHours(dueDate: string) {
  const dueTime = new Date(`${dueDate}T23:59:59`).getTime();
  return (dueTime - Date.now()) / (1000 * 60 * 60);
}

function getReviewItemHref(input: { itemId: string; tab?: "review" | "approved" }) {
  const tab = input.tab ?? "review";
  return `/marketing/review?tab=${tab}&item=${input.itemId}`;
}

export function ReviewProvider({ children }: { children: ReactNode }) {
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const dueReminderSentRef = useRef<Set<string>>(new Set());
  const { addNotification } = useNotifications();

  const membersById = useMemo(
    () => new Map(workspaceReviewMembers.map((member) => [member.id, member])),
    [],
  );

  const reviewItemsById = useMemo(
    () => new Map(reviewItems.map((item) => [item.id, item])),
    [reviewItems],
  );

  const createReviewItem = useCallback(
    (input: CreateReviewItemInput) => {
      const now = new Date().toISOString();
      const id = createItemId();
      const note = input.note?.trim() || null;

      const created: ReviewItem = {
        id,
        title: input.title.trim(),
        fileType: input.fileType,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        dueDate: input.dueDate,
        submittedBy: input.createdBy,
        createdBy: input.createdBy,
        assignedTo: [...input.reviewerIds],
        currentAssignees: [...input.reviewerIds],
        status: "Pending Review",
        approvedAt: null,
        approvedBy: null,
        note,
        remarksHistory: [
          createHistoryEntry({
            action: "Submitted for review",
            by: input.createdBy,
            status: "Pending Review",
            remarks: note ?? undefined,
            assigneeIds: input.reviewerIds,
          }),
        ],
        createdAt: now,
        updatedAt: now,
      };

      setReviewItems((previous) => [created, ...previous]);

      input.reviewerIds.forEach((reviewerId) => {
        const reviewer = membersById.get(reviewerId);
        addNotification({
          title: "Assigned review task",
          source: "Review",
          message: `${reviewer?.name ?? "Team member"} assigned to review ${created.title}.`,
          href: getReviewItemHref({ itemId: created.id, tab: "review" }),
          recipient: reviewer?.name,
        });
      });

      return created;
    },
    [addNotification, membersById],
  );

  const setReviewInProgress = useCallback(
    (input: { id: string; by: string }) => {
      const current = reviewItemsById.get(input.id);

      if (!current || current.status !== "Pending Review") {
        return;
      }

      setReviewItems((previous) =>
        previous.map((item) => {
          if (item.id !== input.id) {
            return item;
          }

          return {
            ...item,
            status: "In Review",
            updatedAt: new Date().toISOString(),
            remarksHistory: [
              createHistoryEntry({
                action: "Review started",
                by: input.by,
                status: "In Review",
              }),
              ...item.remarksHistory,
            ],
          };
        }),
      );
    },
    [reviewItemsById],
  );

  const approveReviewItem = useCallback(
    (input: ReviewTransitionInput) => {
      const current = reviewItemsById.get(input.id);

      if (!current) {
        return;
      }

      const approvedAt = new Date().toISOString();

      setReviewItems((previous) =>
        previous.map((item) => {
          if (item.id !== input.id) {
            return item;
          }

          return {
            ...item,
            status: "Approved",
            approvedBy: input.by,
            approvedAt,
            currentAssignees: [],
            updatedAt: approvedAt,
            remarksHistory: [
              createHistoryEntry({
                action: "Approved",
                by: input.by,
                status: "Approved",
                remarks: input.remarks?.trim() || undefined,
              }),
              ...item.remarksHistory,
            ],
          };
        }),
      );

      addNotification({
        title: "Your review item was approved",
        source: "Review",
        message: `${current.title} was approved by ${input.by}.`,
        href: getReviewItemHref({ itemId: current.id, tab: "approved" }),
        recipient: current.submittedBy,
      });
    },
    [addNotification, reviewItemsById],
  );

  const rejectReviewItem = useCallback(
    (input: ReviewTransitionInput) => {
      const current = reviewItemsById.get(input.id);

      if (!current) {
        return;
      }

      setReviewItems((previous) =>
        previous.map((item) => {
          if (item.id !== input.id) {
            return item;
          }

          return {
            ...item,
            status: "Rejected",
            currentAssignees: [],
            updatedAt: new Date().toISOString(),
            remarksHistory: [
              createHistoryEntry({
                action: "Rejected",
                by: input.by,
                status: "Rejected",
                remarks: input.remarks?.trim() || undefined,
              }),
              ...item.remarksHistory,
            ],
          };
        }),
      );

      addNotification({
        title: "Review rejected",
        source: "Review",
        message: `${current.title} was rejected by ${input.by}.`,
        href: getReviewItemHref({ itemId: current.id, tab: "review" }),
      });
    },
    [addNotification, reviewItemsById],
  );

  const sendForUpdate = useCallback(
    (input: SendForUpdateInput) => {
      const current = reviewItemsById.get(input.id);

      if (!current) {
        return;
      }

      const uniqueAssignees = [...new Set(input.assigneeIds)];

      setReviewItems((previous) =>
        previous.map((item) => {
          if (item.id !== input.id) {
            return item;
          }

          const allAssigned = [...new Set([...item.assignedTo, ...uniqueAssignees])];

          return {
            ...item,
            status: "Update Requested",
            updatedAt: new Date().toISOString(),
            assignedTo: allAssigned,
            currentAssignees: uniqueAssignees,
            remarksHistory: [
              createHistoryEntry({
                action: "Sent for update",
                by: input.by,
                status: "Update Requested",
                remarks: input.remarks?.trim() || undefined,
                assigneeIds: uniqueAssignees,
              }),
              ...item.remarksHistory,
            ],
          };
        }),
      );

      addNotification({
        title: "Update requested on your review item",
        source: "Review",
        message: `${current.title} was sent for update by ${input.by}.`,
        href: getReviewItemHref({ itemId: input.id, tab: "review" }),
        recipient: current.submittedBy,
      });

      uniqueAssignees.forEach((assigneeId) => {
        const assignee = membersById.get(assigneeId);
        addNotification({
          title: "Item assigned for update",
          source: "Review",
          message: `${assignee?.name ?? "Team member"} was assigned to update ${current.title}.`,
          href: getReviewItemHref({ itemId: input.id, tab: "review" }),
          recipient: assignee?.name,
        });
      });
    },
    [addNotification, membersById, reviewItemsById],
  );

  useEffect(() => {
    reviewItems.forEach((item) => {
      if (item.status === "Approved" || item.status === "Rejected") {
        return;
      }

      const reminderKey = `${item.id}:${item.dueDate}`;
      if (dueReminderSentRef.current.has(reminderKey)) {
        return;
      }

      const hoursLeft = dueInHours(item.dueDate);
      if (hoursLeft > 48 || hoursLeft < 0) {
        return;
      }

      dueReminderSentRef.current.add(reminderKey);
      addNotification({
        title: "Review due soon",
        source: "Review",
        message: `${item.title} is due on ${item.dueDate}.`,
        href: getReviewItemHref({ itemId: item.id, tab: "review" }),
      });
    });
  }, [addNotification, reviewItems]);

  const value = useMemo<ReviewContextValue>(() => {
    return {
      reviewItems,
      teamMembers: workspaceReviewMembers,
      createReviewItem,
      setReviewInProgress,
      approveReviewItem,
      rejectReviewItem,
      sendForUpdate,
    };
  }, [approveReviewItem, createReviewItem, rejectReviewItem, reviewItems, sendForUpdate, setReviewInProgress]);

  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}

export function useReviewWorkspace() {
  const context = useContext(ReviewContext);

  if (!context) {
    throw new Error("useReviewWorkspace must be used within ReviewProvider.");
  }

  return context;
}
