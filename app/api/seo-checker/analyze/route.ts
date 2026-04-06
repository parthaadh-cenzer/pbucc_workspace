import { NextResponse } from "next/server";
import { analyzeWithCenzerModel } from "@/lib/cenzer-seo-analyzer";
import {
  buildDocumentDiagnostics,
  createUploadDateLabel,
} from "@/lib/seo-checker-document";
import { getDocxBufferFromFile, parseDocxStructure } from "@/lib/seo-checker-docx-structure";
import { saveSeoAnalysisSession } from "@/lib/seo-checker-session-store";
import { getMarketingSessionUser, unauthorized } from "@/lib/security";

export const runtime = "nodejs";

const MAX_DOCX_SIZE_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.info("[Cenzer SEO][Analyze] API route entered", { requestId });

  const user = await getMarketingSessionUser();

  if (!user) {
    console.warn("[Cenzer SEO][Analyze] Unauthorized request", { requestId });
    return unauthorized();
  }

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
      requestId,
      fileName: fileEntry.name,
    });
    const parsedDocx = await parseDocxStructure(originalDocxBuffer);
    const extractedText = parsedDocx.plainText;

    console.info("[Cenzer SEO][Analyze] File parsed", {
      requestId,
      fileName: fileEntry.name,
    });
    console.info("[Cenzer SEO][Analyze] Extracted text length", {
      requestId,
      characters: extractedText.length,
    });

    if (!extractedText) {
      console.warn("[Cenzer SEO][Analyze] Extraction returned empty text", {
        requestId,
      });
      return NextResponse.json(
        {
          error: "No readable content was extracted from the uploaded document.",
          stage: "extract-empty",
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
      requestId,
      wordCount: diagnostics.wordCount,
      headingCount: diagnostics.headings.length,
    });

    console.info("[Cenzer SEO][Analyze] Anthropic request started", {
      requestId,
    });

    const analysis = await analyzeWithCenzerModel(diagnostics);
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
    const stageMatch = /\[(.*?)\]/.exec(message);
    const stage = stageMatch?.[1] ?? "analyze";

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
      { status: 500 },
    );
  }
}