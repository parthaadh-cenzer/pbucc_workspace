import { NextResponse } from "next/server";
import { applyAcceptedSuggestionsToDocx } from "@/lib/seo-checker-docx-structure";
import { createUploadDateLabel } from "@/lib/seo-checker-document";
import { deleteSeoAnalysisSession, getSeoAnalysisSession } from "@/lib/seo-checker-session-store";
import type { SeoFinalizeRequest } from "@/lib/seo-checker-types";

export const runtime = "nodejs";

type FinalizeFailureCause =
  | "invalid-request"
  | "session-missing"
  | "template-missing"
  | "malformed-data"
  | "unsupported-content"
  | "buffer-response"
  | "runtime-restriction"
  | "unknown";

type FinalizeFailurePhase =
  | "input-validation"
  | "session-load"
  | "template-load"
  | "document-build"
  | "buffer-create"
  | "response-return"
  | "unknown";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function sanitizeFileStem(fileName: string) {
  const stem = fileName.replace(/\.docx$/i, "").trim();
  const cleaned = stem.replace(/[^a-z0-9-_\s]/gi, "").replace(/\s+/g, "-");
  return cleaned.length > 0 ? cleaned : "cenzer-document";
}

function parseStageFromErrorMessage(message: string) {
  const explicitStage = message.match(/\[stage=([^\]]+)\]/i)?.[1];
  if (explicitStage) {
    return explicitStage;
  }

  return "docx-finalize";
}

function mapFinalizeFailurePhase(stage: string): FinalizeFailurePhase {
  if (stage === "docx-request-parse" || stage === "docx-validation") {
    return "input-validation";
  }

  if (stage === "docx-session-load") {
    return "session-load";
  }

  if (stage === "docx-template-load") {
    return "template-load";
  }

  if (stage === "docx-document-update") {
    return "document-build";
  }

  if (stage === "docx-buffer-generate") {
    return "buffer-create";
  }

  if (stage === "docx-response") {
    return "response-return";
  }

  return "unknown";
}

function classifyFinalizeFailureCause(input: { stage: string; message: string }): FinalizeFailureCause {
  const { stage, message } = input;
  const normalizedMessage = message.toLowerCase();

  if (stage === "docx-request-parse" || stage === "docx-validation") {
    return "invalid-request";
  }

  if (stage === "docx-session-load") {
    return "session-missing";
  }

  if (stage === "docx-template-load") {
    return "template-missing";
  }

  if (stage === "docx-document-update") {
    return "malformed-data";
  }

  if (stage === "docx-buffer-generate" || stage === "docx-response") {
    return "buffer-response";
  }

  if (
    normalizedMessage.includes("invalid xml") ||
    normalizedMessage.includes("unsupported") ||
    normalizedMessage.includes("character")
  ) {
    return "unsupported-content";
  }

  if (
    normalizedMessage.includes("read-only") ||
    normalizedMessage.includes("permission") ||
    normalizedMessage.includes("eacces") ||
    normalizedMessage.includes("erofs")
  ) {
    return "runtime-restriction";
  }

  if (normalizedMessage.includes("session") && normalizedMessage.includes("expired")) {
    return "session-missing";
  }

  return "unknown";
}

function getFinalizeErrorStatus(cause: FinalizeFailureCause, fallbackStatus: number) {
  if (cause === "invalid-request") {
    return 400;
  }

  if (cause === "session-missing") {
    return 410;
  }

  if (cause === "template-missing" || cause === "malformed-data" || cause === "unsupported-content") {
    return 422;
  }

  if (cause === "runtime-restriction") {
    return 500;
  }

  if (cause === "buffer-response") {
    return 500;
  }

  return fallbackStatus;
}

function getFinalizeUserError(cause: FinalizeFailureCause) {
  if (cause === "invalid-request") {
    return "Finalize request payload is invalid.";
  }

  if (cause === "session-missing") {
    return "Analysis session is missing or expired. Please upload the document again.";
  }

  if (cause === "template-missing") {
    return "Original Word template could not be loaded for final export.";
  }

  if (cause === "malformed-data") {
    return "Suggestion data could not be applied to the Word document.";
  }

  if (cause === "unsupported-content") {
    return "Document contains unsupported content for Word export.";
  }

  if (cause === "runtime-restriction") {
    return "Runtime constraints blocked final export processing.";
  }

  if (cause === "buffer-response") {
    return "Failed while creating or returning the final Word file buffer.";
  }

  return "Unable to generate the final Word document.";
}

function getFinalizeErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
    stack: null,
  };
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.info("[Cenzer SEO][Finalize] API route entered", {
    requestId,
    runtime,
  });

  let body: SeoFinalizeRequest;

  try {
    body = (await request.json()) as SeoFinalizeRequest;
  } catch (error) {
    const details = getFinalizeErrorDetails(error);
    console.error("[Cenzer SEO][Finalize] Request JSON parse failed", {
      requestId,
      stage: "docx-request-parse",
      errorName: details.name,
      errorMessage: details.message,
      errorStack: details.stack,
    });

    return NextResponse.json(
      {
        error: "Invalid JSON payload.",
        stage: "docx-request-parse",
        failurePhase: "input-validation",
        failureCause: "invalid-request",
        requestId,
      },
      { status: 400 },
    );
  }

  console.info("[Cenzer SEO][Finalize] Request payload received", {
    requestId,
    stage: "docx-validation",
    analysisId: body.analysisId,
    acceptedSuggestionIds: Array.isArray(body.acceptedSuggestionIds) ? body.acceptedSuggestionIds.length : null,
    rejectedSuggestionIds: Array.isArray(body.rejectedSuggestionIds) ? body.rejectedSuggestionIds.length : null,
    projectedScore: body.projectedScore,
    hasAnalysisPayload: typeof body.analysis === "object" && body.analysis !== null,
  });

  if (typeof body.analysisId !== "string" || body.analysisId.trim().length < 1) {
    return NextResponse.json(
      {
        error: "analysisId is required.",
        stage: "docx-validation",
        failurePhase: "input-validation",
        failureCause: "invalid-request",
        requestId,
      },
      { status: 400 },
    );
  }

  if (!isStringArray(body.acceptedSuggestionIds) || !isStringArray(body.rejectedSuggestionIds)) {
    return NextResponse.json(
      {
        error: "Accepted and rejected suggestion id arrays are required.",
        stage: "docx-validation",
        failurePhase: "input-validation",
        failureCause: "invalid-request",
        requestId,
      },
      { status: 400 },
    );
  }

  if (typeof body.projectedScore !== "number" || !Number.isFinite(body.projectedScore)) {
    return NextResponse.json(
      {
        error: "projectedScore must be a valid number.",
        stage: "docx-validation",
        failurePhase: "input-validation",
        failureCause: "invalid-request",
        requestId,
      },
      { status: 400 },
    );
  }

  const sessionEntry = getSeoAnalysisSession(body.analysisId);

  console.info("[Cenzer SEO][Finalize] Session lookup complete", {
    requestId,
    stage: "docx-session-load",
    found: Boolean(sessionEntry),
  });

  if (!sessionEntry) {
    return NextResponse.json(
      {
        error: "Analysis session not found or expired. Please upload the document again.",
        stage: "docx-session-load",
        failurePhase: "session-load",
        failureCause: "session-missing",
        detail: "session-not-found-or-expired",
        requestId,
      },
      { status: 410 },
    );
  }

  const analysis = sessionEntry.analysis;
  const acceptedSet = new Set(body.acceptedSuggestionIds);
  const rejectedSet = new Set(body.rejectedSuggestionIds);

  const acceptedSuggestions = analysis.suggestions.filter((suggestion) => acceptedSet.has(suggestion.id));
  const rejectedSuggestions = analysis.suggestions.filter((suggestion) => rejectedSet.has(suggestion.id));

  console.info("[Cenzer SEO][Finalize] Suggestion decision coverage", {
    requestId,
    stage: "docx-validation",
    totalSuggestions: analysis.suggestions.length,
    acceptedSuggestions: acceptedSuggestions.length,
    rejectedSuggestions: rejectedSuggestions.length,
  });

  if (acceptedSuggestions.length + rejectedSuggestions.length !== analysis.suggestions.length) {
    return NextResponse.json(
      {
        error: "Every suggestion must be accepted or rejected before download.",
        stage: "docx-validation",
        failurePhase: "input-validation",
        failureCause: "invalid-request",
        requestId,
      },
      { status: 400 },
    );
  }

  const timestamp = createUploadDateLabel(new Date());

  console.info("[Cenzer SEO][Finalize] Document generation started", {
    requestId,
    stage: "docx-template-load",
    fileName: analysis.fileName,
    originalBufferBytes: sessionEntry.originalDocxBuffer.byteLength,
    note: "Generation runs in-memory only (no filesystem writes).",
  });

  try {
    const generated = await applyAcceptedSuggestionsToDocx({
      originalDocxBuffer: sessionEntry.originalDocxBuffer,
      analysis,
      acceptedSuggestionIds: body.acceptedSuggestionIds,
      rejectedSuggestionIds: body.rejectedSuggestionIds,
      projectedScore: body.projectedScore,
      timestamp,
      context: { requestId },
    });

    deleteSeoAnalysisSession(body.analysisId);

    console.info("[Cenzer SEO][Finalize] Session deleted after successful generation", {
      requestId,
      stage: "docx-buffer-generate",
      analysisId: body.analysisId,
      outputBytes: generated.buffer.byteLength,
      appliedChanges: generated.appliedChanges.length,
      finalScore: generated.finalScore,
    });

    const responseBody = new ArrayBuffer(generated.buffer.byteLength);
    new Uint8Array(responseBody).set(generated.buffer);
    const fileName = `${sanitizeFileStem(analysis.fileName)}-cenzer-seo-final.docx`;

    console.info("[Cenzer SEO][Finalize] Returning in-memory DOCX response", {
      requestId,
      stage: "docx-response",
      fileName,
      responseBytes: generated.buffer.byteLength,
    });

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
    const details = getFinalizeErrorDetails(error);
    const stage = parseStageFromErrorMessage(details.message);
    const failurePhase = mapFinalizeFailurePhase(stage);
    const failureCause = classifyFinalizeFailureCause({
      stage,
      message: details.message,
    });
    const status = getFinalizeErrorStatus(failureCause, 500);

    console.error("[Cenzer SEO][Finalize] Pipeline failed", {
      requestId,
      stage,
      failurePhase,
      failureCause,
      status,
      analysisId: body.analysisId,
      errorName: details.name,
      errorMessage: details.message,
      errorStack: details.stack,
    });

    return NextResponse.json(
      {
        error: getFinalizeUserError(failureCause),
        stage,
        failurePhase,
        failureCause,
        requestId,
        detail: details.message,
      },
      { status },
    );
  }
}
