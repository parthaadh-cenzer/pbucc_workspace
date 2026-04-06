import type { DocxParagraphNode } from "@/lib/seo-checker-docx-structure";
import type { SeoPreviewBlock, SeoScoreBreakdown, SeoStatusLabel } from "@/lib/seo-checker-types";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "he",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "that",
  "the",
  "to",
  "was",
  "were",
  "will",
  "with",
  "you",
  "your",
  "our",
  "this",
  "we",
  "they",
  "their",
  "or",
  "but",
  "can",
  "if",
  "into",
  "about",
]);

export type KeywordStat = {
  term: string;
  count: number;
  density: number;
};

export type DocumentDiagnostics = {
  fileName: string;
  uploadDate: string;
  documentText: string;
  title: string;
  intro: string;
  headings: string[];
  paragraphs: string[];
  sentences: string[];
  topKeywords: KeywordStat[];
  readabilitySentenceLength: number;
  ctaSentence: string | null;
  wordCount: number;
  previewBlocks: SeoPreviewBlock[];
  heuristicBreakdown: SeoScoreBreakdown;
  heuristicOverallScore: number;
  status: SeoStatusLabel;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
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

function splitSentences(text: string) {
  return text
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeWords(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function getTopKeywords(words: string[], totalWords: number, limit = 6): KeywordStat[] {
  const counts = new Map<string, number>();

  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term, count]) => ({
      term,
      count,
      density: totalWords > 0 ? (count / totalWords) * 100 : 0,
    }));
}

function scoreTitleClarityKeywordRelevance(title: string, primaryKeyword: string | null) {
  const wordCount = title.split(/\s+/).filter(Boolean).length;
  let score = 42;

  if (wordCount >= 5 && wordCount <= 12) {
    score += 28;
  } else if (wordCount >= 3 && wordCount <= 15) {
    score += 16;
  }

  if (title.length >= 35 && title.length <= 70) {
    score += 18;
  }

  if (primaryKeyword && title.toLowerCase().includes(primaryKeyword.toLowerCase())) {
    score += 12;
  }

  return clampScore(score);
}

function scoreHeadingHierarchyStructure(headings: string[]) {
  let score = 40;

  if (headings.length >= 3 && headings.length <= 10) {
    score += 30;
  } else if (headings.length >= 2) {
    score += 18;
  }

  const averageWords =
    headings.length > 0
      ? headings.reduce((total, heading) => total + heading.split(/\s+/).filter(Boolean).length, 0) /
        headings.length
      : 0;

  if (averageWords >= 3 && averageWords <= 12) {
    score += 20;
  }

  return clampScore(score);
}

function scoreKeywordPlacement(
  title: string,
  headings: string[],
  intro: string,
  text: string,
  primaryKeyword: string | null,
) {
  if (!primaryKeyword) {
    return 45;
  }

  const lowerKeyword = primaryKeyword.toLowerCase();
  const checks = [
    title.toLowerCase().includes(lowerKeyword),
    headings.some((heading) => heading.toLowerCase().includes(lowerKeyword)),
    intro.toLowerCase().includes(lowerKeyword),
    text.toLowerCase().includes(lowerKeyword),
  ];

  const matched = checks.filter(Boolean).length;
  return clampScore(35 + matched * 16);
}

function scoreReadabilitySentenceClarity(sentences: string[]) {
  if (sentences.length < 1) {
    return 40;
  }

  const averageWords =
    sentences.reduce((total, sentence) => total + sentence.split(/\s+/).filter(Boolean).length, 0) /
    sentences.length;

  let score = 40;

  if (averageWords >= 12 && averageWords <= 20) {
    score += 35;
  } else if (averageWords >= 9 && averageWords <= 24) {
    score += 20;
  }

  if (sentences.length >= 6) {
    score += 12;
  }

  return clampScore(score);
}

function scoreSearchIntentMatch(title: string, intro: string, primaryKeyword: string | null) {
  if (!primaryKeyword) {
    return 48;
  }

  const keyword = primaryKeyword.toLowerCase();
  const titleMatch = title.toLowerCase().includes(keyword);
  const introMatch = intro.toLowerCase().includes(keyword);

  let score = 46;

  if (titleMatch) {
    score += 22;
  }

  if (introMatch) {
    score += 22;
  }

  return clampScore(score);
}

function scoreCtaClarity(ctaSentence: string | null) {
  if (!ctaSentence) {
    return 36;
  }

  let score = 66;

  if (ctaSentence.split(/\s+/).filter(Boolean).length <= 20) {
    score += 14;
  }

  if (/now|today|free|start|join|book|contact|download|trial/i.test(ctaSentence)) {
    score += 12;
  }

  return clampScore(score);
}

function scoreParagraphScannability(paragraphs: string[]) {
  if (paragraphs.length < 1) {
    return 40;
  }

  const averageWords =
    paragraphs.reduce((total, paragraph) => total + paragraph.split(/\s+/).filter(Boolean).length, 0) /
    paragraphs.length;

  let score = 40;

  if (averageWords >= 30 && averageWords <= 90) {
    score += 32;
  } else if (averageWords >= 20 && averageWords <= 120) {
    score += 18;
  }

  if (paragraphs.length >= 4) {
    score += 15;
  }

  return clampScore(score);
}

