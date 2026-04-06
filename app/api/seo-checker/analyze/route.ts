import { NextResponse } from "next/server";
import { analyzeWithCenzerModel } from "@/lib/cenzer-seo-analyzer";
import {
  buildDocumentDiagnostics,
  createUploadDateLabel,
} from "@/lib/seo-checker-document";
import { getDocxBufferFromFile, parseDocxStructure } from "@/lib/seo-checker-docx-structure";
import type { DocxParagraphNode } from "@/lib/seo-checker-docx-structure";
import { saveSeoAnalysisSession } from "@/lib/seo-checker-session-store";
import { getDemoWorkspaceSelectionFromCookies } from "@/lib/demo-mode";

export const runtime = "nodejs";

const MAX_DOCX_SIZE_BYTES = 12 * 1024 * 1024;
const MIN_EXTRACTED_TEXT_CHARS = 60;
const MIN_ALPHANUMERIC_RATIO = 0.35;
const MAX_ANALYZER_TEXT_CHARS = 110_000;
const MAX_ANALYZER_PARAGRAPHS = 900;

type AnalysisFailureCause =
  | "file-size"
  | "unsupported-document"
  | "text-extraction"
  | "timeout"
  | "token-input-size"
  | "model-json"
  | "response-formatting"
  | "unknown";

type AnalysisFailurePhase =
  | "extraction"
  | "model-call"
  | "json-parsing"
  | "response-formatting"
  | "unknown";

type AnalyzerInputWindow = {
  documentText: string;
  paragraphNodes: DocxParagraphNode[];
  wasTruncated: boolean;
  originalChars: number;
  analyzedChars: number;
  originalParagraphs: number;
  analyzedParagraphs: number;
};

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

function extractRawSnippetFromErrorMessage(message: string) {
  const match = message.match(/\|\s*rawSnippet=([^|]+)(?:\||$)/i);
  return match?.[1]?.trim() ?? null;
}

function getLogTextPreview(value: string, maxLength = 500) {
  return value
    .slice(0, maxLength)
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .trim();
}

function sanitizeExtractedText(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeParagraphNodes(paragraphs: DocxParagraphNode[]) {
  return paragraphs.map((paragraph) => ({
    ...paragraph,
    text: paragraph.text
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  }));
}

function getExtractionAnomalyMetrics(rawText: string) {
  const controlCharCount =
    (rawText.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g) ?? []).length;
  const replacementCharCount = (rawText.match(/\uFFFD/g) ?? []).length;

  return {
    controlCharCount,
    replacementCharCount,
  };
}

function extractPageMetrics(documentXml: string) {
  const explicitPageBreaks = (documentXml.match(/<w:br\b[^>]*w:type="page"[^>]*\/?>/gi) ?? []).length;
  const renderedPageBreaks = (documentXml.match(/<w:lastRenderedPageBreak\s*\/?\s*>/gi) ?? []).length;
  const pageBreakCount = Math.max(explicitPageBreaks, renderedPageBreaks);

  return {
    pageBreakCount,
    estimatedPages: pageBreakCount + 1,
  };
}

