export type QrRedirectListItem = {
  id: string;
  slug: string;
  redirectUrl: string;
  originalUrl: string;
  utmUrl: string;
  destination: string;
  campaign: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
  scans: number;
  qrCodeDataUrl: string;
};

export type CreateQrRedirectInput = {
  destinationUrl: string;
  color: string;
  campaign?: string | null;
};

export type UpdateQrRedirectInput = {
  destinationUrl?: string;
  campaign?: string | null;
  utmUrl?: string;
};
