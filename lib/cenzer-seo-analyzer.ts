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

type ModelRequestContext = {
  requestId: string;
};

type PreparedModelContext = {
  title: string;
  intro: string;
  headings: string[];
  ctaSentence: string | null;
  keyBodySections: string[];
  excerpt: string;
  previewBlocks: Array<{
    id: string;
    index: number;
    type: SeoPreviewBlock["kind"];
    content: string;
    listLevel?: number;
    listOrder?: number;
  }>;
  wasReduced: boolean;
  originalChars: number;
  analyzedChars: number;
  droppedParagraphEstimate: number;
};

const MAX_PROMPT_DOC_CHARS = 16_000;
const MAX_TITLE_CHARS = 180;
const MAX_INTRO_CHARS = 900;
const MAX_HEADING_CHARS = 140;
const MAX_HEADINGS = 20;
const MAX_CTA_CHARS = 260;
const MAX_KEY_BODY_SECTIONS = 14;
const MAX_BODY_SECTION_CHARS = 620;
const MAX_PREVIEW_BLOCK_COUNT = 70;
const MAX_PREVIEW_BLOCK_TEXT_CHARS = 320;

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

function extractFirstBalancedJsonObject(raw: string) {
  let depth = 0;
  let start = -1;
  let inString = false;
  let escapeNext = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (inString && char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
      continue;
    }

    if (char === "}") {
      if (depth > 0) {
        depth -= 1;
      }

      if (depth === 0 && start >= 0) {
        return raw.slice(start, index + 1).trim();
      }
    }
  }

  return null;
}

function extractJsonCandidate(raw: string) {
  const withoutFences = stripCodeFences(raw);
  const balanced = extractFirstBalancedJsonObject(withoutFences);

  if (!balanced) {
    throw new Error("[stage=model-json-parse] Could not locate a complete JSON object in model response.");
  }

  return balanced;
}

function sanitizeJsonCandidate(candidate: string) {
  return candidate
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00A0/g, " ")
    .replace(/\u0000/g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
}

function tryParseJson(stage: string, candidate: string) {
  try {
    return JSON.parse(candidate) as ModelAnalysisPayload;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown JSON parse error.";
    throw new Error(`[stage=model-json-parse] ${stage}: ${message}`);
  }
}

function getDevLogSnippet(value: string, maxLength = 500) {
  return value.slice(0, maxLength).replace(/\s+/g, " ").trim();
}

