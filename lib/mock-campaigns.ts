export type CampaignStatus = "On Track" | "Monitoring" | "Needs Attention";

export type CampaignPerformancePoint = {
  label: string;
  urlClicks: number;
  qrScans: number;
  impressions: number;
  engagements: number;
};

export type CampaignKpis = {
  impressions: number;
  urlClicks: number;
  qrScans: number;
  engagements: number;
  goalCompletion: number;
  conversions: number;
};

export type UrlLinkReportItem = {
  id: number;
  linkName: string;
  destinationUrl: string;
  slug: string;
  platformSource: string;
  clicks: number;
  ctr: string;
  createdDate: string;
  lastActivity: string;
};

export type QrCodeReportItem = {
  id: number;
  qrName: string;
  linkedDestination: string;
  usageType: "print" | "digital";
  totalScans: number;
  uniqueScans: number;
  createdDate: string;
  lastActivity: string;
};

export type SocialPlatformSummary = {
  platform: "Instagram" | "Facebook" | "LinkedIn" | "Email" | "Website";
  impressions: number;
  clicks: number;
  engagementRate: string;
};

export type SocialDetailRow = {
  id: number;
  platform: string;
  assetName: string;
  date: string;
  impressions: number;
  reach: number;
  clicks: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagementRate: string;
};

export type CampaignGoalProgress = {
  goal: string;
  current: number;
  target: number;
  unit: string;
};

export type CampaignRecentActivity = {
  id: number;
  title: string;
  detail: string;
  time: string;
};

export type Campaign = {
  slug: string;
  title: string;
  objective: string;
  ownerTeam: string;
  status: CampaignStatus;
  dateRange: string;
  healthScore: number;
  topPerformingAsset: string;
  kpis: CampaignKpis;
  performanceGraph: CampaignPerformancePoint[];
  urlLinksReport: UrlLinkReportItem[];
  qrCodesReport: QrCodeReportItem[];
  socialPlatformSummary: SocialPlatformSummary[];
  socialDetails: SocialDetailRow[];
  goalsProgress: CampaignGoalProgress;
  recentActivity: CampaignRecentActivity[];
  notes: string[];
};

