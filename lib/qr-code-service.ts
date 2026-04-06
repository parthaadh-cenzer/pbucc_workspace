import { prisma } from "@/lib/prisma";
import {
  buildRedirectUrl,
  createQrPngBuffer,
  createQrPngDataUrl,
  createRedirectSlugCandidate,
  normalizeHexColor,
  normalizeHttpUrl,
  normalizeOptionalCampaign,
} from "@/lib/qr-code-runtime";
import type {
  CreateQrRedirectInput,
  QrRedirectListItem,
  UpdateQrRedirectInput,
} from "@/lib/qr-code-types";
import { generateUtmUrlWithClaude } from "@/lib/utm-generator";

type QrRedirectRecord = {
  id: string;
  slug: string;
  originalUrl: string;
  utmUrl: string;
  destination: string;
  campaign: string | null;
  color: string;
  scans: number;
  createdAt: Date;
  updatedAt: Date;
};

type QrRedirectUpdateData = {
  campaign?: string | null;
  destination?: string;
  utmUrl?: string;
};

function assertQrDelegateReady() {
  const delegate = (prisma as unknown as { qrRedirect?: { findUnique?: unknown } }).qrRedirect;

  if (!delegate || typeof delegate.findUnique !== "function") {
    console.error("[Cenzer QR][Prisma] Missing qrRedirect model delegate.", {
      prismaKeys: Object.keys(prisma as unknown as Record<string, unknown>).slice(0, 30),
    });
    throw new Error(
      "[qr-db-model-missing] Prisma client is missing qrRedirect. Run prisma migrate, prisma generate, and restart the server.",
    );
  }
}

async function createUniqueSlug() {
  assertQrDelegateReady();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const slug = createRedirectSlugCandidate();
    const existing = await prisma.qrRedirect.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }
  }

  throw new Error("Unable to allocate a unique redirect slug.");
}

async function toListItem(record: QrRedirectRecord, origin: string): Promise<QrRedirectListItem> {
  const redirectUrl = buildRedirectUrl(origin, record.slug);

  // The QR image stays unchanged because it encodes only this stable redirect URL.
  // Destination edits update the redirect record, not the slug that the QR points to.
  const qrCodeDataUrl = await createQrPngDataUrl({
    value: redirectUrl,
    color: normalizeHexColor(record.color),
  });

  return {
    id: record.id,
    slug: record.slug,
    redirectUrl,
    originalUrl: record.originalUrl,
    utmUrl: record.utmUrl,
    destination: record.destination,
    campaign: record.campaign,
    color: record.color,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    scans: record.scans,
    qrCodeDataUrl,
  };
}

export async function listQrRedirects(input: { origin: string }) {
  assertQrDelegateReady();
  const records = await prisma.qrRedirect.findMany({
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(records.map((record) => toListItem(record, input.origin)));
}

export async function createQrRedirect(input: {
  origin: string;
  data: CreateQrRedirectInput;
  requestId?: string;
}) {
  assertQrDelegateReady();
  const destinationUrl = normalizeHttpUrl(input.data.destinationUrl, "Destination URL");
  const color = normalizeHexColor(input.data.color);
  const campaign = normalizeOptionalCampaign(input.data.campaign);
  const utmUrl = await generateUtmUrlWithClaude({
    destinationUrl,
    campaign,
    requestId: input.requestId,
  });

  const slug = await createUniqueSlug();

  const created = await prisma.qrRedirect.create({
    data: {
      slug,
      originalUrl: destinationUrl,
      utmUrl,
      destination: utmUrl,
      campaign,
      color,
    },
  });

  return toListItem(created, input.origin);
}

export async function updateQrRedirect(input: {
  id: string;
  origin: string;
  data: UpdateQrRedirectInput;
  requestId?: string;
}) {
  assertQrDelegateReady();
  const existing = await prisma.qrRedirect.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    return null;
  }

  const hasDestination = Object.prototype.hasOwnProperty.call(input.data, "destinationUrl");
  const hasCampaign = Object.prototype.hasOwnProperty.call(input.data, "campaign");
  const hasUtm = Object.prototype.hasOwnProperty.call(input.data, "utmUrl");

  if (!hasDestination && !hasCampaign && !hasUtm) {
    return toListItem(existing, input.origin);
  }

  const updateData: QrRedirectUpdateData = {};

  const nextCampaign = hasCampaign
    ? normalizeOptionalCampaign(input.data.campaign)
    : existing.campaign;

  if (hasCampaign) {
    updateData.campaign = nextCampaign;
  }

  if (hasDestination) {
    const nextDestination = normalizeHttpUrl(input.data.destinationUrl ?? "", "Destination URL");
    updateData.destination = nextDestination;
  }

  if (hasUtm) {
    const nextUtm = normalizeHttpUrl(input.data.utmUrl ?? "", "UTM URL");
    updateData.utmUrl = nextUtm;
    updateData.destination = nextUtm;
  } else if (hasDestination || hasCampaign) {
    const utmBase = hasDestination
      ? normalizeHttpUrl(input.data.destinationUrl ?? "", "Destination URL")
      : existing.originalUrl;

    const regeneratedUtm = await generateUtmUrlWithClaude({
      destinationUrl: utmBase,
      campaign: nextCampaign,
      requestId: input.requestId,
    });

    updateData.utmUrl = regeneratedUtm;
    updateData.destination = regeneratedUtm;
  }

  const updated = await prisma.qrRedirect.update({
    where: { id: existing.id },
    data: updateData,
  });

  return toListItem(updated, input.origin);
}

export async function incrementScanAndResolveDestination(slug: string) {
  assertQrDelegateReady();

  try {
    const updated = await prisma.qrRedirect.update({
      where: { slug },
      data: {
        scans: {
          increment: 1,
        },
      },
      select: {
        destination: true,
      },
    }) as { destination: string };

    return updated.destination;
  } catch (error) {
    console.error("[Cenzer QR][Redirect] Failed to resolve destination.", {
      slug,
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

export async function renderQrDownload(input: {
  id: string;
  origin: string;
  color: string;
}) {
  assertQrDelegateReady();
  const normalizedColor = normalizeHexColor(input.color);

  const existing = await prisma.qrRedirect.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    return null;
  }

  const redirectUrl = buildRedirectUrl(input.origin, existing.slug);
  const imageBuffer = await createQrPngBuffer({
    value: redirectUrl,
    color: normalizedColor,
  });

  return {
    fileName: `cenzer-qr-${existing.slug}-${normalizedColor.slice(1).toLowerCase()}.png`,
    imageBuffer,
  };
}