async function requestAnthropicText(input: {
  prompt: string;
  mode: "analysis" | "repair";
  context: ModelRequestContext;
}) {
  const { prompt, mode, context } = input;
  let runtimeConfig;

  try {
    runtimeConfig = getAnthropicRuntimeConfig();
  } catch (error) {
    const configuredModel = process.env.ANTHROPIC_MODEL?.trim() || "(default)";
    console.error("[Cenzer SEO][Model] Anthropic runtime configuration invalid", {
      stage: "model-request",
      requestId: context.requestId,
      mode,
      hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
      model: configuredModel,
      error: error instanceof Error ? error.message : "unknown",
    });
    throw new Error("[stage=model-request] Anthropic runtime configuration is invalid.");
  }

  const { apiKey, model } = runtimeConfig;

  console.info("[Cenzer SEO][Model] Request configuration", {
    stage: "model-request",
    requestId: context.requestId,
    mode,
    model,
    hasApiKey: true,
    keyLength: apiKey.length,
    promptChars: prompt.length,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  console.info("[Cenzer SEO][Model] Anthropic request started", {
    stage: "model-request",
    requestId: context.requestId,
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
      throw new Error(
        `[stage=model-request-timeout] Anthropic ${mode} request timed out after 45 seconds.`,
      );
    }

    const message = error instanceof Error ? error.message : "unknown network error";
    throw new Error(`[stage=model-request] Anthropic ${mode} request failed: ${message}`);
  } finally {
    clearTimeout(timeout);
  }

  console.info("[Cenzer SEO][Model] Anthropic response received", {
    stage: "model-response",
    requestId: context.requestId,
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
        stage: "model-response",
        requestId: context.requestId,
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
      `[stage=model-response] Provider ${mode} request failed (${response.status}): ${failureText.slice(0, 300)}`,
    );
  }

  let data: AnthropicResponse;

  try {
    data = (await response.json()) as AnthropicResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown json parse error";
    throw new Error(`[stage=model-response] Failed to parse provider JSON response: ${message}`);
  }

  const textBlock = data.content?.find((block) => block.type === "text");

  console.info("[Cenzer SEO][Model] Anthropic response content check", {
    stage: "model-response",
    requestId: context.requestId,
    mode,
    hasTextContent: Boolean(textBlock?.text),
    contentBlocks: Array.isArray(data.content) ? data.content.length : 0,
  });

  if (!textBlock?.text) {
    throw new Error("[stage=model-response] Provider response did not contain text output.");
  }

  console.info("[Cenzer SEO][Model] Anthropic text payload ready", {
    stage: "model-response",
    requestId: context.requestId,
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

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxChars: number) {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= maxChars) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxChars - 1)).trim()}...`;
}

function paragraphFingerprint(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .slice(0, 180);
}

function selectKeyBodySections(diagnostics: DocumentDiagnostics) {
  const unique: Array<{ text: string; index: number }> = [];
  const seen = new Set<string>();

  diagnostics.paragraphs.forEach((paragraph, index) => {
    const text = normalizeWhitespace(paragraph);
    if (text.length < 40) {
      return;
    }

    const fingerprint = paragraphFingerprint(text);
    if (!fingerprint || seen.has(fingerprint)) {
      return;
    }

    seen.add(fingerprint);
    unique.push({ text, index });
  });

  if (unique.length <= MAX_KEY_BODY_SECTIONS) {
    return unique.map((entry) => truncateText(entry.text, MAX_BODY_SECTION_CHARS));
  }

  const keywordSet = new Set(diagnostics.topKeywords.map((keyword) => keyword.term.toLowerCase()));
  const scored = unique.map((entry) => {
    const lower = entry.text.toLowerCase();
    let keywordHits = 0;

    keywordSet.forEach((keyword) => {
      if (keyword && lower.includes(keyword)) {
        keywordHits += 1;
      }
    });

    const lengthScore = entry.text.length >= 80 && entry.text.length <= 450 ? 1 : 0;
    return {
      ...entry,
      score: keywordHits * 3 + lengthScore,
    };
  });

  const picked = new Map<number, { text: string; index: number; score: number }>();
  const first = scored[0];
  const middle = scored[Math.floor(scored.length / 2)];
  const last = scored[scored.length - 1];

  [first, middle, last].forEach((entry) => {
    if (entry) {
      picked.set(entry.index, entry);
    }
  });

  for (const entry of [...scored].sort((a, b) => b.score - a.score)) {
    if (picked.size >= MAX_KEY_BODY_SECTIONS) {
      break;
    }
    picked.set(entry.index, entry);
  }

  return [...picked.values()]
    .sort((a, b) => a.index - b.index)
    .map((entry) => truncateText(entry.text, MAX_BODY_SECTION_CHARS));
}

function prepareModelContext(diagnostics: DocumentDiagnostics): PreparedModelContext {
  const title = truncateText(diagnostics.title, MAX_TITLE_CHARS);
  const intro = truncateText(diagnostics.intro, MAX_INTRO_CHARS);
  const headings = diagnostics.headings.slice(0, MAX_HEADINGS).map((heading) => truncateText(heading, MAX_HEADING_CHARS));
  const ctaSentence = diagnostics.ctaSentence ? truncateText(diagnostics.ctaSentence, MAX_CTA_CHARS) : null;
  const keyBodySections = selectKeyBodySections(diagnostics);

  const contextParts = [
    `Title: ${title}`,
    headings.length > 0 ? `Headings:\n- ${headings.join("\n- ")}` : "Headings: none detected",
    `Intro: ${intro}`,
    ctaSentence ? `CTA: ${ctaSentence}` : "CTA: not explicitly detected",
    keyBodySections.length > 0
      ? `Key body sections:\n- ${keyBodySections.join("\n- ")}`
      : "Key body sections: none extracted",
  ];

  const combinedContext = contextParts.join("\n\n");
  const excerpt = truncateText(combinedContext, MAX_PROMPT_DOC_CHARS);

  const previewBlocks = diagnostics.previewBlocks.slice(0, MAX_PREVIEW_BLOCK_COUNT).map((block) => ({
    id: block.id,
    index: block.index,
    type: block.kind,
    content: truncateText(block.text, MAX_PREVIEW_BLOCK_TEXT_CHARS),
    listLevel: block.listLevel,
    listOrder: block.listOrder,
  }));

  return {
    title,
    intro,
    headings,
    ctaSentence,
    keyBodySections,
    excerpt,
    previewBlocks,
    wasReduced:
      diagnostics.documentText.length > MAX_PROMPT_DOC_CHARS ||
      diagnostics.previewBlocks.length > MAX_PREVIEW_BLOCK_COUNT ||
      diagnostics.headings.length > MAX_HEADINGS ||
      diagnostics.paragraphs.length > keyBodySections.length,
    originalChars: diagnostics.documentText.length,
    analyzedChars: excerpt.length,
    droppedParagraphEstimate: Math.max(0, diagnostics.paragraphs.length - keyBodySections.length),
  };
}

function buildHeuristicFallbackSuggestions(diagnostics: DocumentDiagnostics): SeoSuggestion[] {
  const titleIndex = diagnostics.previewBlocks.find((block) => block.kind === "title")?.index ?? 0;
  const introIndex = diagnostics.previewBlocks.find((block) => block.kind === "paragraph")?.index ?? 1;
  const headingIndex = diagnostics.previewBlocks.find((block) => block.kind === "heading")?.index ?? introIndex;

  const primaryKeyword = diagnostics.topKeywords[0]?.term;
  const suggestions: SeoSuggestion[] = [];

  suggestions.push({
    id: "fallback-title-keyword",
    title: "Strengthen title keyword focus",
    reason: "Clear keyword alignment in the title improves search relevance signals.",
    currentText: diagnostics.title,
    suggestedText: primaryKeyword
      ? `${diagnostics.title} | ${primaryKeyword}`
      : `${diagnostics.title} | Practical Guide`,
    targetType: "title",
    targetIndex: titleIndex,
    originalTextSnippet: diagnostics.title,
    suggestedReplacementText: primaryKeyword
      ? `${diagnostics.title} | ${primaryKeyword}`
      : `${diagnostics.title} | Practical Guide`,
    impact: "High",
    projectedGain: 8,
    category: "Title",
  });

  suggestions.push({
    id: "fallback-intro-intent",
    title: "Clarify search intent in intro",
    reason: "The intro should state audience problem and expected outcome in plain language.",
    currentText: diagnostics.intro,
    suggestedText: `${truncateText(diagnostics.intro, 180)} Add one sentence that names audience intent and expected result.`,
    targetType: "paragraph",
    targetIndex: introIndex,
    originalTextSnippet: truncateText(diagnostics.intro, 120),
    suggestedReplacementText: `${truncateText(diagnostics.intro, 180)} Add one sentence that names audience intent and expected result.`,
    impact: "Medium",
    projectedGain: 5,
    category: "Intent",
  });

  suggestions.push({
    id: "fallback-heading-structure",
    title: "Improve heading scannability",
    reason: "Stronger headings improve structure and make key terms easier to crawl.",
    currentText: diagnostics.headings[0] ?? "",
    suggestedText: diagnostics.headings[0]
      ? `${diagnostics.headings[0]}: Key Benefits`
      : "Add descriptive H2 headings that mirror user search questions.",
    targetType: "heading",
    targetIndex: headingIndex,
    originalTextSnippet: diagnostics.headings[0] ?? "",
    suggestedReplacementText: diagnostics.headings[0]
      ? `${diagnostics.headings[0]}: Key Benefits`
      : "Add descriptive H2 headings that mirror user search questions.",
    impact: "Medium",
    projectedGain: 5,
    category: "Headings",
  });

  suggestions.push({
    id: "fallback-cta-clarity",
    title: "Make CTA explicit and action-oriented",
    reason: "Documents with a direct CTA improve conversion clarity.",
    currentText: diagnostics.ctaSentence ?? "No clear CTA sentence found.",
    suggestedText: diagnostics.ctaSentence
      ? `${diagnostics.ctaSentence} Include one measurable next step and a timeframe.`
      : "Add a final sentence with a specific action, owner, and timeline.",
    targetType: "phrase",
    targetIndex: introIndex,
    originalTextSnippet: diagnostics.ctaSentence ?? diagnostics.intro,
    suggestedReplacementText: diagnostics.ctaSentence
      ? `${diagnostics.ctaSentence} Include one measurable next step and a timeframe.`
      : "Add a final sentence with a specific action, owner, and timeline.",
    impact: "High",
    projectedGain: 7,
    category: "CTA",
  });

  return suggestions.slice(0, 10);
}

function normalizeSuggestionsWithRecovery(input: {
  value: unknown;
  diagnostics: DocumentDiagnostics;
  requestId: string;
}): SeoSuggestion[] {
  const { value, diagnostics, requestId } = input;

  try {
    const suggestions = normalizeSuggestions(value, diagnostics);
    if (suggestions.length > 0) {
      return suggestions;
    }
  } catch (error) {
    console.error("[Cenzer SEO][Model] Suggestion normalization failed", {
      stage: "response-validation",
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  const fallback = buildHeuristicFallbackSuggestions(diagnostics);

  if (fallback.length > 0) {
    console.warn("[Cenzer SEO][Model] Using heuristic suggestion recovery", {
      stage: "response-validation",
      requestId,
      suggestions: fallback.length,
    });
    return fallback;
  }

  throw new Error("[stage=response-validation] Suggestions were missing and recovery failed.");
}

function buildPrompt(input: DocumentDiagnostics, prepared: PreparedModelContext) {
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
        title: prepared.title,
        intro: prepared.intro,
        headings: prepared.headings,
        topKeywords: input.topKeywords,
        readabilitySentenceLength: Number(input.readabilitySentenceLength.toFixed(1)),
        ctaSentence: prepared.ctaSentence,
        heuristicBaseline: {
          overallScore: input.heuristicOverallScore,
          scoreBreakdown: input.heuristicBreakdown,
        },
        contentStrategy: {
          wasReduced: prepared.wasReduced,
          originalChars: prepared.originalChars,
          analyzedChars: prepared.analyzedChars,
          droppedParagraphEstimate: prepared.droppedParagraphEstimate,
          keyBodySections: prepared.keyBodySections,
        },
        previewBlocks: prepared.previewBlocks,
        documentExcerpt: prepared.excerpt,
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

async function parseModelPayloadWithRepair(rawModelResponse: string, context: ModelRequestContext) {
  const isDev = process.env.NODE_ENV !== "production";

  console.info("[Cenzer SEO][Model] Raw model response length", {
    stage: "model-json-parse",
    requestId: context.requestId,
    characters: rawModelResponse.length,
  });

  if (isDev) {
    console.info("[Cenzer SEO][Model] Raw response preview", {
      stage: "model-json-parse",
      requestId: context.requestId,
      preview: getDevLogSnippet(rawModelResponse, 500),
    });
  }

  let candidate = "";

  try {
    candidate = extractJsonCandidate(rawModelResponse);
  } catch (error) {
    if (isDev) {
      console.error("[Cenzer SEO][Model] JSON extraction failed", {
        stage: "model-json-parse",
        requestId: context.requestId,
        rawPreview: getDevLogSnippet(rawModelResponse, 500),
      });
    }
    throw error;
  }

  console.info("[Cenzer SEO][Model] Extracted JSON candidate length", {
    stage: "model-json-parse",
    requestId: context.requestId,
    characters: candidate.length,
  });

  try {
    const parsed = tryParseJson("model-json-parse-primary", candidate);
    console.info("[Cenzer SEO][Model] JSON parse success", {
      stage: "model-json-parse",
      requestId: context.requestId,
      attempt: "primary",
    });
    return parsed;
  } catch (primaryError) {
    const sanitized = sanitizeJsonCandidate(candidate);

    if (isDev) {
      console.error("[Cenzer SEO][Model] JSON parse failed", {
        stage: "model-json-parse",
        requestId: context.requestId,
        attempt: "primary",
        error: primaryError instanceof Error ? primaryError.message : "unknown",
        candidatePreview: getDevLogSnippet(candidate, 500),
      });
    }

    if (sanitized !== candidate) {
      try {
        const parsedSanitized = tryParseJson("model-json-parse-sanitized", sanitized);
        console.info("[Cenzer SEO][Model] JSON parse success", {
          stage: "model-json-parse",
          requestId: context.requestId,
          attempt: "sanitized",
        });
        return parsedSanitized;
      } catch (sanitizedError) {
        if (isDev) {
          console.error("[Cenzer SEO][Model] JSON parse failed", {
            stage: "model-json-parse",
            requestId: context.requestId,
            attempt: "sanitized",
            error: sanitizedError instanceof Error ? sanitizedError.message : "unknown",
            candidatePreview: getDevLogSnippet(sanitized, 500),
          });
        }
      }
    }

    const repairedRaw = await requestAnthropicText({
      prompt: buildRepairPrompt(rawModelResponse),
      mode: "repair",
      context,
    });

    console.info("[Cenzer SEO][Model] Repair response received", {
      stage: "model-json-parse",
      requestId: context.requestId,
      characters: repairedRaw.length,
    });

    if (isDev) {
      console.info("[Cenzer SEO][Model] Repair response preview", {
        stage: "model-json-parse",
        requestId: context.requestId,
        preview: getDevLogSnippet(repairedRaw, 500),
      });
    }

    const repairedCandidate = extractJsonCandidate(repairedRaw);

    console.info("[Cenzer SEO][Model] Repaired JSON candidate length", {
      stage: "model-json-parse",
      requestId: context.requestId,
      characters: repairedCandidate.length,
    });

    try {
      const repairedParsed = tryParseJson("model-json-parse-repair", repairedCandidate);
      console.info("[Cenzer SEO][Model] JSON parse success", {
        stage: "model-json-parse",
        requestId: context.requestId,
        attempt: "repair",
      });
      return repairedParsed;
    } catch (repairError) {
      if (isDev) {
        console.error("[Cenzer SEO][Model] JSON parse failed", {
          stage: "model-json-parse",
          requestId: context.requestId,
          attempt: "repair",
          error: repairError instanceof Error ? repairError.message : "unknown",
          candidatePreview: getDevLogSnippet(repairedCandidate, 500),
        });
      }

      throw new Error(
        `[stage=model-json-parse] Final JSON parse failed after recovery: ${
          repairError instanceof Error ? repairError.message : "unknown"
        }`,
      );
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
  context: ModelRequestContext,
): Promise<SeoAnalysisResult> {
  console.info("[Cenzer SEO][Model] Analysis started", {
    stage: "model-request",
    requestId: context.requestId,
    fileName: diagnostics.fileName,
    wordCount: diagnostics.wordCount,
  });

  const prepared = prepareModelContext(diagnostics);

  console.info("[Cenzer SEO][Model] Document preprocessing complete", {
    stage: "model-request",
    requestId: context.requestId,
    wasReduced: prepared.wasReduced,
    originalChars: prepared.originalChars,
    analyzedChars: prepared.analyzedChars,
    previewBlocks: prepared.previewBlocks.length,
    keyBodySections: prepared.keyBodySections.length,
    droppedParagraphEstimate: prepared.droppedParagraphEstimate,
  });

  const prompt = buildPrompt(diagnostics, prepared);
  const outputText = await requestAnthropicText({
    prompt,
    mode: "analysis",
    context,
  });

  let payload: ModelAnalysisPayload;

  try {
    payload = await parseModelPayloadWithRepair(outputText, context);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse failure.";
    throw new Error(message);
  }

  console.info("[Cenzer SEO][Model] Response payload checkpoints", {
    stage: "response-validation",
    requestId: context.requestId,
    hasOverallScore: typeof payload.overallScore === "number",
    hasProjectedScore: typeof payload.projectedScore === "number",
    hasStatus: typeof payload.status === "string",
    hasScoreBreakdown: typeof payload.scoreBreakdown === "object" && payload.scoreBreakdown !== null,
    hasSuggestions: Array.isArray(payload.suggestions),
  });

  const scoreBreakdown = normalizeBreakdown(payload.scoreBreakdown, diagnostics.heuristicBreakdown);
  const overallScore = clampScore(asInteger(payload.overallScore, diagnostics.heuristicOverallScore));
  const modelProjectedScore = Math.max(
    overallScore,
    clampScore(asInteger(payload.projectedScore, Math.min(100, overallScore + 14))),
  );
  const status = normalizeStatus(payload.status, overallScore);

  const suggestions = normalizeSuggestionsWithRecovery({
    value: payload.suggestions,
    diagnostics,
    requestId: context.requestId,
  });

  if (suggestions.length < 1) {
    throw new Error("[stage=response-validation] Suggestion list is empty after recovery.");
  }

  const projectedScore = computeRealisticProjectedScore({
    overallScore,
    modelProjectedScore,
    suggestions,
  });

  console.info("[Cenzer SEO][Model] Analysis complete", {
    stage: "response-validation",
    requestId: context.requestId,
    overallScore,
    projectedScore,
    suggestions: suggestions.length,
    status,
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
    status,
    scoreBreakdown,
    previewBlocks: normalizePreviewBlocks(payload.previewBlocks, diagnostics.previewBlocks),
    suggestions,
  };
}