export const ongoingCampaigns: Campaign[] = [
  {
    slug: "managing-money-for-today",
    title: "Managing Money for Today",
    objective:
      "Drive budgeting workshop registrations and push practical money-management tools to members.",
    ownerTeam: "Marketing Team - Community Education",
    status: "On Track",
    dateRange: "Jan 12, 2026 - Jun 30, 2026",
    healthScore: 88,
    topPerformingAsset: "Budget Reset Landing Page",
    kpis: {
      impressions: 228100,
      urlClicks: 14920,
      qrScans: 3184,
      engagements: 18047,
      goalCompletion: 83,
      conversions: 746,
    },
    performanceGraph: [
      { label: "Week 1", urlClicks: 1800, qrScans: 360, impressions: 28000, engagements: 2200 },
      { label: "Week 2", urlClicks: 2200, qrScans: 430, impressions: 32200, engagements: 2600 },
      { label: "Week 3", urlClicks: 2500, qrScans: 510, impressions: 36000, engagements: 3000 },
      { label: "Week 4", urlClicks: 3100, qrScans: 680, impressions: 39800, engagements: 3580 },
      { label: "Week 5", urlClicks: 2860, qrScans: 620, impressions: 37200, engagements: 3330 },
      { label: "Week 6", urlClicks: 2460, qrScans: 584, impressions: 34900, engagements: 3337 },
    ],
    urlLinksReport: [
      {
        id: 1,
        linkName: "Budget Checklist",
        destinationUrl: "https://pbucc.org/resources/budget-checklist",
        slug: "mmt-budget-2026",
        platformSource: "Email",
        clicks: 3950,
        ctr: "6.4%",
        createdDate: "2026-01-15",
        lastActivity: "2 hours ago",
      },
      {
        id: 2,
        linkName: "Savings Tips",
        destinationUrl: "https://pbucc.org/resources/savings-tips",
        slug: "mmt-save-smarter",
        platformSource: "Facebook",
        clicks: 2740,
        ctr: "4.9%",
        createdDate: "2026-01-24",
        lastActivity: "Yesterday",
      },
      {
        id: 3,
        linkName: "Debt Planner",
        destinationUrl: "https://pbucc.org/tools/debt-planner",
        slug: "mmt-debt-plan",
        platformSource: "Instagram",
        clicks: 1980,
        ctr: "4.1%",
        createdDate: "2026-02-01",
        lastActivity: "3 days ago",
      },
    ],
    qrCodesReport: [
      {
        id: 1,
        qrName: "Flyer QR - Budget Workshop",
        linkedDestination: "Workshop Registration",
        usageType: "print",
        totalScans: 840,
        uniqueScans: 613,
        createdDate: "2026-01-20",
        lastActivity: "Yesterday",
      },
      {
        id: 2,
        qrName: "Reel QR - Savings Guide",
        linkedDestination: "Savings Tips Article",
        usageType: "digital",
        totalScans: 610,
        uniqueScans: 470,
        createdDate: "2026-02-02",
        lastActivity: "4 hours ago",
      },
    ],
    socialPlatformSummary: [
      { platform: "Instagram", impressions: 81800, clicks: 5400, engagementRate: "8.5%" },
      { platform: "Facebook", impressions: 102400, clicks: 5640, engagementRate: "7.2%" },
      { platform: "LinkedIn", impressions: 43900, clicks: 3880, engagementRate: "8.1%" },
      { platform: "Email", impressions: 33200, clicks: 2180, engagementRate: "6.6%" },
      { platform: "Website", impressions: 26800, clicks: 1820, engagementRate: "5.9%" },
    ],
    socialDetails: [
      {
        id: 1,
        platform: "Instagram",
        assetName: "Budget Reset Reel",
        date: "2026-03-08",
        impressions: 18200,
        reach: 14400,
        clicks: 1210,
        likes: 530,
        comments: 67,
        shares: 102,
        saves: 188,
        engagementRate: "8.7%",
      },
      {
        id: 2,
        platform: "Facebook",
        assetName: "Workshop Event Post",
        date: "2026-03-10",
        impressions: 21400,
        reach: 16620,
        clicks: 1360,
        likes: 450,
        comments: 84,
        shares: 140,
        saves: 80,
        engagementRate: "7.9%",
      },
      {
        id: 3,
        platform: "LinkedIn",
        assetName: "Money Habits Article",
        date: "2026-03-12",
        impressions: 9400,
        reach: 7180,
        clicks: 740,
        likes: 230,
        comments: 26,
        shares: 31,
        saves: 18,
        engagementRate: "8.2%",
      },
      {
        id: 4,
        platform: "Email",
        assetName: "Budget Basics Newsletter",
        date: "2026-03-13",
        impressions: 11200,
        reach: 11200,
        clicks: 780,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        engagementRate: "7.0%",
      },
      {
        id: 5,
        platform: "Website",
        assetName: "Budget Resource Hub",
        date: "2026-03-14",
        impressions: 8700,
        reach: 6400,
        clicks: 610,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        engagementRate: "6.1%",
      },
    ],
    goalsProgress: {
      goal: "Drive workshop signups through campaign content",
      current: 746,
      target: 900,
      unit: "signups",
    },
    recentActivity: [
      {
        id: 1,
        title: "New ad creative approved",
        detail: "Carousel variant C approved for Facebook launch.",
        time: "2 hours ago",
      },
      {
        id: 2,
        title: "QR code updated",
        detail: "Workshop poster QR redirected to latest registration page.",
        time: "Yesterday",
      },
      {
        id: 3,
        title: "Short-link split test closed",
        detail: "Variant B delivered 17% higher CTR and is now primary.",
        time: "2 days ago",
      },
    ],
    notes: [
      "Budget workshop signups spike when a testimonial clip is posted within 24 hours.",
      "Need refreshed hero image for spring update before next email send.",
    ],
  },
  {
    slug: "planning-for-tomorrow",
    title: "Planning for Tomorrow",
    objective:
      "Increase long-term planning consult bookings and move users into retirement readiness flows.",
    ownerTeam: "Marketing Team - Financial Planning",
    status: "On Track",
    dateRange: "Feb 01, 2026 - Jul 15, 2026",
    healthScore: 91,
    topPerformingAsset: "Retirement Roadmap Video",
    kpis: {
      impressions: 201900,
      urlClicks: 11430,
      qrScans: 2202,
      engagements: 15703,
      goalCompletion: 82,
      conversions: 312,
    },
    performanceGraph: [
      { label: "Week 1", urlClicks: 1500, qrScans: 300, impressions: 24400, engagements: 1840 },
      { label: "Week 2", urlClicks: 1760, qrScans: 350, impressions: 27800, engagements: 2190 },
      { label: "Week 3", urlClicks: 1910, qrScans: 372, impressions: 30900, engagements: 2400 },
      { label: "Week 4", urlClicks: 2150, qrScans: 430, impressions: 33600, engagements: 2760 },
      { label: "Week 5", urlClicks: 2100, qrScans: 395, impressions: 33100, engagements: 2680 },
      { label: "Week 6", urlClicks: 2010, qrScans: 355, impressions: 32100, engagements: 2833 },
    ],
    urlLinksReport: [
      {
        id: 1,
        linkName: "Future Planner Toolkit",
        destinationUrl: "https://pbucc.org/tools/future-planner",
        slug: "pft-toolkit",
        platformSource: "Email",
        clicks: 3210,
        ctr: "5.9%",
        createdDate: "2026-02-06",
        lastActivity: "Today",
      },
      {
        id: 2,
        linkName: "Retirement FAQ",
        destinationUrl: "https://pbucc.org/resources/retirement-faq",
        slug: "pft-retire-faq",
        platformSource: "LinkedIn",
        clicks: 2680,
        ctr: "4.8%",
        createdDate: "2026-02-09",
        lastActivity: "Yesterday",
      },
      {
        id: 3,
        linkName: "Advisor Session",
        destinationUrl: "https://pbucc.org/book/advisor-session",
        slug: "pft-session",
        platformSource: "Facebook",
        clicks: 2270,
        ctr: "4.2%",
        createdDate: "2026-02-11",
        lastActivity: "2 days ago",
      },
    ],
    qrCodesReport: [
      {
        id: 1,
        qrName: "Seminar QR",
        linkedDestination: "Planning Seminar Registration",
        usageType: "print",
        totalScans: 690,
        uniqueScans: 508,
        createdDate: "2026-02-03",
        lastActivity: "Yesterday",
      },
      {
        id: 2,
        qrName: "YouTube QR",
        linkedDestination: "Retirement Roadmap",
        usageType: "digital",
        totalScans: 522,
        uniqueScans: 398,
        createdDate: "2026-02-14",
        lastActivity: "6 hours ago",
      },
    ],
    socialPlatformSummary: [
      { platform: "Instagram", impressions: 67400, clicks: 3780, engagementRate: "8.1%" },
      { platform: "Facebook", impressions: 81300, clicks: 4490, engagementRate: "7.4%" },
      { platform: "LinkedIn", impressions: 53200, clicks: 3160, engagementRate: "8.0%" },
      { platform: "Email", impressions: 29500, clicks: 1690, engagementRate: "6.4%" },
      { platform: "Website", impressions: 21300, clicks: 1310, engagementRate: "5.6%" },
    ],
    socialDetails: [
      {
        id: 1,
        platform: "Instagram",
        assetName: "Roadmap Reel",
        date: "2026-03-05",
        impressions: 15200,
        reach: 11840,
        clicks: 910,
        likes: 420,
        comments: 52,
        shares: 81,
        saves: 143,
        engagementRate: "8.9%",
      },
      {
        id: 2,
        platform: "Facebook",
        assetName: "Planning Webinar Promo",
        date: "2026-03-08",
        impressions: 16800,
        reach: 13210,
        clicks: 970,
        likes: 350,
        comments: 61,
        shares: 108,
        saves: 69,
        engagementRate: "7.8%",
      },
      {
        id: 3,
        platform: "LinkedIn",
        assetName: "Advisor Q&A Clip",
        date: "2026-03-09",
        impressions: 12100,
        reach: 8800,
        clicks: 730,
        likes: 260,
        comments: 34,
        shares: 39,
        saves: 20,
        engagementRate: "8.3%",
      },
      {
        id: 4,
        platform: "Email",
        assetName: "Retirement Checklist Send",
        date: "2026-03-11",
        impressions: 9800,
        reach: 9800,
        clicks: 620,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        engagementRate: "6.3%",
      },
      {
        id: 5,
        platform: "Website",
        assetName: "Planning Resource Hub",
        date: "2026-03-12",
        impressions: 7400,
        reach: 5610,
        clicks: 470,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        engagementRate: "5.8%",
      },
    ],
    goalsProgress: {
      goal: "Increase advisor-session bookings",
      current: 312,
      target: 380,
      unit: "bookings",
    },
    recentActivity: [
      {
        id: 1,
        title: "Video thumbnail refreshed",
        detail: "Updated title overlay to improve watch-through rate.",
        time: "5 hours ago",
      },
      {
        id: 2,
        title: "Email audience expanded",
        detail: "Added planning newsletter segment from member services.",
        time: "Yesterday",
      },
      {
        id: 3,
        title: "Campaign benchmark updated",
        detail: "Goal adjusted based on improved mid-campaign pace.",
        time: "3 days ago",
      },
    ],
    notes: [
      "LinkedIn Q&A posts continue to outperform static advisor graphics.",
      "Need clearer CTA copy on advisor booking confirmation screen.",
    ],
  },
  {
    slug: "health-wellbeing",
    title: "Health & Wellbeing",
    objective:
      "Promote healthy habits resources and improve recurring engagement with wellness content.",
    ownerTeam: "Marketing Team - Wellness Initiatives",
    status: "Monitoring",
    dateRange: "Mar 05, 2026 - Aug 20, 2026",
    healthScore: 74,
    topPerformingAsset: "Wellness Habits Carousel",
    kpis: {
      impressions: 176200,
      urlClicks: 8960,
      qrScans: 1640,
      engagements: 11090,
      goalCompletion: 64,
      conversions: 229,
    },
    performanceGraph: [
      { label: "Week 1", urlClicks: 1180, qrScans: 240, impressions: 21000, engagements: 1480 },
      { label: "Week 2", urlClicks: 1380, qrScans: 270, impressions: 24500, engagements: 1740 },
      { label: "Week 3", urlClicks: 1510, qrScans: 301, impressions: 27600, engagements: 1950 },
      { label: "Week 4", urlClicks: 1640, qrScans: 330, impressions: 28900, engagements: 2110 },
      { label: "Week 5", urlClicks: 1660, qrScans: 262, impressions: 28200, engagements: 1880 },
      { label: "Week 6", urlClicks: 1590, qrScans: 237, impressions: 26000, engagements: 1930 },
    ],
    urlLinksReport: [
      {
        id: 1,
        linkName: "Daily Wellness Guide",
        destinationUrl: "https://pbucc.org/wellness/daily-guide",
        slug: "hw-daily",
        platformSource: "Instagram",
        clicks: 2480,
        ctr: "4.3%",
        createdDate: "2026-03-08",
        lastActivity: "Today",
      },
      {
        id: 2,
        linkName: "Stress Check Tool",
        destinationUrl: "https://pbucc.org/wellness/stress-check",
        slug: "hw-stress",
        platformSource: "Email",
        clicks: 2110,
        ctr: "5.1%",
        createdDate: "2026-03-12",
        lastActivity: "Yesterday",
      },
      {
        id: 3,
        linkName: "Nutrition Basics",
        destinationUrl: "https://pbucc.org/wellness/nutrition-basics",
        slug: "hw-nutrition",
        platformSource: "Facebook",
        clicks: 1895,
        ctr: "3.9%",
        createdDate: "2026-03-20",
        lastActivity: "4 days ago",
      },
    ],
    qrCodesReport: [
      {
        id: 1,
        qrName: "Clinic Poster QR",
        linkedDestination: "Wellness Checklist",
        usageType: "print",
        totalScans: 442,
        uniqueScans: 310,
        createdDate: "2026-03-15",
        lastActivity: "3 days ago",
      },
      {
        id: 2,
        qrName: "Story Swipe QR",
        linkedDestination: "Stress Check Tool",
        usageType: "digital",
        totalScans: 328,
        uniqueScans: 279,
        createdDate: "2026-03-19",
        lastActivity: "8 hours ago",
      },
    ],
    socialPlatformSummary: [
      { platform: "Instagram", impressions: 72100, clicks: 3840, engagementRate: "7.9%" },
      { platform: "Facebook", impressions: 67600, clicks: 3180, engagementRate: "6.4%" },
      { platform: "LinkedIn", impressions: 36500, clicks: 1940, engagementRate: "5.8%" },
      { platform: "Email", impressions: 24100, clicks: 1220, engagementRate: "5.1%" },
      { platform: "Website", impressions: 18700, clicks: 940, engagementRate: "4.7%" },
    ],
    socialDetails: [
      {
        id: 1,
        platform: "Instagram",
        assetName: "Morning Routine Reel",
        date: "2026-03-16",
        impressions: 13600,
        reach: 10440,
        clicks: 760,
        likes: 390,
        comments: 43,
        shares: 69,
        saves: 138,
        engagementRate: "8.0%",
      },
      {
        id: 2,
        platform: "Facebook",
        assetName: "Wellness Challenge Post",
        date: "2026-03-17",
        impressions: 11800,
        reach: 9010,
        clicks: 590,
        likes: 270,
        comments: 38,
        shares: 54,
        saves: 52,
        engagementRate: "6.8%",
      },
      {
        id: 3,
        platform: "LinkedIn",
        assetName: "Mental Fitness Article",
        date: "2026-03-18",
        impressions: 7100,
        reach: 5060,
        clicks: 350,
        likes: 140,
        comments: 21,
        shares: 18,
        saves: 9,
        engagementRate: "5.9%",
      },
      {
        id: 4,
        platform: "Email",
        assetName: "Weekly Health Digest",
        date: "2026-03-20",
        impressions: 8300,
        reach: 8300,
        clicks: 430,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        engagementRate: "5.2%",
      },
      {
        id: 5,
        platform: "Website",
        assetName: "Hydration Tracker Page",
        date: "2026-03-21",
        impressions: 5400,
        reach: 3900,
        clicks: 260,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        engagementRate: "4.8%",
      },
    ],
    goalsProgress: {
      goal: "Improve monthly wellness newsletter CTR",
      current: 4.2,
      target: 5,
      unit: "% CTR",
    },
    recentActivity: [
      {
        id: 1,
        title: "Engagement dip flagged",
        detail: "Performance dipped on week-5 posts for Facebook only.",
        time: "Today",
      },
      {
        id: 2,
        title: "Creative variant queued",
        detail: "New reel edit prepared for next review round.",
        time: "Yesterday",
      },
      {
        id: 3,
        title: "Source mix adjusted",
        detail: "Shifted 20% budget from static ads to reels.",
        time: "4 days ago",
      },
    ],
    notes: [
      "Instagram saves are strong, but Facebook shares have plateaued.",
      "Test shorter captions for wellness challenge content next week.",
    ],
  },
  {
    slug: "answering-your-call",
    title: "Answering Your Call",
    objective:
      "Grow volunteer awareness and move interested members from story content to signup pathways.",
    ownerTeam: "Marketing Team - Outreach",
    status: "On Track",
    dateRange: "Jan 05, 2026 - Dec 31, 2026",
    healthScore: 86,
    topPerformingAsset: "Volunteer Testimonial Story",
    kpis: {
      impressions: 244060,
      urlClicks: 12220,
      qrScans: 2940,
      engagements: 17430,
      goalCompletion: 87,
      conversions: 521,
    },
    performanceGraph: [
      { label: "Week 1", urlClicks: 1520, qrScans: 320, impressions: 28500, engagements: 2100 },
      { label: "Week 2", urlClicks: 1810, qrScans: 410, impressions: 33200, engagements: 2500 },
      { label: "Week 3", urlClicks: 2140, qrScans: 480, impressions: 36700, engagements: 2980 },
      { label: "Week 4", urlClicks: 2370, qrScans: 592, impressions: 40100, engagements: 3250 },
      { label: "Week 5", urlClicks: 2290, qrScans: 580, impressions: 39200, engagements: 3200 },
      { label: "Week 6", urlClicks: 2090, qrScans: 558, impressions: 36360, engagements: 3400 },
    ],
    urlLinksReport: [
      {
        id: 1,
        linkName: "Volunteer Signup",
        destinationUrl: "https://pbucc.org/serve/volunteer-signup",
        slug: "ayc-volunteer",
        platformSource: "Instagram",
        clicks: 4120,
        ctr: "6.1%",
        createdDate: "2026-01-09",
        lastActivity: "1 hour ago",
      },
      {
        id: 2,
        linkName: "Service Stories",
        destinationUrl: "https://pbucc.org/serve/stories",
        slug: "ayc-stories",
        platformSource: "Facebook",
        clicks: 3080,
        ctr: "5.2%",
        createdDate: "2026-01-17",
        lastActivity: "Yesterday",
      },
      {
        id: 3,
        linkName: "Interest Form",
        destinationUrl: "https://pbucc.org/serve/interest-form",
        slug: "ayc-interest",
        platformSource: "Email",
        clicks: 2420,
        ctr: "4.6%",
        createdDate: "2026-01-22",
        lastActivity: "2 days ago",
      },
    ],
    qrCodesReport: [
      {
        id: 1,
        qrName: "Lobby Banner QR",
        linkedDestination: "Volunteer Signup",
        usageType: "print",
        totalScans: 1110,
        uniqueScans: 770,
        createdDate: "2026-01-08",
        lastActivity: "Yesterday",
      },
      {
        id: 2,
        qrName: "Volunteer Reel QR",
        linkedDestination: "Service Stories",
        usageType: "digital",
        totalScans: 660,
        uniqueScans: 511,
        createdDate: "2026-01-28",
        lastActivity: "6 hours ago",
      },
    ],
    socialPlatformSummary: [
      { platform: "Instagram", impressions: 90200, clicks: 4650, engagementRate: "8.4%" },
      { platform: "Facebook", impressions: 107000, clicks: 5220, engagementRate: "7.0%" },
      { platform: "LinkedIn", impressions: 46860, clicks: 2350, engagementRate: "6.5%" },
      { platform: "Email", impressions: 32100, clicks: 1680, engagementRate: "5.8%" },
      { platform: "Website", impressions: 27600, clicks: 1410, engagementRate: "5.1%" },
    ],
    socialDetails: [
      {
        id: 1,
        platform: "Instagram",
        assetName: "Volunteer Testimonial Story",
        date: "2026-03-07",
        impressions: 19400,
        reach: 15100,
        clicks: 1090,
        likes: 610,
        comments: 70,
        shares: 116,
        saves: 126,
        engagementRate: "9.1%",
      },
      {
        id: 2,
        platform: "Facebook",
        assetName: "Serve Weekend Promo",
        date: "2026-03-09",
        impressions: 22100,
        reach: 16820,
        clicks: 1160,
        likes: 470,
        comments: 80,
        shares: 142,
        saves: 72,
        engagementRate: "7.8%",
      },
      {
        id: 3,
        platform: "LinkedIn",
        assetName: "Impact Recap Carousel",
        date: "2026-03-10",
        impressions: 9600,
        reach: 7000,
        clicks: 520,
        likes: 210,
        comments: 28,
        shares: 24,
        saves: 10,
        engagementRate: "6.9%",
      },
      {
        id: 4,
        platform: "Email",
        assetName: "Volunteer Spotlight Email",
        date: "2026-03-11",
        impressions: 10600,
        reach: 10600,
        clicks: 560,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        engagementRate: "5.3%",
      },
      {
        id: 5,
        platform: "Website",
        assetName: "Serve Hub",
        date: "2026-03-12",
        impressions: 6900,
        reach: 5100,
        clicks: 360,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        engagementRate: "5.2%",
      },
    ],
    goalsProgress: {
      goal: "Increase volunteer applications for Q2",
      current: 521,
      target: 600,
      unit: "applications",
    },
    recentActivity: [
      {
        id: 1,
        title: "Volunteer interview clip published",
        detail: "Story format posted with direct signup CTA.",
        time: "1 hour ago",
      },
      {
        id: 2,
        title: "Poster QR reorder sent",
        detail: "Updated print copies dispatched for Sunday services.",
        time: "2 days ago",
      },
      {
        id: 3,
        title: "Link routing refined",
        detail: "Fallback route added for mobile signup failures.",
        time: "4 days ago",
      },
    ],
    notes: [
      "Highest performer remains testimonial-based content with direct CTA overlays.",
      "Recommend producing one additional volunteer story asset this month.",
    ],
  },
  {
    slug: "faith-finance",
    title: "Faith & Finance",
    objective:
      "Improve replay completion and drive deeper engagement with faith-based financial guidance assets.",
    ownerTeam: "Marketing Team - Faith & Finance",
    status: "Needs Attention",
    dateRange: "Mar 01, 2026 - Sep 15, 2026",
    healthScore: 67,
    topPerformingAsset: "Faith & Finance Webinar Replay",
    kpis: {
      impressions: 158440,
      urlClicks: 7380,
      qrScans: 1302,
      engagements: 9870,
      goalCompletion: 54,
      conversions: 188,
    },
    performanceGraph: [
      { label: "Week 1", urlClicks: 1120, qrScans: 220, impressions: 20100, engagements: 1430 },
      { label: "Week 2", urlClicks: 1310, qrScans: 248, impressions: 23400, engagements: 1700 },
      { label: "Week 3", urlClicks: 1430, qrScans: 270, impressions: 25800, engagements: 1880 },
      { label: "Week 4", urlClicks: 1340, qrScans: 226, impressions: 24700, engagements: 1650 },
      { label: "Week 5", urlClicks: 1120, qrScans: 185, impressions: 22900, engagements: 1540 },
      { label: "Week 6", urlClicks: 1060, qrScans: 153, impressions: 21540, engagements: 1670 },
    ],
    urlLinksReport: [
      {
        id: 1,
        linkName: "Faith Finance Guide",
        destinationUrl: "https://pbucc.org/faith-finance/guide",
        slug: "ff-guide",
        platformSource: "Email",
        clicks: 2100,
        ctr: "4.0%",
        createdDate: "2026-03-03",
        lastActivity: "Yesterday",
      },
      {
        id: 2,
        linkName: "Webinar Replay",
        destinationUrl: "https://pbucc.org/faith-finance/webinar-replay",
        slug: "ff-replay",
        platformSource: "YouTube",
        clicks: 1960,
        ctr: "3.6%",
        createdDate: "2026-03-09",
        lastActivity: "2 days ago",
      },
      {
        id: 3,
        linkName: "Community Group Signup",
        destinationUrl: "https://pbucc.org/faith-finance/group",
        slug: "ff-group",
        platformSource: "Facebook",
        clicks: 1420,
        ctr: "2.9%",
        createdDate: "2026-03-21",
        lastActivity: "4 days ago",
      },
    ],
    qrCodesReport: [
      {
        id: 1,
        qrName: "Bulletin QR",
        linkedDestination: "Faith Finance Guide",
        usageType: "print",
        totalScans: 420,
        uniqueScans: 298,
        createdDate: "2026-03-05",
        lastActivity: "3 days ago",
      },
      {
        id: 2,
        qrName: "Promo QR",
        linkedDestination: "Webinar Replay",
        usageType: "digital",
        totalScans: 296,
        uniqueScans: 240,
        createdDate: "2026-03-16",
        lastActivity: "Yesterday",
      },
    ],
    socialPlatformSummary: [
      { platform: "Instagram", impressions: 53440, clicks: 2570, engagementRate: "6.5%" },
      { platform: "Facebook", impressions: 65200, clicks: 2910, engagementRate: "5.8%" },
      { platform: "LinkedIn", impressions: 39800, clicks: 1900, engagementRate: "5.2%" },
      { platform: "Email", impressions: 21000, clicks: 890, engagementRate: "4.2%" },
      { platform: "Website", impressions: 15300, clicks: 610, engagementRate: "3.8%" },
    ],
    socialDetails: [
      {
        id: 1,
        platform: "Instagram",
        assetName: "Replay Highlight Reel",
        date: "2026-03-15",
        impressions: 10400,
        reach: 7760,
        clicks: 540,
        likes: 260,
        comments: 27,
        shares: 35,
        saves: 58,
        engagementRate: "6.8%",
      },
      {
        id: 2,
        platform: "Facebook",
        assetName: "Faith Finance Quote Card",
        date: "2026-03-16",
        impressions: 12100,
        reach: 8860,
        clicks: 520,
        likes: 220,
        comments: 33,
        shares: 42,
        saves: 36,
        engagementRate: "5.9%",
      },
      {
        id: 3,
        platform: "LinkedIn",
        assetName: "Principles Recap Post",
        date: "2026-03-17",
        impressions: 7800,
        reach: 5610,
        clicks: 360,
        likes: 130,
        comments: 19,
        shares: 16,
        saves: 7,
        engagementRate: "5.0%",
      },
      {
        id: 4,
        platform: "Email",
        assetName: "Replay Follow-Up Email",
        date: "2026-03-18",
        impressions: 6800,
        reach: 6800,
        clicks: 250,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        engagementRate: "3.7%",
      },
      {
        id: 5,
        platform: "Website",
        assetName: "Replay Landing Page",
        date: "2026-03-19",
        impressions: 4700,
        reach: 3320,
        clicks: 180,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        engagementRate: "3.8%",
      },
    ],
    goalsProgress: {
      goal: "Grow webinar replay completion rate",
      current: 54,
      target: 70,
      unit: "% completion",
    },
    recentActivity: [
      {
        id: 1,
        title: "Health score warning",
        detail: "Campaign score dropped after engagement softness in week 5.",
        time: "Today",
      },
      {
        id: 2,
        title: "New CTA approved",
        detail: "Updated call-to-action for webinar replay clips.",
        time: "Yesterday",
      },
      {
        id: 3,
        title: "Asset audit completed",
        detail: "Underperforming carousel assets marked for refresh.",
        time: "3 days ago",
      },
    ],
    notes: [
      "Replay completion is improving on Instagram but still lagging on Email and Website.",
      "Prioritize hero copy and testimonial proof above the fold in replay landing page.",
    ],
  },
];

export function getCampaignBySlug(slug: string) {
  return ongoingCampaigns.find((campaign) => campaign.slug === slug);
}
