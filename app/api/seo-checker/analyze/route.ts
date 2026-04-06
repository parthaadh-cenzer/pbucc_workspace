import { NextResponse } from "next/server";
import { analyzeWithCenzerModel } from "@/lib/cenzer-seo-analyzer";
import {
  buildDocumentDiagnostics,
  createUploadDateLabel,
} from "@/lib/seo-checker-document";
import { getDocxBufferFromFile, parseDocxStructure } from "@/lib/seo-checker-docx-structure";
import { saveSeoAnalysisSession } from "@/lib/seo-checker-session-store";
import { getDemoWorkspaceSelectionFromCookies } from "@/lib/demo-mode";

export const runtime = "nodejs";

const MAX_DOCX_SIZE_BYTES = 12 * 1024 * 1024;
const MIN_EXTRACTED_TEXT_CHARS = 60;
const MIN_ALPHANUMERIC_RATIO = 0.35;

function getAlphanumericRatio(text: string) {
  if (!text) {
    return 0;
  }

  const alphanumeric = (text.match(/[a-z0-9]/gi) ?? []).length;
  return alphanumeric / text.length;
}

function parseStageFromErrorMessage(message: string) {
  const explicitStage = message.match(/\[stage=([^\]]+)\]/i)?.[1];
  if (explicitStage) {
    return explicitStage;
  }

  const legacyStage = /\[(.*?)\]/.exec(message)?.[1];
  return legacyStage ?? "analyze";
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.info("[Cenzer SEO][Analyze] API route entered", { requestId });
  const selection = await getDemoWorkspaceSelectionFromCookies();

  console.info("[Cenzer SEO][Analyze] Request context", {
    requestId,
    teamId: selection?.team.id ?? null,
    userId: selection?.user.id ?? null,
    userName: selection?.user.name ?? null,
  });

  let formData: FormData;

  try {
    formData = await request.formData();
    console.info("[Cenzer SEO][Analyze] Multipart payload parsed", { requestId });
  } catch (error) {
    console.error("[Cenzer SEO][Analyze] Multipart payload parse failed", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      {
        error: "Invalid multipart payload.",
        stage: "multipart-parse",
        requestId,
      },
      { status: 400 },
    );
  }

  const fileEntry = formData.get("file");

  if (!(fileEntry instanceof File)) {
    console.warn("[Cenzer SEO][Analyze] Missing file entry", { requestId });
    return NextResponse.json(
      {
        error: "A .docx file is required.",
        stage: "file-missing",
        requestId,
      },
      { status: 400 },
    );
  }

  console.info("[Cenzer SEO][Analyze] Upload received", {
    requestId,
    fileName: fileEntry.name,
    bytes: fileEntry.size,
  });

  if (!/\.docx$/i.test(fileEntry.name)) {
    console.warn("[Cenzer SEO][Analyze] Invalid file extension", {
      requestId,
      fileName: fileEntry.name,
    });
    return NextResponse.json(
      {
        error: "Only .docx files are supported.",
        stage: "file-extension",
        requestId,
      },
      { status: 400 },
    );
  }

  if (fileEntry.size > MAX_DOCX_SIZE_BYTES) {
    console.warn("[Cenzer SEO][Analyze] File too large", {
      requestId,
      bytes: fileEntry.size,
    });
    return NextResponse.json(
      {
        error: "File is too large. Please upload a document under 12 MB.",
        stage: "file-size",
        requestId,
      },
      { status: 413 },
    );
  }

  try {
    const originalDocxBuffer = await getDocxBufferFromFile(fileEntry);

    console.info("[Cenzer SEO][Analyze] Document extraction started", {
      stage: "document-parse",
      requestId,
      fileName: fileEntry.name,
    });

    let parsedDocx;
    try {
      parsedDocx = await parseDocxStructure(originalDocxBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      console.error("[Cenzer SEO][Analyze] DOCX parse failed", {
        stage: "document-parse",
        requestId,
        message,
      });
      throw new Error(`[stage=document-parse] ${message}`);
    }

    const extractedText = parsedDocx.plainText.replace(/\u0000/g, "").trim();
    const extractionWordCount = extractedText.split(/\s+/).filter(Boolean).length;
    const extractionRatio = getAlphanumericRatio(extractedText);

    console.info("[Cenzer SEO][Analyze] File parsed", {
      stage: "document-parse",
      requestId,
      fileName: fileEntry.name,
    });
    console.info("[Cenzer SEO][Analyze] Extracted text length", {
      stage: "document-parse",
      requestId,
      characters: extractedText.length,
      words: extractionWordCount,
      alphanumericRatio: Number(extractionRatio.toFixed(3)),
    });

    if (!extractedText || extractedText.length < MIN_EXTRACTED_TEXT_CHARS || extractionWordCount < 10) {
      console.warn("[Cenzer SEO][Analyze] Extraction returned empty text", {
        stage: "document-parse",
        requestId,
      });
      return NextResponse.json(
        {
          error: "No readable content was extracted from the uploaded document.",
          stage: "document-parse",
          requestId,
        },
        { status: 422 },
      );
    }

    if (extractionRatio < MIN_ALPHANUMERIC_RATIO) {
      console.warn("[Cenzer SEO][Analyze] Extraction looks malformed", {
        stage: "document-parse",
        requestId,
        alphanumericRatio: Number(extractionRatio.toFixed(3)),
      });

      return NextResponse.json(
        {
          error: "Extracted document text appears malformed. Please upload a cleaner .docx file.",
          stage: "document-parse",
          requestId,
        },
        { status: 422 },
      );
    }

    const diagnostics = buildDocumentDiagnostics({
      fileName: fileEntry.name,
      documentText: extractedText,
      uploadDate: createUploadDateLabel(new Date()),
      paragraphNodes: parsedDocx.paragraphs,
    });

    console.info("[Cenzer SEO][Analyze] Diagnostics generated", {
      stage: "document-parse",
      requestId,
      wordCount: diagnostics.wordCount,
      headingCount: diagnostics.headings.length,
    });

    console.info("[Cenzer SEO][Analyze] Anthropic request started", {
      stage: "model-request",
      requestId,
    });

    const analysis = await analyzeWithCenzerModel(diagnostics, { requestId });
    const analysisId = crypto.randomUUID();
    const hydratedAnalysis = {
      ...analysis,
      analysisId,
    };

    saveSeoAnalysisSession({
      analysis: hydratedAnalysis,
      originalDocxBuffer,
    });

    console.info("[Cenzer SEO][Analyze] Anthropic response received", {
      stage: "model-response",
      requestId,
      suggestions: hydratedAnalysis.suggestions.length,
      overallScore: hydratedAnalysis.overallScore,
      analysisId,
    });

    return NextResponse.json(
      {
        analysis: hydratedAnalysis,
        requestId,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown analysis error.";
    const stage = parseStageFromErrorMessage(message);
    const status = stage === "model-request-timeout" ? 504 : 500;

    console.error("[Cenzer SEO][Analyze] Analysis pipeline failed", {
      requestId,
      stage,
      message,
    });

    return NextResponse.json(
      {
        error: "Failed to analyze this document.",
        stage,
        requestId,
      },
      { status },
    );
  }
}