function createAnalyzerInputWindow(input: {
  extractedText: string;
  paragraphs: DocxParagraphNode[];
}): AnalyzerInputWindow {
  const { extractedText, paragraphs } = input;
  const originalChars = extractedText.length;
  const originalParagraphs = paragraphs.length;

  if (originalChars <= MAX_ANALYZER_TEXT_CHARS && originalParagraphs <= MAX_ANALYZER_PARAGRAPHS) {
    return {
      documentText: extractedText,
      paragraphNodes: paragraphs,
      wasTruncated: false,
      originalChars,
      analyzedChars: originalChars,
      originalParagraphs,
      analyzedParagraphs: originalParagraphs,
    };
  }

  const selectedParagraphs: DocxParagraphNode[] = [];
  let runningChars = 0;

  for (const paragraph of paragraphs) {
    const text = paragraph.text.trim();

    if (!text) {
      continue;
    }

    const extraChars = text.length + (selectedParagraphs.length > 0 ? 2 : 0);
    const wouldExceedChars = runningChars + extraChars > MAX_ANALYZER_TEXT_CHARS;
    const wouldExceedParagraphs = selectedParagraphs.length >= MAX_ANALYZER_PARAGRAPHS;

    if (wouldExceedChars || wouldExceedParagraphs) {
      break;
    }

    selectedParagraphs.push(paragraph);
    runningChars += extraChars;
  }

  const paragraphBasedText = selectedParagraphs
    .map((paragraph) => paragraph.text.trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();

  const truncatedText = paragraphBasedText || extractedText.slice(0, MAX_ANALYZER_TEXT_CHARS).trim();
  const fallbackParagraphs =
    selectedParagraphs.length > 0
      ? selectedParagraphs
      : paragraphs.slice(0, Math.min(paragraphs.length, MAX_ANALYZER_PARAGRAPHS));

  return {
    documentText: truncatedText,
    paragraphNodes: fallbackParagraphs,
    wasTruncated: true,
    originalChars,
    analyzedChars: truncatedText.length,
    originalParagraphs,
    analyzedParagraphs: fallbackParagraphs.length,
  };
}

function classifyFailureCause(input: { stage: string; message: string }): AnalysisFailureCause {
  const { stage, message } = input;
  const normalizedMessage = message.toLowerCase();

  if (stage === "file-size") {
    return "file-size";
  }

  if (stage === "file-extension" || stage === "file-missing" || stage === "multipart-parse") {
    return "unsupported-document";
  }

  if (stage === "document-parse") {
    return "text-extraction";
  }

  if (stage === "model-request-timeout") {
    return "timeout";
  }

  if (stage === "model-json-parse") {
    return "model-json";
  }

  if (stage === "response-validation") {
    return "response-formatting";
  }

  if (
    normalizedMessage.includes("token") ||
    normalizedMessage.includes("context length") ||
    normalizedMessage.includes("prompt is too long") ||
    normalizedMessage.includes("maximum context") ||
    normalizedMessage.includes("input is too long")
  ) {
    return "token-input-size";
  }

  if (normalizedMessage.includes("json") && normalizedMessage.includes("parse")) {
    return "model-json";
  }

  return "unknown";
}

function mapFailurePhase(stage: string): AnalysisFailurePhase {
  if (stage === "document-parse") {
    return "extraction";
  }

  if (stage === "model-json-parse") {
    return "json-parsing";
  }

  if (stage === "response-validation") {
    return "response-formatting";
  }

  if (stage.startsWith("model-")) {
    return "model-call";
  }

  return "unknown";
}

function getHttpStatusForFailureCause(cause: AnalysisFailureCause, fallbackStatus: number) {
  if (cause === "file-size" || cause === "token-input-size") {
    return 413;
  }

  if (cause === "unsupported-document") {
    return 400;
  }

  if (cause === "text-extraction") {
    return 422;
  }

  if (cause === "timeout") {
    return 504;
  }

  if (cause === "model-json") {
    return 502;
  }

  if (cause === "response-formatting") {
    return 500;
  }

  return fallbackStatus;
}

function getUserFacingErrorMessage(cause: AnalysisFailureCause) {
  if (cause === "file-size") {
    return "File is too large. Upload a .docx under 12 MB.";
  }

  if (cause === "unsupported-document") {
    return "Unsupported document. Please upload a valid .docx file.";
  }

  if (cause === "text-extraction") {
    return "Could not extract readable text from this document. Try a cleaner .docx export.";
  }

  if (cause === "timeout") {
    return "Document analysis timed out. Try a shorter document or retry.";
  }

  if (cause === "token-input-size") {
    return "Document is too large or complex for one-pass AI analysis. Please shorten it and retry.";
  }

  if (cause === "model-json") {
    return "Model response format was invalid for this run. Please retry the analysis.";
  }

  if (cause === "response-formatting") {
    return "Model response could not be normalized. Please retry the analysis.";
  }

  return "Failed to analyze this document.";
}

function getErrorDetails(error: unknown) {
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
  console.info("[Cenzer SEO][Analyze] API route entered", { requestId });
  const selection = await getDemoWorkspaceSelectionFromCookies();
  const requestMetrics = {
    fileName: null as string | null,
    uploadedBytes: 0,
    extractedChars: 0,
    extractedRawChars: 0,
    extractedWords: 0,
    extractedParagraphs: 0,
    extractedEstimatedPages: 0,
    extractedPageBreaks: 0,
    extractedPreview: "",
    extractedControlChars: 0,
    extractedReplacementChars: 0,
    modelInputChars: 0,
    modelInputParagraphs: 0,
    modelInputTruncated: false,
  };

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

  requestMetrics.fileName = fileEntry.name;
  requestMetrics.uploadedBytes = fileEntry.size;

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
      maxBytes: MAX_DOCX_SIZE_BYTES,
    });
    return NextResponse.json(
      {
        error: "File is too large. Upload a .docx under 12 MB.",
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

    const rawExtractedText = parsedDocx.plainText;
    const extractedText = sanitizeExtractedText(rawExtractedText);
    const sanitizedParagraphNodes = sanitizeParagraphNodes(parsedDocx.paragraphs);
    const extractionWordCount = extractedText.split(/\s+/).filter(Boolean).length;
    const extractionRatio = getAlphanumericRatio(extractedText);
    const pageMetrics = extractPageMetrics(parsedDocx.documentXml);
    const anomalyMetrics = getExtractionAnomalyMetrics(rawExtractedText);

    requestMetrics.extractedChars = extractedText.length;
    requestMetrics.extractedRawChars = rawExtractedText.length;
    requestMetrics.extractedWords = extractionWordCount;
    requestMetrics.extractedParagraphs = sanitizedParagraphNodes.length;
    requestMetrics.extractedEstimatedPages = pageMetrics.estimatedPages;
    requestMetrics.extractedPageBreaks = pageMetrics.pageBreakCount;
    requestMetrics.extractedPreview = getLogTextPreview(extractedText, 500);
    requestMetrics.extractedControlChars = anomalyMetrics.controlCharCount;
    requestMetrics.extractedReplacementChars = anomalyMetrics.replacementCharCount;

    console.info("[Cenzer SEO][Analyze] File parsed", {
      stage: "document-parse",
      requestId,
      fileName: fileEntry.name,
    });
    console.info("[Cenzer SEO][Analyze] Extracted text length", {
      stage: "document-parse",
      requestId,
      characters: extractedText.length,
      rawCharacters: rawExtractedText.length,
      words: extractionWordCount,
      paragraphs: sanitizedParagraphNodes.length,
      estimatedPages: pageMetrics.estimatedPages,
      pageBreaks: pageMetrics.pageBreakCount,
      controlCharacters: anomalyMetrics.controlCharCount,
      replacementCharacters: anomalyMetrics.replacementCharCount,
      alphanumericRatio: Number(extractionRatio.toFixed(3)),
    });

    console.info("[Cenzer SEO][Analyze] Extracted text preview", {
      stage: "document-parse",
      requestId,
      preview: requestMetrics.extractedPreview,
    });

    if (!extractedText || extractedText.length < MIN_EXTRACTED_TEXT_CHARS || extractionWordCount < 10) {
      console.warn("[Cenzer SEO][Analyze] Extraction returned empty text", {
        stage: "document-parse",
        requestId,
        extractedChars: extractedText.length,
        extractedWords: extractionWordCount,
      });
      return NextResponse.json(
        {
          error: "Extracted text is empty or too short for analysis.",
          stage: "document-parse",
          failureCause: "text-extraction",
          failurePhase: "extraction",
          detail: "extracted-text-empty-or-short",
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
          failureCause: "text-extraction",
          failurePhase: "extraction",
          detail: "extracted-text-malformed",
          requestId,
        },
        { status: 422 },
      );
    }

    const analyzerInputWindow = createAnalyzerInputWindow({
      extractedText,
      paragraphs: sanitizedParagraphNodes,
    });

    requestMetrics.modelInputChars = analyzerInputWindow.analyzedChars;
    requestMetrics.modelInputParagraphs = analyzerInputWindow.analyzedParagraphs;
    requestMetrics.modelInputTruncated = analyzerInputWindow.wasTruncated;

    if (analyzerInputWindow.wasTruncated) {
      console.warn("[Cenzer SEO][Analyze] Input reduced for model safety", {
        stage: "model-request",
        requestId,
        originalChars: analyzerInputWindow.originalChars,
        analyzedChars: analyzerInputWindow.analyzedChars,
        originalParagraphs: analyzerInputWindow.originalParagraphs,
        analyzedParagraphs: analyzerInputWindow.analyzedParagraphs,
        maxAnalyzerChars: MAX_ANALYZER_TEXT_CHARS,
        maxAnalyzerParagraphs: MAX_ANALYZER_PARAGRAPHS,
      });
    }

    const diagnostics = buildDocumentDiagnostics({
      fileName: fileEntry.name,
      documentText: analyzerInputWindow.documentText,
      uploadDate: createUploadDateLabel(new Date()),
      paragraphNodes: analyzerInputWindow.paragraphNodes,
    });

    console.info("[Cenzer SEO][Analyze] Diagnostics generated", {
      stage: "document-parse",
      requestId,
      wordCount: diagnostics.wordCount,
      headingCount: diagnostics.headings.length,
      modelInputChars: diagnostics.documentText.length,
      modelInputParagraphs: diagnostics.paragraphs.length,
      modelInputWasReduced: analyzerInputWindow.wasTruncated,
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
    const details = getErrorDetails(error);
    const stage = parseStageFromErrorMessage(details.message);
    const failurePhase = mapFailurePhase(stage);
    const failureCause = classifyFailureCause({ stage, message: details.message });
    const fallbackStatus = stage === "model-request-timeout" ? 504 : 500;
    const status = getHttpStatusForFailureCause(failureCause, fallbackStatus);
    const modelOutputSnippet =
      stage === "model-json-parse" ? extractRawSnippetFromErrorMessage(details.message) : null;

    console.error("[Cenzer SEO][Analyze] Analysis pipeline failed", {
      requestId,
      stage,
      failurePhase,
      failureCause,
      status,
      fileName: requestMetrics.fileName,
      uploadedBytes: requestMetrics.uploadedBytes,
      extractedChars: requestMetrics.extractedChars,
      extractedRawChars: requestMetrics.extractedRawChars,
      extractedWords: requestMetrics.extractedWords,
      extractedParagraphs: requestMetrics.extractedParagraphs,
      extractedEstimatedPages: requestMetrics.extractedEstimatedPages,
      extractedPageBreaks: requestMetrics.extractedPageBreaks,
      extractedPreview: requestMetrics.extractedPreview,
      extractedControlChars: requestMetrics.extractedControlChars,
      extractedReplacementChars: requestMetrics.extractedReplacementChars,
      modelInputChars: requestMetrics.modelInputChars,
      modelInputParagraphs: requestMetrics.modelInputParagraphs,
      modelInputTruncated: requestMetrics.modelInputTruncated,
      errorName: details.name,
      errorMessage: details.message,
      errorStack: details.stack,
    });

    const errorPayload: {
      error: string;
      stage: string;
      requestId: string;
      failurePhase?: AnalysisFailurePhase;
      failureCause?: AnalysisFailureCause;
      detail?: string;
      modelOutputSnippet?: string;
    } = {
      error: getUserFacingErrorMessage(failureCause),
      stage,
      requestId,
      failurePhase,
      failureCause,
    };

    if (stage === "model-json-parse") {
      errorPayload.detail =
        "Model returned malformed JSON after recovery attempts. A safe output snippet is included.";

      if (modelOutputSnippet) {
        errorPayload.modelOutputSnippet = modelOutputSnippet;
      }
    } else if (failureCause === "token-input-size") {
      errorPayload.detail =
        "The model rejected input size/context constraints. Server logs include request diagnostics.";
    } else if (failureCause === "timeout") {
      errorPayload.detail =
        "Analysis exceeded provider timeout. Server logs include upload and input-size metrics.";
    }

    return NextResponse.json(errorPayload, { status });
  }
}