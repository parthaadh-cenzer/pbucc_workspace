import type { ShortDomain } from "@/lib/short-link-types";
import { suggestShortSlugWithCenzer } from "@/lib/short-link-cenzer";
import { prisma } from "@/lib/prisma";
import {
  assertValidSlug,
  buildShortUrl,
  buildWorkingRedirectUrl,
  normalizeDestinationUrl,
  normalizeOptionalCampaign,
  normalizeShortDomain,
  sanitizeSlugCandidate,
} from "@/lib/short-link-runtime";
import type {
  CreateShortLinkInput,
  ShortLinkListItem,
  UpdateShortLinkInput,
} from "@/lib/short-link-types";

function assertShortLinkDelegateReady() {
  const delegate = (prisma as unknown as { shortLink?: { findUnique?: unknown } }).shortLink;

  if (!delegate || typeof delegate.findUnique !== "function") {
    console.error("[Cenzer ShortLink][Prisma] Missing shortLink model delegate.", {
      prismaKeys: Object.keys(prisma as unknown as Record<string, unknown>).slice(0, 30),
    });
    throw new Error(
      "[short-link-db-model-missing] Prisma client is missing shortLink. Run prisma migrate, prisma generate, and restart the server.",
    );
  }
}

function toListItem(record: {
  id: string;
  domain: ShortDomain;
  slug: string;
  shortUrl: string;
  destination: string;
  campaign: string | null;
  clicks: number;
  createdAt: Date;
  updatedAt: Date;
}): ShortLinkListItem {
  return {
    id: record.id,
    domain: record.domain,
    slug: record.slug,
    shortUrl: record.shortUrl,
    workingRedirectUrl: buildWorkingRedirectUrl(record.domain, record.slug),
    destination: record.destination,
    campaign: record.campaign,
    clicks: record.clicks,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

async function findByDomainAndSlug(domain: ShortDomain, slug: string) {
  return prisma.shortLink.findUnique({
    where: {
      domain_slug: {
        domain,
        slug,
      },
    },
    select: { id: true },
  });
}

async function resolveUniqueSlug(input: {
  domain: ShortDomain;
  baseSlug: string;
  customLocked: boolean;
}) {
  const normalizedBase = sanitizeSlugCandidate(input.baseSlug);
  assertValidSlug(normalizedBase, input.customLocked ? "Custom slug" : "Suggested slug");

  if (input.customLocked) {
    const existing = await findByDomainAndSlug(input.domain, normalizedBase);
    if (existing) {
      throw new Error("This custom slug is already in use for the selected domain.");
    }
    return normalizedBase;
  }

  let candidate = normalizedBase;
  let suffix = 2;

  while (await findByDomainAndSlug(input.domain, candidate)) {
    const suffixText = `-${suffix}`;
    const cutLength = Math.max(3, normalizedBase.length - suffixText.length);
    candidate = `${normalizedBase.slice(0, cutLength)}${suffixText}`;
    assertValidSlug(candidate, "Suggested slug");
    suffix += 1;
  }

  return candidate;
}

export async function listShortLinks() {
  assertShortLinkDelegateReady();

  const records = await prisma.shortLink.findMany({
    orderBy: { createdAt: "desc" },
  });

  return records.map((record) =>
    toListItem({
      id: record.id,
      domain: record.domain as ShortDomain,
      slug: record.slug,
      shortUrl: record.shortUrl,
      destination: record.destination,
      campaign: record.campaign,
      clicks: record.clicks,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }),
  );
}

export async function createShortLink(input: { data: CreateShortLinkInput }) {
  assertShortLinkDelegateReady();

  const destination = normalizeDestinationUrl(input.data.destinationUrl);
  const domain = normalizeShortDomain(input.data.domain);
  const campaign = normalizeOptionalCampaign(input.data.campaign);
  const customSlug = normalizeOptionalCampaign(input.data.customSlug);

  let baseSlug = "";
  let customLocked = false;

  if (customSlug) {
    baseSlug = sanitizeSlugCandidate(customSlug);
    customLocked = true;
  } else {
    baseSlug = await suggestShortSlugWithCenzer({
      destinationUrl: destination,
      campaign,
      domain,
    });
  }

  const slug = await resolveUniqueSlug({
    domain,
    baseSlug,
    customLocked,
  });

  const shortUrl = buildShortUrl(domain, slug);

  const created = await prisma.shortLink.create({
    data: {
      domain,
      slug,
      shortUrl,
      destination,
      campaign,
    },
  });

  return toListItem({
    id: created.id,
    domain: created.domain as ShortDomain,
    slug: created.slug,
    shortUrl: created.shortUrl,
    destination: created.destination,
    campaign: created.campaign,
    clicks: created.clicks,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  });
}

export async function updateShortLink(input: {
  id: string;
  data: UpdateShortLinkInput;
}) {
  assertShortLinkDelegateReady();

  const existing = await prisma.shortLink.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    return null;
  }

  const hasDestination = Object.prototype.hasOwnProperty.call(input.data, "destinationUrl");
  const hasCampaign = Object.prototype.hasOwnProperty.call(input.data, "campaign");

  if (!hasDestination && !hasCampaign) {
    return toListItem({
      id: existing.id,
      domain: existing.domain as ShortDomain,
      slug: existing.slug,
      shortUrl: existing.shortUrl,
      destination: existing.destination,
      campaign: existing.campaign,
      clicks: existing.clicks,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    });
  }

  const updateData: {
    destination?: string;
    campaign?: string | null;
  } = {};

  if (hasDestination) {
    updateData.destination = normalizeDestinationUrl(input.data.destinationUrl ?? "");
  }

  if (hasCampaign) {
    updateData.campaign = normalizeOptionalCampaign(input.data.campaign);
  }

  const updated = await prisma.shortLink.update({
    where: { id: input.id },
    data: updateData,
  });

  return toListItem({
    id: updated.id,
    domain: updated.domain as ShortDomain,
    slug: updated.slug,
    shortUrl: updated.shortUrl,
    destination: updated.destination,
    campaign: updated.campaign,
    clicks: updated.clicks,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}

export async function deleteShortLink(id: string) {
  assertShortLinkDelegateReady();

  const existing = await prisma.shortLink.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return false;
  }

  await prisma.shortLink.delete({ where: { id } });
  return true;
}

export async function incrementShortLinkClickAndResolve(input: {
  domain?: ShortDomain | null;
  slug: string;
}) {
  assertShortLinkDelegateReady();

  try {
    if (!input.domain) {
      const candidates = await prisma.shortLink.findMany({
        where: {
          slug: input.slug,
        },
        select: {
          id: true,
          destination: true,
        },
        take: 2,
      });

      if (candidates.length !== 1) {
        return null;
      }

      const candidate = candidates[0];
      const updated = await prisma.shortLink.update({
        where: {
          id: candidate.id,
        },
        data: {
          clicks: {
            increment: 1,
          },
        },
        select: {
          destination: true,
        },
      });

      return updated.destination;
    }

    const updated = await prisma.shortLink.update({
      where: {
        domain_slug: {
          domain: input.domain,
          slug: input.slug,
        },
      },
      data: {
        clicks: {
          increment: 1,
        },
      },
      select: {
        destination: true,
      },
    });

    return updated.destination;
  } catch {
    return null;
  }
}
