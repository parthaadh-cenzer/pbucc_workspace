import "server-only";
import type { DocumentDiagnostics } from "@/lib/seo-checker-document";
import type {
  SeoAnalysisResult,
  SeoPreviewBlock,
  SeoScoreBreakdown,
  SeoStatusLabel,
  SeoSuggestion,
  SeoSuggestionCategory,
  SeoSuggestionTargetType,
} from "@/lib/seo-checker-types";
import { getAnthropicRuntimeConfig } from "@/lib/cenzer-runtime";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

type AnthropicTextBlock = {
  type: "text";
  text: string;
};

type AnthropicResponse = {
  content?: AnthropicTextBlock[];
};

type ModelAnalysisPayload = {
  overallScore?: unknown;
  projectedScore?: unknown;
  status?: unknown;
  scoreBreakdown?: unknown;
  previewBlocks?: unknown;
  suggestions?: unknown;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function asText(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function asInteger(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.round(value);
}

function getStatusFromScore(score: number): SeoStatusLabel {
  if (score >= 78) {
    return "Strong";
  }

  if (score >= 55) {
    return "Needs Improvement";
  }

  return "Weak";
}

function normalizeStatus(value: unknown, fallbackScore: number): SeoStatusLabel {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (normalized === "strong") {
    return "Strong";
  }

  if (normalized === "needs improvement") {
    return "Needs Improvement";
  }

  if (normalized === "weak") {
    return "Weak";
  }

  return getStatusFromScore(fallbackScore);
}

function normalizeImpact(value: unknown): SeoSuggestion["impact"] {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (normalized === "high") {
    return "High";
  }

  if (normalized === "medium") {
    return "Medium";
  }

  return "Low";
}

function normalizeCategory(value: unknown): SeoSuggestionCategory {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  switch (normalized) {
    case "title":
      return "Title";
    case "headings":
      return "Headings";
    case "keywords":
      return "Keywords";
    case "readability":
      return "Readability";
    case "intent":
      return "Intent";
    case "cta":
      return "CTA";
    default:
      return "Structure";
  }
}

function normalizeTargetType(value: unknown): SeoSuggestionTargetType {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (normalized === "title") {
    return "title";
  }

  if (normalized === "heading") {
    return "heading";
  }

  if (normalized === "paragraph") {
    return "paragraph";
  }

  return "phrase";
}

function projectedGainByImpact(impact: SeoSuggestion["impact"]) {
  if (impact === "High") {
    return 8;
  }

  if (impact === "Medium") {
    return 5;
  }

  return 3;
}

function stripCodeFences(raw: string) {
  return raw
    .replace(/^\uFEFF/, "")
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function extractJsonCandidate(raw: string) {
  const withoutFences = stripCodeFences(raw);
  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");

  if (start < 0 || end <= start) {
    throw new Error("[model-json-extract] Could not locate a complete JSON object in model response.");
  }

  return withoutFences.slice(start, end + 1).trim();
}

function sanitizeJsonCandidate(candidate: string) {
  return candidate
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00A0/g, " ")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
}

function tryParseJson(stage: string, candidate: string) {
  try {
    return JSON.parse(candidate) as ModelAnalysisPayload;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown JSON parse error.";
    throw new Error(`[${stage}] ${message}`);
  }
}

function getDevLogSnippet(value: string, maxLength = 500) {
  return value.slice(0, maxLength).replace(/\s+/g, " ").trim();
}

async function requestAnthropicText(input: {
  prompt: string;
  mode: "analysis" | "repair";
}) {
  const { prompt, mode } = input;
  let runtimeConfig;

  try {
    runtimeConfig = getAnthropicRuntimeConfig();
  } catch (error) {
    const configuredModel = process.env.ANTHROPIC_MODEL?.trim() || "(default)";
    console.error("[Cenzer SEO][Model] Anthropic runtime configuration invalid", {
      mode,
      hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
      model: configuredModel,
      error: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }

  const { apiKey, model } = runtimeConfig;

  console.info("[Cenzer SEO][Model] Request configuration", {
    mode,
    model,
    hasApiKey: true,
    keyLength: apiKey.length,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  console.info("[Cenzer SEO][Model] Anthropic request started", {
    mode,
    model,
  });

  let response: Response;

  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: mode === "repair" ? 2800 : 2600,
        temperature: mode === "repair" ? 0 : 0.2,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`[anthropic-timeout] Anthropic ${mode} request timed out after 45 seconds.`);
    }

    const message = error instanceof Error ? error.message : "unknown network error";
    throw new Error(`[anthropic-network] Anthropic ${mode} request failed: ${message}`);
  } finally {
    clearTimeout(timeout);
  }

  console.info("[Cenzer SEO][Model] Anthropic response received", {
    mode,
    model,
    status: response.status,
  });

  if (!response.ok) {
    const failureText = await response.text();
    const providerRequestId =
      response.headers.get("request-id") || response.headers.get("x-request-id") || null;

    if (response.status === 401 || response.status === 403) {
      console.error("[Cenzer SEO][Model] Anthropic authorization failure", {
        mode,
        model,
        status: response.status,
        hasApiKey: true,
        keyLength: apiKey.length,
        providerRequestId,
        detail: failureText.slice(0, 300),
      });
    }

    throw new Error(
      `[anthropic-http-${response.status}] Provider ${mode} request failed (${response.status}): ${failureText.slice(0, 300)}`,
    );
  }

  let data: AnthropicResponse;

  try {
    data = (await response.json()) as AnthropicResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown json parse error";
    throw new Error(`[anthropic-response-json] Failed to parse provider JSON response: ${message}`);
  }

  const textBlock = data.content?.find((block) => block.type === "text");

  if (!textBlock?.text) {
    throw new Error("[anthropic-response-content] Provider response did not contain text output.");
  }

  console.info("[Cenzer SEO][Model] Anthropic text payload ready", {
    mode,
    characters: textBlock.text.length,
  });

  return textBlock.text;
}

function normalizeBreakdown(value: unknown, fallback: SeoScoreBreakdown): SeoScoreBreakdown {
  if (typeof value !== "object" || value === null) {
    return fallback;
  }

  const candidate = value as Record<string, unknown>;

  return {
    titleClarityKeywordRelevance: clampScore(
      asInteger(candidate.titleClarityKeywordRelevance, fallback.titleClarityKeywordRelevance),
    ),
    headingHierarchyStructure: clampScore(
      asInteger(candidate.headingHierarchyStructure, fallback.headingHierarchyStructure),
    ),
    keywordPlacement: clampScore(asInteger(candidate.keywordPlacement, fallback.keywordPlacement)),
    readabilitySentenceClarity: clampScore(
      asInteger(candidate.readabilitySentenceClarity, fallback.readabilitySentenceClarity),
    ),
    searchIntentMatch: clampScore(asInteger(candidate.searchIntentMatch, fallback.searchIntentMatch)),
    ctaClarity: clampScore(asInteger(candidate.ctaClarity, fallback.ctaClarity)),
    paragraphScannability: clampScore(
      asInteger(candidate.paragraphScannability, fallback.paragraphScannability),
    ),
    repetitionKeywordStuffing: clampScore(
      asInteger(candidate.repetitionKeywordStuffing, fallback.repetitionKeywordStuffing),
    ),
    metaReadiness: clampScore(asInteger(candidate.metaReadiness, fallback.metaReadiness)),
    internalLinkingReadiness: clampScore(
      asInteger(candidate.internalLinkingReadiness, fallback.internalLinkingReadiness),
    ),
    audienceRelevance: clampScore(asInteger(candidate.audienceRelevance, fallback.audienceRelevance)),
    actionabilitySpecificity: clampScore(
      asInteger(candidate.actionabilitySpecificity, fallback.actionabilitySpecificity),
    ),
  };
}

function normalizePreviewBlocks(value: unknown, fallback: SeoPreviewBlock[]): SeoPreviewBlock[] {
  if (!Array.isArray(value) || value.length < 1) {
    return fallback;
  }

  const normalized = value
    .slice(0, 180)
    .map((entry, index) => {
      const record = (entry ?? {}) as Record<string, unknown>;
      const fallbackBlock = fallback[index];
      const kindRaw = asText(record.kind ?? record.type, "paragraph").toLowerCase();
      const kind: SeoPreviewBlock["kind"] =
        kindRaw === "title"
          ? "title"
          : kindRaw === "heading"
            ? "heading"
            : kindRaw === "list-item" || kindRaw === "list_item"
              ? "list-item"
              : "paragraph";

      return {
        id: asText(record.id, `preview-${index + 1}`),
        index:
          typeof record.index === "number" && Number.isFinite(record.index)
            ? Math.max(0, Math.floor(record.index))
            : fallbackBlock?.index ?? index,
        kind,
        text: asText(record.text ?? record.content, fallbackBlock?.text ?? ""),
        listLevel:
          typeof record.listLevel === "number" && Number.isFinite(record.listLevel)
            ? Math.max(0, Math.floor(record.listLevel))
            : fallbackBlock?.listLevel,
        listOrder:
          typeof record.listOrder === "number" && Number.isFinite(record.listOrder)
            ? Math.max(1, Math.floor(record.listOrder))
            : fallbackBlock?.listOrder,
      };
    })
    .filter((entry) => entry.text.length > 0);

  return normalized.length > 0 ? normalized : fallback;
}

function resolveTargetIndex(input: {
  diagnostics: DocumentDiagnostics;
  targetIndex: number;
  targetType: SeoSuggestionTargetType;
  originalTextSnippet: string;
  currentText: string;
}) {
  const { diagnostics, targetIndex, targetType, originalTextSnippet, currentText } = input;
  const maxIndex = diagnostics.previewBlocks.length - 1;

  if (targetIndex >= 0 && targetIndex <= maxIndex) {
    return targetIndex;
  }

  const searchSnippet = (originalTextSnippet || currentText).trim();

  if (searchSnippet.length > 0) {
    const matchByText = diagnostics.previewBlocks.find((block) => block.text.includes(searchSnippet));
    if (matchByText) {
      return matchByText.index;
    }
  }

  const expectedKind =
    targetType === "title"
      ? "title"
      : targetType === "heading"
        ? "heading"
        : targetType === "paragraph"
          ? "paragraph"
          : null;

  if (expectedKind) {
    const matchByKind = diagnostics.previewBlocks.find((block) => block.kind === expectedKind);
    if (matchByKind) {
      return matchByKind.index;
    }
  }

  return 0;
}

function normalizeSuggestions(value: unknown, diagnostics: DocumentDiagnostics): SeoSuggestion[] {
  if (!Array.isArray(value) || value.length < 1) {
    throw new Error("Model payload contained no suggestions.");
  }

  return value.slice(0, 12).map((entry, index) => {
    const record = (entry ?? {}) as Record<string, unknown>;
    const impact = normalizeImpact(record.impact);
    const targetType = normalizeTargetType(record.targetType);
    const originalTextSnippet = asText(
      record.originalTextSnippet ?? record.currentText,
      "No explicit snippet provided.",
    );
    const suggestedReplacementText = asText(
      record.suggestedReplacementText ?? record.suggestedText,
      "Provide an improved sentence or section.",
    );

    const targetIndex = resolveTargetIndex({
      diagnostics,
      targetIndex: asInteger(record.targetIndex, -1),
      targetType,
      originalTextSnippet,
      currentText: asText(record.currentText, originalTextSnippet),
    });

    return {
      id: asText(record.id, `suggestion-${index + 1}`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
      title: asText(record.title, `Suggestion ${index + 1}`),
      reason: asText(record.reason, "Improves ranking potential and user clarity."),
      currentText: asText(record.currentText, originalTextSnippet),
      suggestedText: asText(record.suggestedText, suggestedReplacementText),
      targetType,
      targetIndex,
      originalTextSnippet,
      suggestedReplacementText,
      impact,
      projectedGain: Math.max(
        1,
        Math.min(10, asInteger(record.projectedGain, projectedGainByImpact(impact))),
      ),
      category: normalizeCategory(record.category),
    };
  });
}

function buildPrompt(input: DocumentDiagnostics) {
  return [
    "You are Cenzer, an expert SEO optimization engine for marketing documents.",
    "Evaluate the document using these rules:",
    "- title clarity and keyword relevance",
    "- heading hierarchy and structure",
    "- keyword placement in title, headings, intro, and body",
    "- readability and sentence clarity",
    "- search intent match",
    "- CTA clarity and actionability",
    "- paragraph scannability",
    "- keyword stuffing and overuse",
    "- meta-readiness",
    "- internal linking readiness where applicable",
    "- audience relevance",
    "- clarity, specificity, usefulness",
    "Return exactly one valid JSON object.",
    "Do not wrap the JSON in markdown.",
    "Do not use code fences.",
    "Do not include any explanation.",
    "Do not include any text before or after the JSON.",
    "Do not include trailing commas.",
    "All strings must use standard double quotes.",
    "The response must be directly parseable by JSON.parse.",
    "Return exactly this shape:",
    '{"overallScore":number,"projectedScore":number,"status":"Strong|Needs Improvement|Weak","scoreBreakdown":{"titleClarityKeywordRelevance":number,"headingHierarchyStructure":number,"keywordPlacement":number,"readabilitySentenceClarity":number,"searchIntentMatch":number,"ctaClarity":number,"paragraphScannability":number,"repetitionKeywordStuffing":number,"metaReadiness":number,"internalLinkingReadiness":number,"audienceRelevance":number,"actionabilitySpecificity":number},"previewBlocks":[{"id":"string","index":number,"type":"title|heading|paragraph|list-item","content":"string","listLevel":number,"listOrder":number}],"suggestions":[{"id":"string","title":"string","reason":"string","currentText":"string","suggestedText":"string","targetType":"title|heading|paragraph|phrase","targetIndex":number,"originalTextSnippet":"string","suggestedReplacementText":"string","impact":"High|Medium|Low","projectedGain":number,"category":"Title|Headings|Keywords|Readability|CTA|Structure|Intent"}]}',
    "Constraints:",
    "- Provide 6-10 suggestions.",
    "- Every suggestion must include targetType and targetIndex mapped to the provided previewBlocks.",
    "- Keep score values from 0 to 100.",
    "- projectedScore must be >= overallScore.",
    "Document diagnostics:",
    JSON.stringify(
      {
        fileName: input.fileName,
        wordCount: input.wordCount,
        title: input.title,
        intro: input.intro,
        headings: input.headings,
        topKeywords: input.topKeywords,
        readabilitySentenceLength: Number(input.readabilitySentenceLength.toFixed(1)),
        ctaSentence: input.ctaSentence,
        heuristicBaseline: {
          overallScore: input.heuristicOverallScore,
          scoreBreakdown: input.heuristicBreakdown,
        },
        previewBlocks: input.previewBlocks.slice(0, 120).map((block) => ({
          id: block.id,
          index: block.index,
          type: block.kind,
          content: block.text,
          listLevel: block.listLevel,
          listOrder: block.listOrder,
        })),
        documentExcerpt: input.documentText.slice(0, 14000),
      },
      null,
      2,
    ),
  ].join("\n");
}

function buildRepairPrompt(rawModelResponse: string) {
  return [
    "You are a strict JSON repair utility.",
    "Convert the input into exactly one valid JSON object.",
    "Do not include markdown, code fences, or commentary.",
    "Do not include any text before or after the JSON object.",
    "Use standard double-quoted JSON strings only.",
    "Preserve all fields and values when possible.",
    "Required top-level keys: overallScore, projectedScore, status, scoreBreakdown, previewBlocks, suggestions.",
    "Input to repair:",
    rawModelResponse,
  ].join("\n");
}

async function parseModelPayloadWithRepair(rawModelResponse: string) {
  const isDev = process.env.NODE_ENV !== "production";

  console.info("[Cenzer SEO][Model] Raw model response length", {
    characters: rawModelResponse.length,
  });

  if (isDev) {
    console.info("[Cenzer SEO][Model] Raw response preview", {
      preview: getDevLogSnippet(rawModelResponse, 500),
    });
  }

  let candidate = "";

  try {
    candidate = extractJsonCandidate(rawModelResponse);
  } catch (error) {
    if (isDev) {
      console.error("[Cenzer SEO][Model] JSON extraction failed", {
        rawPreview: getDevLogSnippet(rawModelResponse, 500),
      });
    }
    throw error;
  }

  console.info("[Cenzer SEO][Model] Extracted JSON candidate length", {
    characters: candidate.length,
  });

  try {
    const parsed = tryParseJson("model-json-parse-primary", candidate);
    console.info("[Cenzer SEO][Model] JSON parse success", { stage: "primary" });
    return parsed;
  } catch (primaryError) {
    const sanitized = sanitizeJsonCandidate(candidate);

    if (isDev) {
      console.error("[Cenzer SEO][Model] JSON parse failed", {
        stage: "primary",
        error: primaryError instanceof Error ? primaryError.message : "unknown",
        candidatePreview: getDevLogSnippet(candidate, 500),
      });
    }

    if (sanitized !== candidate) {
      try {
        const parsedSanitized = tryParseJson("model-json-parse-sanitized", sanitized);
        console.info("[Cenzer SEO][Model] JSON parse success", { stage: "sanitized" });
        return parsedSanitized;
      } catch (sanitizedError) {
        if (isDev) {
          console.error("[Cenzer SEO][Model] JSON parse failed", {
            stage: "sanitized",
            error: sanitizedError instanceof Error ? sanitizedError.message : "unknown",
            candidatePreview: getDevLogSnippet(sanitized, 500),
          });
        }
      }
    }

    const repairedRaw = await requestAnthropicText({
      prompt: buildRepairPrompt(rawModelResponse),
      mode: "repair",
    });

    console.info("[Cenzer SEO][Model] Repair response received", {
      characters: repairedRaw.length,
    });

    if (isDev) {
      console.info("[Cenzer SEO][Model] Repair response preview", {
        preview: getDevLogSnippet(repairedRaw, 500),
      });
    }

    const repairedCandidate = extractJsonCandidate(repairedRaw);

    console.info("[Cenzer SEO][Model] Repaired JSON candidate length", {
      characters: repairedCandidate.length,
    });

    try {
      const repairedParsed = tryParseJson("model-json-parse-repair", repairedCandidate);
      console.info("[Cenzer SEO][Model] JSON parse success", { stage: "repair" });
      return repairedParsed;
    } catch (repairError) {
      if (isDev) {
        console.error("[Cenzer SEO][Model] JSON parse failed", {
          stage: "repair",
          error: repairError instanceof Error ? repairError.message : "unknown",
          candidatePreview: getDevLogSnippet(repairedCandidate, 500),
        });
      }

      throw repairError;
    }
  }
}

function computeRealisticProjectedScore(input: {
  overallScore: number;
  modelProjectedScore: number;
  suggestions: SeoSuggestion[];
}) {
  const { overallScore, modelProjectedScore, suggestions } = input;
  const maxAllowed = Math.max(overallScore, modelProjectedScore);
  const totalRawGain = suggestions.reduce((total, suggestion) => total + suggestion.projectedGain, 0);

  if (totalRawGain < 1) {
    return overallScore;
  }

  const scaledGain = Math.max(1, Math.round(totalRawGain * 0.62));
  return Math.min(maxAllowed, overallScore + scaledGain);
}

export async function analyzeWithCenzerModel(
  diagnostics: DocumentDiagnostics,
): Promise<SeoAnalysisResult> {
  console.info("[Cenzer SEO][Model] Analysis started", {
    fileName: diagnostics.fileName,
    wordCount: diagnostics.wordCount,
  });

  const prompt = buildPrompt(diagnostics);
  const outputText = await requestAnthropicText({
    prompt,
    mode: "analysis",
  });

  let payload: ModelAnalysisPayload;

  try {
    payload = await parseModelPayloadWithRepair(outputText);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse failure.";
    throw new Error(message);
  }

  const scoreBreakdown = normalizeBreakdown(payload.scoreBreakdown, diagnostics.heuristicBreakdown);
  const overallScore = clampScore(asInteger(payload.overallScore, diagnostics.heuristicOverallScore));
  const modelProjectedScore = Math.max(
    overallScore,
    clampScore(asInteger(payload.projectedScore, Math.min(100, overallScore + 14))),
  );

  let suggestions: SeoSuggestion[];
  try {
    suggestions = normalizeSuggestions(payload.suggestions, diagnostics);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown suggestion normalization error";
    throw new Error(`[model-normalize] ${message}`);
  }

  const projectedScore = computeRealisticProjectedScore({
    overallScore,
    modelProjectedScore,
    suggestions,
  });

  console.info("[Cenzer SEO][Model] Analysis complete", {
    overallScore,
    projectedScore,
    suggestions: suggestions.length,
  });

  return {
    analysisId: "",
    fileName: diagnostics.fileName,
    uploadDate: diagnostics.uploadDate,
    wordCount: diagnostics.wordCount,
    documentText: diagnostics.documentText,
    overallScore,
    currentScore: overallScore,
    projectedScore,
    status: normalizeStatus(payload.status, overallScore),
    scoreBreakdown,
    previewBlocks: normalizePreviewBlocks(payload.previewBlocks, diagnostics.previewBlocks),
    suggestions,
  };
}
