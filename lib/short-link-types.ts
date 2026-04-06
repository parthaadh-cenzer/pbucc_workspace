export type ShortDomain = "PBUCC" | "EVERCALL";

export type ShortLinkListItem = {
  id: string;
  domain: ShortDomain;
  slug: string;
  shortUrl: string;
  workingRedirectUrl: string;
  destination: string;
  campaign: string | null;
  clicks: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateShortLinkInput = {
  destinationUrl: string;
  domain: ShortDomain;
  campaign?: string | null;
  customSlug?: string | null;
};

export type UpdateShortLinkInput = {
  destinationUrl?: string;
  campaign?: string | null;
};
