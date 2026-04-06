export const reviewStatuses = [
  "Draft",
  "Pending Review",
  "In Review",
  "Update Requested",
  "Approved",
  "Rejected",
] as const;

export type ReviewStatus = (typeof reviewStatuses)[number];

export type ReviewFileType = "WORD" | "PDF" | "IMAGE";

export type ReviewRemarkHistoryItem = {
  id: string;
  action: string;
  by: string;
  at: string;
  remarks?: string;
  status: ReviewStatus;
  assigneeIds?: string[];
};

export type ReviewItem = {
  id: string;
  title: string;
  fileType: ReviewFileType;
  fileName: string;
  fileUrl: string;
  dueDate: string;
  submittedBy: string;
  createdBy: string;
  assignedTo: string[];
  currentAssignees: string[];
  status: ReviewStatus;
  approvedAt: string | null;
  approvedBy: string | null;
  note: string | null;
  remarksHistory: ReviewRemarkHistoryItem[];
  createdAt: string;
  updatedAt: string;
};

export type CreateReviewItemInput = {
  title: string;
  fileType: ReviewFileType;
  fileName: string;
  fileUrl: string;
  dueDate: string;
  createdBy: string;
  reviewerIds: string[];
  note?: string;
};
