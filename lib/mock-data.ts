import { workspaceUsers, type WorkspaceUser } from "@/lib/mock-users";

export type TeamOption = {
  name: "Marketing" | "Finance" | "Member Services" | "Philanthropy";
  enabled: boolean;
};

export type SidebarNavItem = {
  label: string;
  href: string;
  children?: Array<{
    label: string;
    href: string;
  }>;
};

export type DashboardStat = {
  id:
    | "activeCampaigns"
    | "pendingSocialReviews"
    | "approvedPostsThisWeek"
    | "seoDocsWaiting"
    | "recentShortLinks";
  label: string;
  value: string;
  meta: string;
};

export type QuickAction = {
  id:
    | "newCampaign"
    | "reviewSocialPosts"
    | "uploadSeoDocument"
    | "generateQrCode"
    | "createShortLink";
  label: string;
  description: string;
};

export type ActivityItem = {
  id: number;
  title: string;
  detail: string;
  time: string;
};

export type TeamMember = WorkspaceUser;

export const teamOptions: TeamOption[] = [
  { name: "Marketing", enabled: true },
  { name: "Finance", enabled: false },
  { name: "Member Services", enabled: false },
  { name: "Philanthropy", enabled: false },
];

export const marketingSidebarItems: SidebarNavItem[] = [
  { label: "Dashboard", href: "/marketing/dashboard" },
  { label: "Ongoing Campaigns", href: "/marketing/ongoing-campaigns" },
  {
    label: "Review",
    href: "/marketing/review",
    children: [
      { label: "Send for Review", href: "/marketing/review?tab=send" },
      { label: "Review", href: "/marketing/review?tab=review" },
      { label: "Approved", href: "/marketing/review?tab=approved" },
    ],
  },
  { label: "Social Review", href: "/marketing/social-review" },
  { label: "Social Calendar", href: "/marketing/social-calendar" },
  { label: "SEO Checker", href: "/marketing/seo-checker" },
  { label: "QR Code Maker", href: "/marketing/qr-code-maker" },
  { label: "URL Shortener", href: "/marketing/url-shortener" },
];

export const dashboardStats: DashboardStat[] = [
  {
    id: "activeCampaigns",
    label: "Active Campaigns",
    value: "12",
    meta: "3 launching this week",
  },
  {
    id: "pendingSocialReviews",
    label: "Pending Social Reviews",
    value: "18",
    meta: "5 marked urgent",
  },
  {
    id: "approvedPostsThisWeek",
    label: "Approved Posts This Week",
    value: "37",
    meta: "Up 11% vs last week",
  },
  {
    id: "seoDocsWaiting",
    label: "Documents Waiting for SEO Review",
    value: "9",
    meta: "4 queued for Cenzer analysis",
  },
  {
    id: "recentShortLinks",
    label: "Recent Short Links",
    value: "26",
    meta: "8 linked to active campaigns",
  },
];

export const quickActions: QuickAction[] = [
  {
    id: "newCampaign",
    label: "New Campaign",
    description: "Create a fresh campaign workspace draft.",
  },
  {
    id: "reviewSocialPosts",
    label: "Review Social Posts",
    description: "Open pending social content approvals.",
  },
  {
    id: "uploadSeoDocument",
    label: "Upload SEO Document",
    description: "Queue a document for Cenzer SEO checks.",
  },
  {
    id: "generateQrCode",
    label: "Generate QR Code",
    description: "Start a quick QR draft for campaign assets.",
  },
  {
    id: "createShortLink",
    label: "Create Short Link",
    description: "Add a campaign-ready short URL placeholder.",
  },
];

export const recentActivity: ActivityItem[] = [
  {
    id: 1,
    title: "Social post approved",
    detail: "Spring newsletter teaser approved by the Marketing Manager.",
    time: "11 minutes ago",
  },
  {
    id: 2,
    title: "Document analyzed by Cenzer",
    detail: "Landing page brief completed SEO analysis and tagging.",
    time: "42 minutes ago",
  },
  {
    id: 3,
    title: "Short URL linked to campaign",
    detail: "Summer membership push now includes a tracked short link.",
    time: "Today, 8:14 AM",
  },
  {
    id: 4,
    title: "Social review scheduled",
    detail: "Two Instagram reels added to tomorrow's review queue.",
    time: "Yesterday, 5:23 PM",
  },
];

export const teamMembers: TeamMember[] = workspaceUsers;
