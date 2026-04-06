import type { ShortDomain } from "@/lib/short-link-types";

export const SHORT_DOMAIN_OPTIONS = [
  {
    value: "PBUCC",
    label: "PBUCC",
    host: "www.pbucc.org",
  },
  {
    value: "EVERCALL",
    label: "Evercall",
    host: "www.evercall.org",
  },
] as const;

const SHORT_DOMAIN_SET = new Set<ShortDomain>(
  SHORT_DOMAIN_OPTIONS.map((option) => option.value),
);

const RESERVED_SLUGS = new Set([
  "api",
  "auth",
  "marketing",
  "r",
  "s",
  "favicon",
  "favicon-ico",
  "robots",
  "sitemap",
  "_next",
]);

const MAX_SLUG_LENGTH = 48;

export function isShortDomain(value: string): value is ShortDomain {
  return SHORT_DOMAIN_SET.has(value as ShortDomain);
}

export function normalizeShortDomain(value: string) {
  const normalized = value.trim().toUpperCase();

  if (!isShortDomain(normalized)) {
    throw new Error("Domain must be either PBUCC or EVERCALL.");
  }

  return normalized;
}

export function getShortDomainHost(domain: ShortDomain) {
  return domain === "PBUCC" ? "www.pbucc.org" : "www.evercall.org";
}

export function buildShortUrl(domain: ShortDomain, slug: string) {
  return `https://${getShortDomainHost(domain)}/${slug}`;
}

export function buildWorkingRedirectUrl(domain: ShortDomain, slug: string) {
  return `/s/${slug}?domain=${encodeURIComponent(domain)}`;
}

export function normalizeDestinationUrl(value: string, fieldName = "Destination URL") {
  const trimmed = value.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${fieldName} must be a valid URL.`);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${fieldName} must use http or https.`);
  }

  return parsed.toString();
}

export function normalizeOptionalCampaign(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function trimToMaxSlugLength(value: string) {
  return value.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
}

export function sanitizeSlugCandidate(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return trimToMaxSlugLength(normalized);
}

export function assertValidSlug(slug: string, fieldName = "Slug") {
  if (slug.length < 3 || slug.length > MAX_SLUG_LENGTH) {
    throw new Error(`${fieldName} must be between 3 and ${MAX_SLUG_LENGTH} characters.`);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`${fieldName} may only contain lowercase letters, numbers, and hyphens.`);
  }

  if (RESERVED_SLUGS.has(slug)) {
    throw new Error(`${fieldName} is reserved. Please choose a different slug.`);
  }
}

export function fallbackSlugFromContext(input: {
  destinationUrl: string;
  campaign: string | null;
  domain: ShortDomain;
}) {
  const destination = new URL(input.destinationUrl);
  const pathToken = destination.pathname
    .split("/")
    .map((segment) => segment.trim())
    .find((segment) => segment.length > 2);

  const campaignToken = input.campaign
    ? sanitizeSlugCandidate(input.campaign).split("-").slice(0, 2).join("-")
    : "";

  const domainToken = input.domain === "PBUCC" ? "pbucc" : "evercall";

  const candidate = sanitizeSlugCandidate(
    [campaignToken, pathToken ?? destination.hostname.split(".")[0], domainToken]
      .filter(Boolean)
      .join("-"),
  );

  const safe = candidate || `link-${domainToken}`;
  return trimToMaxSlugLength(safe);
}

export function resolveDomainFromRequest(input: {
  request: Request;
  queryDomain?: string | null;
}) {
  const forwardedHost = input.request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim()
    ?.toLowerCase();
  const host = forwardedHost || input.request.headers.get("host")?.toLowerCase() || "";

  if (host.includes("pbucc.org")) {
    return "PBUCC" as const;
  }

  if (host.includes("evercall.org")) {
    return "EVERCALL" as const;
  }

  if (input.queryDomain && isShortDomain(input.queryDomain.trim().toUpperCase())) {
    return input.queryDomain.trim().toUpperCase() as ShortDomain;
  }

  return null;
}
