import { NextResponse } from "next/server";
import { applyAcceptedSuggestionsToDocx } from "@/lib/seo-checker-docx-structure";
import { createUploadDateLabel } from "@/lib/seo-checker-document";
import { deleteSeoAnalysisSession, getSeoAnalysisSession } from "@/lib/seo-checker-session-store";
import type { SeoFinalizeRequest } from "@/lib/seo-checker-types";
import { getMarketingSessionUser, unauthorized } from "@/lib/security";

export const runtime = "nodejs";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function sanitizeFileStem(fileName: string) {
  const stem = fileName.replace(/\.docx$/i, "").trim();
  const cleaned = stem.replace(/[^a-z0-9-_\s]/gi, "").replace(/\s+/g, "-");
  return cleaned.length > 0 ? cleaned : "cenzer-document";
}

export async function POST(request: Request) {
  const user = await getMarketingSessionUser();

  if (!user) {
    return unauthorized();
  }

  let body: SeoFinalizeRequest;

  try {
    body = (await request.json()) as SeoFinalizeRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (typeof body.analysisId !== "string" || body.analysisId.trim().length < 1) {
    return NextResponse.json({ error: "analysisId is required." }, { status: 400 });
  }

  if (!isStringArray(body.acceptedSuggestionIds) || !isStringArray(body.rejectedSuggestionIds)) {
    return NextResponse.json(
      { error: "Accepted and rejected suggestion id arrays are required." },
      { status: 400 },
    );
  }

  const sessionEntry = getSeoAnalysisSession(body.analysisId);

  if (!sessionEntry) {
    return NextResponse.json(
      {
        error: "Analysis session not found or expired. Please upload the document again.",
      },
      { status: 410 },
    );
  }

  const analysis = sessionEntry.analysis;
  const acceptedSet = new Set(body.acceptedSuggestionIds);
  const rejectedSet = new Set(body.rejectedSuggestionIds);

  const acceptedSuggestions = analysis.suggestions.filter((suggestion) => acceptedSet.has(suggestion.id));
  const rejectedSuggestions = analysis.suggestions.filter((suggestion) => rejectedSet.has(suggestion.id));

  if (acceptedSuggestions.length + rejectedSuggestions.length !== analysis.suggestions.length) {
    return NextResponse.json(
      { error: "Every suggestion must be accepted or rejected before download." },
      { status: 400 },
    );
  }

  const timestamp = createUploadDateLabel(new Date());

  try {
    const generated = await applyAcceptedSuggestionsToDocx({
      originalDocxBuffer: sessionEntry.originalDocxBuffer,
      analysis,
      acceptedSuggestionIds: body.acceptedSuggestionIds,
      rejectedSuggestionIds: body.rejectedSuggestionIds,
      projectedScore: body.projectedScore,
      timestamp,
    });

    deleteSeoAnalysisSession(body.analysisId);

    const responseBody = new Uint8Array(generated.buffer);
    const fileName = `${sanitizeFileStem(analysis.fileName)}-cenzer-seo-final.docx`;

    return new NextResponse(responseBody, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "x-cenzer-file-name": fileName,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[Cenzer SEO][Finalize] Failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId: user.id,
    });

    return NextResponse.json(
      {
        error: "Failed to generate final .docx output.",
        stage: "docx-finalize",
      },
      { status: 500 },
    );
  }
}
