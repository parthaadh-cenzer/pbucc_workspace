import { type Campaign } from "@/lib/mock-campaigns";

export type CampaignChannel =
  | "Social"
  | "Email"
  | "Website"
  | "QR"
  | "Print"
  | "Events";

export type CampaignTemplate =
  | "Blank Campaign"
  | "Awareness Campaign"
  | "Engagement Campaign"
  | "Conversion Campaign"
  | "Event Campaign";

export type CampaignRecord = Omit<Campaign, "status"> & {
  id: number;
  name: string;
  description: string;
  teamName: string;
  ownerName: string;
  status: Campaign["status"] | "Draft";
  startDate: string;
  endDate: string;
  reportingPeriod: string;
  milestoneDates: string[];
  channels: CampaignChannel[];
  urls: string[];
  qrCodes: string[];
  socialPlatforms: string[];
  landingPages: string[];
  assetTags: string[];
  goals: {
    targetImpressions: number;
    targetClicks: number;
    targetQrScans: number;
    targetEngagements: number;
    targetConversions: number | null;
  };
  summaryMetrics: Array<{
    label: string;
    value: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type CreateCampaignInput = {
  template: CampaignTemplate;
  campaignName: string;
  objective: string;
  description: string;
  teamName: string;
  ownerName: string;
  status: CampaignRecord["status"];
  startDate: string;
  endDate: string;
  reportingPeriod: string;
  milestoneDates: string[];
  channels: CampaignChannel[];
  urls: string[];
  qrCodes: string[];
  socialPlatforms: string[];
  landingPages: string[];
  assetTags: string[];
  goals: CampaignRecord["goals"];
};

const defaultPerformanceGraph = [
  "Week 1",
  "Week 2",
  "Week 3",
  "Week 4",
  "Week 5",
  "Week 6",
].map((label) => ({
  label,
  urlClicks: 0,
  qrScans: 0,
  impressions: 0,
  engagements: 0,
}));

export function normalizeCampaignName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function hasDuplicateCampaignName(
  campaignName: string,
  campaigns: Array<{ name?: string; title?: string }>,
) {
  const normalizedInput = normalizeCampaignName(campaignName);

  return campaigns.some((campaign) => {
    const currentName = campaign.name ?? campaign.title ?? "";
    return normalizeCampaignName(currentName) === normalizedInput;
  });
}

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function uniqueSlug(base: string, existingSlugs: Set<string>) {
  if (!existingSlugs.has(base)) {
    return base;
  }

  let index = 2;
  while (existingSlugs.has(`${base}-${index}`)) {
    index += 1;
  }

  return `${base}-${index}`;
}

function formatDateRange(startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    return "Date range not set";
  }

  const start = new Date(startDate).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  const end = new Date(endDate).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

  return `${start} - ${end}`;
}

export function getTemplateDefaults(template: CampaignTemplate) {
  if (template === "Awareness Campaign") {
    return {
      objective: "Expand visibility and awareness among priority audiences.",
      channels: ["Social", "Website", "Email"] as CampaignChannel[],
      goals: {
        targetImpressions: 250000,
        targetClicks: 12000,
        targetQrScans: 1800,
        targetEngagements: 15000,
        targetConversions: null,
      },
    };
  }

  if (template === "Engagement Campaign") {
    return {
      objective: "Increase audience interaction and deepen content engagement.",
      channels: ["Social", "Email", "Website"] as CampaignChannel[],
      goals: {
        targetImpressions: 180000,
        targetClicks: 10000,
        targetQrScans: 1200,
        targetEngagements: 17000,
        targetConversions: null,
      },
    };
  }

  if (template === "Conversion Campaign") {
    return {
      objective: "Drive measurable conversions and campaign outcomes.",
      channels: ["Social", "Email", "Website", "QR"] as CampaignChannel[],
      goals: {
        targetImpressions: 160000,
        targetClicks: 12000,
        targetQrScans: 2000,
        targetEngagements: 13000,
        targetConversions: 600,
      },
    };
  }

  if (template === "Event Campaign") {
    return {
      objective: "Promote event attendance and participation.",
      channels: ["Social", "Email", "QR", "Print", "Events"] as CampaignChannel[],
      goals: {
        targetImpressions: 140000,
        targetClicks: 8000,
        targetQrScans: 3200,
        targetEngagements: 9000,
        targetConversions: 450,
      },
    };
  }

  return {
    objective: "",
    channels: [] as CampaignChannel[],
    goals: {
      targetImpressions: 0,
      targetClicks: 0,
      targetQrScans: 0,
      targetEngagements: 0,
      targetConversions: null,
    },
  };
}

export function createCampaignRecord(
  input: CreateCampaignInput,
  existingCampaigns: CampaignRecord[],
): CampaignRecord {
  const nowIso = new Date().toISOString();
  const existingSlugs = new Set(existingCampaigns.map((campaign) => campaign.slug));
  const normalizedCampaignName = input.campaignName.trim().replace(/\s+/g, " ");
  const baseSlug = toSlug(normalizedCampaignName);
  const slug = uniqueSlug(baseSlug, existingSlugs);
  const id =
    existingCampaigns.length > 0
      ? Math.max(...existingCampaigns.map((campaign) => campaign.id)) + 1
      : 1;

  const socialPlatforms =
    input.socialPlatforms.length > 0
      ? input.socialPlatforms
      : ["Instagram", "Facebook", "LinkedIn", "Email", "Website"];

  return {
    id,
    name: normalizedCampaignName,
    slug,
    title: normalizedCampaignName,
    objective: input.objective,
    description: input.description,
    ownerTeam: `${input.teamName} - ${input.ownerName}`,
    teamName: input.teamName,
    ownerName: input.ownerName,
    status: input.status,
    startDate: input.startDate,
    endDate: input.endDate,
    dateRange: formatDateRange(input.startDate, input.endDate),
    reportingPeriod: input.reportingPeriod,
    milestoneDates: input.milestoneDates,
    channels: input.channels,
    urls: input.urls,
    qrCodes: input.qrCodes,
    socialPlatforms,
    landingPages: input.landingPages,
    assetTags: input.assetTags,
    goals: input.goals,
    healthScore: 0,
    topPerformingAsset: "No assets yet",
    kpis: {
      impressions: 0,
      urlClicks: 0,
      qrScans: 0,
      engagements: 0,
      goalCompletion: 0,
      conversions: 0,
    },
    summaryMetrics: [
      { label: "Impressions", value: "0" },
      { label: "URL Clicks", value: "0" },
      { label: "QR Scans", value: "0" },
      { label: "Engagements", value: "0" },
      {
        label: "Goal Completion",
        value: "0%",
      },
    ],
    performanceGraph: defaultPerformanceGraph,
    urlLinksReport: input.urls.map((destinationUrl, index) => ({
      id: index + 1,
      linkName: `Campaign Link ${index + 1}`,
      destinationUrl,
      slug: `${slug}-${index + 1}`,
      platformSource: "Unassigned",
      clicks: 0,
      ctr: "0.0%",
      createdDate: nowIso.slice(0, 10),
      lastActivity: "Just now",
    })),
    qrCodesReport: input.qrCodes.map((linkedDestination, index) => ({
      id: index + 1,
      qrName: `Campaign QR ${index + 1}`,
      linkedDestination,
      usageType: "digital",
      totalScans: 0,
      uniqueScans: 0,
      createdDate: nowIso.slice(0, 10),
      lastActivity: "Just now",
    })),
    socialPlatformSummary: socialPlatforms.map((platform) => ({
      platform:
        platform === "Instagram" ||
        platform === "Facebook" ||
        platform === "LinkedIn" ||
        platform === "Email" ||
        platform === "Website"
          ? platform
          : "Website",
      impressions: 0,
      clicks: 0,
      engagementRate: "0.0%",
    })),
    socialDetails: [],
    goalsProgress: {
      goal:
        input.goals.targetConversions && input.goals.targetConversions > 0
          ? "Drive campaign conversions"
          : "Meet overall campaign KPI targets",
      current: 0,
      target:
        input.goals.targetConversions && input.goals.targetConversions > 0
          ? input.goals.targetConversions
          : input.goals.targetEngagements,
      unit:
        input.goals.targetConversions && input.goals.targetConversions > 0
          ? "conversions"
          : "engagements",
    },
    recentActivity: [
      {
        id: 1,
        title: "Campaign created",
        detail: "Initial campaign setup completed from the guided create flow.",
        time: "Just now",
      },
    ],
    notes: [
      "Initial campaign draft created. Add performance data as assets go live.",
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function normalizeSeedCampaigns(campaigns: Campaign[]): CampaignRecord[] {
  return campaigns.map((campaign, index) => {
    const splitOwnerTeam = campaign.ownerTeam.split(" - ");
    const teamName = splitOwnerTeam[0] ?? "Marketing Team";
    const ownerName = splitOwnerTeam[1] ?? "Campaign Owner";
    const summaryMetrics = [
      { label: "Impressions", value: campaign.kpis.impressions.toLocaleString() },
      { label: "URL Clicks", value: campaign.kpis.urlClicks.toLocaleString() },
      { label: "QR Scans", value: campaign.kpis.qrScans.toLocaleString() },
      { label: "Engagements", value: campaign.kpis.engagements.toLocaleString() },
      { label: "Goal Completion", value: `${campaign.kpis.goalCompletion}%` },
    ];

    return {
      ...campaign,
      id: index + 1,
      name: campaign.title,
      description: campaign.objective,
      teamName,
      ownerName,
      startDate: "",
      endDate: "",
      reportingPeriod: "",
      milestoneDates: [],
      channels: ["Social", "Email", "Website", "QR"],
      urls: campaign.urlLinksReport.map((item) => item.destinationUrl),
      qrCodes: campaign.qrCodesReport.map((item) => item.linkedDestination),
      socialPlatforms: campaign.socialPlatformSummary.map((item) => item.platform),
      landingPages: campaign.urlLinksReport.slice(0, 2).map((item) => item.destinationUrl),
      assetTags: [],
      goals: {
        targetImpressions: campaign.kpis.impressions,
        targetClicks: campaign.kpis.urlClicks,
        targetQrScans: campaign.kpis.qrScans,
        targetEngagements: campaign.kpis.engagements,
        targetConversions: campaign.kpis.conversions,
      },
      summaryMetrics,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}