function scoreRepetitionKeywordStuffing(topKeywords: KeywordStat[]) {
  if (topKeywords.length < 1) {
    return 55;
  }

  const topDensity = topKeywords[0].density;

  if (topDensity > 3.8) {
    return 38;
  }

  if (topDensity > 2.8) {
    return 58;
  }

  if (topDensity >= 0.8 && topDensity <= 2.3) {
    return 86;
  }

  return 72;
}

function scoreMetaReadiness(title: string, intro: string) {
  let score = 44;

  if (title.length >= 35 && title.length <= 70) {
    score += 25;
  }

  if (intro.length >= 100 && intro.length <= 180) {
    score += 20;
  }

  return clampScore(score);
}

function scoreInternalLinkingReadiness(text: string) {
  const hasAnchorLikeLanguage = /learn more|related|guide|resources|see also|read more/i.test(text);
  return clampScore(hasAnchorLikeLanguage ? 78 : 56);
}

function scoreAudienceRelevance(intro: string) {
  const hasAudienceCallout = /for\s+\w+|teams|businesses|marketers|customers|audience/i.test(intro);
  return clampScore(hasAudienceCallout ? 80 : 60);
}

function scoreActionabilitySpecificity(text: string) {
  const hasActionVerbs = /improve|increase|reduce|optimize|build|create|launch|measure/i.test(text);
  return clampScore(hasActionVerbs ? 78 : 58);
}

export function buildPreviewBlocksFromParagraphNodes(paragraphNodes: DocxParagraphNode[]): SeoPreviewBlock[] {
  const blocks = paragraphNodes
    .filter((node) => node.text.length > 0)
    .map((node) => ({
      id: `preview-${node.index}`,
      index: node.index,
      kind: node.kind,
      text: node.text,
      listLevel: node.listLevel,
      listOrder: node.listOrder ?? undefined,
    }));

  return blocks.length > 0
    ? blocks
    : [
        {
          id: "preview-fallback",
          index: 0,
          kind: "paragraph",
          text: "No readable content was extracted from the uploaded document preview.",
        },
      ];
}

export function createUploadDateLabel(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildDocumentDiagnostics(input: {
  fileName: string;
  documentText: string;
  uploadDate: string;
  paragraphNodes: DocxParagraphNode[];
}): DocumentDiagnostics {
  const { fileName, documentText, uploadDate, paragraphNodes } = input;
  const sourceText = documentText.trim();
  const nonEmptyParagraphs = paragraphNodes
    .map((paragraph) => paragraph.text)
    .filter((text) => text.length > 0);
  const sentences = splitSentences(sourceText);
  const words = sourceText.split(/\s+/).filter(Boolean);
  const filteredWords = normalizeWords(sourceText);
  const topKeywords = getTopKeywords(filteredWords, words.length, 6);
  const title = nonEmptyParagraphs[0] ?? fileName.replace(/\.docx$/i, "");
  const headings = paragraphNodes
    .filter((paragraph) => paragraph.kind === "heading")
    .map((paragraph) => paragraph.text)
    .filter(Boolean);

  const intro = nonEmptyParagraphs.find((paragraph, index) => index > 0 && paragraph.length > 45) ?? nonEmptyParagraphs[1] ?? "";
  const ctaSentence =
    sentences.find((sentence) =>
      /join|contact|sign up|register|learn more|book|start|download|call|buy|subscribe/i.test(sentence),
    ) ?? null;

  const readabilitySentenceLength =
    sentences.length > 0
      ? sentences.reduce((total, sentence) => total + sentence.split(/\s+/).filter(Boolean).length, 0) /
        sentences.length
      : words.length;

  const primaryKeyword = topKeywords[0]?.term ?? null;
  const heuristicBreakdown: SeoScoreBreakdown = {
    titleClarityKeywordRelevance: scoreTitleClarityKeywordRelevance(title, primaryKeyword),
    headingHierarchyStructure: scoreHeadingHierarchyStructure(headings),
    keywordPlacement: scoreKeywordPlacement(title, headings, intro, sourceText, primaryKeyword),
    readabilitySentenceClarity: scoreReadabilitySentenceClarity(sentences),
    searchIntentMatch: scoreSearchIntentMatch(title, intro, primaryKeyword),
    ctaClarity: scoreCtaClarity(ctaSentence),
    paragraphScannability: scoreParagraphScannability(nonEmptyParagraphs),
    repetitionKeywordStuffing: scoreRepetitionKeywordStuffing(topKeywords),
    metaReadiness: scoreMetaReadiness(title, intro),
    internalLinkingReadiness: scoreInternalLinkingReadiness(sourceText),
    audienceRelevance: scoreAudienceRelevance(intro),
    actionabilitySpecificity: scoreActionabilitySpecificity(sourceText),
  };

  const heuristicOverallScore = clampScore(
    Object.values(heuristicBreakdown).reduce((total, value) => total + value, 0) /
      Object.values(heuristicBreakdown).length,
  );

  return {
    fileName,
    uploadDate,
    documentText: sourceText,
    title,
    intro,
    headings,
    paragraphs: nonEmptyParagraphs,
    sentences,
    topKeywords,
    readabilitySentenceLength,
    ctaSentence,
    wordCount: words.length,
    previewBlocks: buildPreviewBlocksFromParagraphNodes(paragraphNodes),
    heuristicBreakdown,
    heuristicOverallScore,
    status: getStatusFromScore(heuristicOverallScore),
  };
}
