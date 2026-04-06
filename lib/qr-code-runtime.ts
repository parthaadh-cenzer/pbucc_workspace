import { randomBytes } from "crypto";
import QRCode from "qrcode";
import { normalizeQrColor } from "@/lib/qr-color-options";

function toCampaignSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function normalizeOptionalCampaign(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeHttpUrl(value: string, fieldName: string) {
  const trimmed = value.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${fieldName} must be a valid URL.`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${fieldName} must use http or https.`);
  }

  return parsed.toString();
}

export function normalizeHexColor(value: string) {
  return normalizeQrColor(value);
}

export function createRedirectSlugCandidate() {
  return randomBytes(5).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
}

export function buildRedirectUrl(origin: string, slug: string) {
  return `${origin.replace(/\/$/, "")}/r/${slug}`;
}

export function buildDeterministicUtmUrl(destinationUrl: string, campaign?: string | null) {
  const url = new URL(destinationUrl);
  url.searchParams.set("utm_source", "cenzer");
  url.searchParams.set("utm_medium", "qr");

  const campaignSlug = campaign ? toCampaignSlug(campaign) : "";
  if (campaignSlug) {
    url.searchParams.set("utm_campaign", campaignSlug);
  }

  return url.toString();
}

export async function createQrPngDataUrl(input: { value: string; color: string }) {
  const { value, color } = input;

  return QRCode.toDataURL(value, {
    type: "image/png",
    margin: 1,
    width: 420,
    color: {
      dark: color,
      light: "#FFFFFF",
    },
  });
}

export async function createQrPngBuffer(input: { value: string; color: string }) {
  const { value, color } = input;

  return QRCode.toBuffer(value, {
    type: "png",
    margin: 1,
    width: 420,
    color: {
      dark: color,
      light: "#FFFFFF",
    },
  });
}
