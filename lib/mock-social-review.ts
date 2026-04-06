import { workspaceUsers } from "@/lib/mock-users";

export type SocialPostStatus =
  | "Draft"
  | "Pending Review"
  | "Changes Requested"
  | "Approved"
  | "Scheduled"
  | "Posted";

export type SocialPlatform =
  | "Instagram"
  | "Facebook"
  | "LinkedIn"
  | "Email"
  | "Website";

export type SocialReviewHistoryItem = {
  id: number;
  action: string;
  by: string;
  at: string;
  remarks?: string;
};

export type SocialReviewPost = {
  id: number;
  imageUrl: string;
  caption: string;
  campaignSlugs: string[];
  reviewerIds: string[];
  platform: SocialPlatform;
  date: string;
  status: SocialPostStatus;
  reviewHistory: SocialReviewHistoryItem[];
};

export type NewSocialPostInput = {
  imageUrl: string;
  date: string;
  caption: string;
  campaignSlugs: string[];
  reviewerIds: string[];
  platform: SocialPlatform;
  createdBy?: string;
};

export type SocialReviewTeamMember = {
  id: string;
  name: string;
  role: string;
};

export const socialPostStatuses: SocialPostStatus[] = [
  "Draft",
  "Pending Review",
  "Changes Requested",
  "Approved",
  "Scheduled",
  "Posted",
];

export const socialPlatforms: SocialPlatform[] = [
  "Instagram",
  "Facebook",
  "LinkedIn",
  "Email",
  "Website",
];

export const socialReviewTeamMembers: SocialReviewTeamMember[] = [
  ...workspaceUsers.map((user) => ({ id: user.id, name: user.name, role: user.role })),
];

export const socialReviewSeedPosts: SocialReviewPost[] = [
  {
    id: 1,
    imageUrl: "https://picsum.photos/seed/social-1/900/600",
    caption:
      "Practical budgeting starts with small weekly habits. Download our free checklist and join the next workshop.",
    campaignSlugs: ["managing-money-for-today", "planning-for-tomorrow"],
    reviewerIds: ["partha", "test-admin"],
    platform: "Instagram",
    date: "2026-04-11",
    status: "Pending Review",
    reviewHistory: [
      {
        id: 1,
        action: "Uploaded for review",
        by: "Partha",
        at: "2026-04-09 09:12",
      },
    ],
  },
  {
    id: 2,
    imageUrl: "https://picsum.photos/seed/social-2/900/600",
    caption:
      "Your future plan can start this week. Book a 1:1 financial planning session and get your roadmap.",
    campaignSlugs: ["planning-for-tomorrow"],
    reviewerIds: ["test-admin", "partha"],
    platform: "LinkedIn",
    date: "2026-04-14",
    status: "Changes Requested",
    reviewHistory: [
      {
        id: 1,
        action: "Uploaded for review",
        by: "Test Admin",
        at: "2026-04-08 11:30",
      },
      {
        id: 2,
        action: "Sent for change",
        by: "Partha",
        at: "2026-04-08 15:02",
        remarks: "Please tighten intro line and add registration deadline.",
      },
    ],
  },
  {
    id: 3,
    imageUrl: "https://picsum.photos/seed/social-3/900/600",
    caption:
      "Faith and finance can work together. Watch the webinar replay and share with your group.",
    campaignSlugs: ["faith-finance"],
    reviewerIds: ["partha"],
    platform: "Facebook",
    date: "2026-05-03",
    status: "Draft",
    reviewHistory: [
      {
        id: 1,
        action: "Draft created",
        by: "Partha",
        at: "2026-04-07 10:18",
      },
    ],
  },
  {
    id: 4,
    imageUrl: "https://picsum.photos/seed/social-4/900/600",
    caption:
      "Meet people who found purpose through serving. Tap to explore open volunteer opportunities.",
    campaignSlugs: ["answering-your-call", "faith-finance"],
    reviewerIds: ["test-admin", "partha"],
    platform: "Instagram",
    date: "2026-04-18",
    status: "Approved",
    reviewHistory: [
      {
        id: 1,
        action: "Uploaded for review",
        by: "Test Admin",
        at: "2026-04-06 13:21",
      },
      {
        id: 2,
        action: "Approved",
        by: "Partha",
        at: "2026-04-06 15:40",
      },
    ],
  },
];

export function getMonthKey(dateValue: string | Date) {
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function addMonths(monthKey: string, count: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + count, 1);
  return getMonthKey(date);
}

export function createSocialPostFromUpload(
  input: NewSocialPostInput,
  nextId: number,
): SocialReviewPost {
  const createdBy = input.createdBy?.trim() || "Partha";

  return {
    id: nextId,
    imageUrl: input.imageUrl,
    caption: input.caption,
    campaignSlugs: input.campaignSlugs,
    reviewerIds: input.reviewerIds,
    platform: input.platform,
    date: input.date,
    status: "Pending Review",
    reviewHistory: [
      {
        id: 1,
        action: "Uploaded for review",
        by: createdBy,
        at: new Date().toLocaleString("en-US"),
      },
    ],
  };
}
