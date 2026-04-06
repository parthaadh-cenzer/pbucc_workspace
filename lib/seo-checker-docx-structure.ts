import JSZip from "jszip";
import mammoth from "mammoth";
import type { SeoAnalysisResult, SeoSuggestion } from "@/lib/seo-checker-types";

const DOCUMENT_XML_PATH = "word/document.xml";
const PARAGRAPH_REGEX = /<w:p\b[\s\S]*?<\/w:p>/g;

export type DocxParagraphNode = {
  index: number;
  xml: string;
  text: string;
  kind: "title" | "heading" | "paragraph" | "list-item";
  listLevel: number;
  listOrder: number | null;
  numId: string | null;
};

export type ParsedDocxStructure = {
  zip: JSZip;
  documentXml: string;
  paragraphs: DocxParagraphNode[];
  plainText: string;
};

function decodeXmlText(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#xA;/g, "\n");
}

function encodeXmlText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getParagraphText(paragraphXml: string) {
  const texts: string[] = [];
  const regex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
  let match = regex.exec(paragraphXml);

  while (match) {
    texts.push(decodeXmlText(match[1]));
    match = regex.exec(paragraphXml);
  }

  return texts.join("").replace(/\s+/g, " ").trim();
}

function getStyleId(paragraphXml: string) {
  const match = paragraphXml.match(/<w:pStyle\b[^>]*w:val="([^"]+)"/i);
  return match?.[1] ?? null;
}

function getListMeta(paragraphXml: string) {
  const numIdMatch = paragraphXml.match(/<w:numId\b[^>]*w:val="([^"]+)"/i);
  const ilvlMatch = paragraphXml.match(/<w:ilvl\b[^>]*w:val="([^"]+)"/i);

  return {
    numId: numIdMatch?.[1] ?? null,
    listLevel: ilvlMatch ? Number.parseInt(ilvlMatch[1], 10) || 0 : 0,
  };
}

function getParagraphKind(input: {
  index: number;
  text: string;
  styleId: string | null;
  numId: string | null;
}) {
  const { index, text, styleId, numId } = input;
  const normalizedStyle = (styleId ?? "").toLowerCase();

  if (index === 0 || normalizedStyle === "title") {
    return "title" as const;
  }

  if (normalizedStyle.startsWith("heading")) {
    return "heading" as const;
  }

  if (numId) {
    return "list-item" as const;
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (text.length <= 90 && wordCount <= 12) {
    return "heading" as const;
  }

  return "paragraph" as const;
}

export async function getDocxBufferFromFile(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function parseDocxStructure(buffer: Buffer): Promise<ParsedDocxStructure> {
  const zip = await JSZip.loadAsync(buffer);
  const documentFile = zip.file(DOCUMENT_XML_PATH);

  if (!documentFile) {
    throw new Error("[docx-xml] word/document.xml is missing.");
  }

  const documentXml = await documentFile.async("string");
  const paragraphs: DocxParagraphNode[] = [];
  const listCounters = new Map<string, number>();

  let match = PARAGRAPH_REGEX.exec(documentXml);
  let paragraphIndex = 0;

  while (match) {
    const paragraphXml = match[0];
    const text = getParagraphText(paragraphXml);
    const styleId = getStyleId(paragraphXml);
    const listMeta = getListMeta(paragraphXml);
    const kind = getParagraphKind({
      index: paragraphIndex,
      text,
      styleId,
      numId: listMeta.numId,
    });

    let listOrder: number | null = null;

    if (listMeta.numId) {
      const counterKey = `${listMeta.numId}:${listMeta.listLevel}`;
      const next = (listCounters.get(counterKey) ?? 0) + 1;
      listCounters.set(counterKey, next);
      listOrder = next;
    }

    paragraphs.push({
      index: paragraphIndex,
      xml: paragraphXml,
      text,
      kind,
      listLevel: listMeta.listLevel,
      listOrder,
      numId: listMeta.numId,
    });

    paragraphIndex += 1;
    match = PARAGRAPH_REGEX.exec(documentXml);
  }

  let plainText = paragraphs
    .map((paragraph) => paragraph.text)
    .filter((value) => value.length > 0)
    .join("\n\n")
    .trim();

  if (!plainText) {
    const fallback = await mammoth.extractRawText({ buffer });
    plainText = fallback.value
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return {
    zip,
    documentXml,
    paragraphs,
    plainText,
  };
}

function getParagraphPropertiesXml(paragraphXml: string) {
  const match = paragraphXml.match(/<w:pPr[\s\S]*?<\/w:pPr>/i);
  return match?.[0] ?? "";
}

function buildCalibriRunXml(text: string) {
  return [
    "<w:r>",
    "<w:rPr>",
    '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/>',
    '<w:sz w:val="22"/>',
    '<w:szCs w:val="22"/>',
    "</w:rPr>",
    `<w:t xml:space="preserve">${encodeXmlText(text)}</w:t>`,
    "</w:r>",
  ].join("");
}

function rebuildParagraphXml(paragraphXml: string, text: string) {
  const pPr = getParagraphPropertiesXml(paragraphXml);
  return `<w:p>${pPr}${buildCalibriRunXml(text)}</w:p>`;
}

function replaceFirst(text: string, find: string, replacement: string) {
  const index = text.indexOf(find);

  if (index < 0) {
    return null;
  }

  return `${text.slice(0, index)}${replacement}${text.slice(index + find.length)}`;
}

function resolveTargetIndex(suggestion: SeoSuggestion, paragraphs: DocxParagraphNode[]) {
  if (suggestion.targetIndex >= 0 && suggestion.targetIndex < paragraphs.length) {
    return suggestion.targetIndex;
  }

  const snippet = suggestion.originalTextSnippet.trim() || suggestion.currentText.trim();
  if (!snippet) {
    return -1;
  }

  return paragraphs.findIndex((paragraph) => paragraph.text.includes(snippet));
}

function applySuggestionToParagraph(input: {
  paragraph: DocxParagraphNode;
  suggestion: SeoSuggestion;
}) {
  const { paragraph, suggestion } = input;
  const originalText = paragraph.text;
  const find = suggestion.originalTextSnippet.trim() || suggestion.currentText.trim();
  const replacement = suggestion.suggestedReplacementText.trim() || suggestion.suggestedText.trim();

  if (!replacement) {
    return null;
  }

  if (suggestion.targetType === "phrase") {
    if (!find) {
      return null;
    }

    const replaced = replaceFirst(originalText, find, replacement);
    if (!replaced) {
      return null;
    }

    return {
      nextText: replaced,
      appliedMessage: `${suggestion.title}: applied inline phrase replacement.`,
    };
  }

  if (
    suggestion.targetType === "title" ||
    suggestion.targetType === "heading" ||
    suggestion.targetType === "paragraph"
  ) {
    return {
      nextText: replacement,
      appliedMessage: `${suggestion.title}: updated targeted ${suggestion.targetType} block.`,
    };
  }

  return null;
}

function buildSummaryParagraphXml(text: string, headingLevel?: 1 | 2) {
  const pPr =
    headingLevel === 1
      ? '<w:pPr><w:pStyle w:val="Heading1"/></w:pPr>'
      : headingLevel === 2
        ? '<w:pPr><w:pStyle w:val="Heading2"/></w:pPr>'
        : "";

  return `<w:p>${pPr}${buildCalibriRunXml(text)}</w:p>`;
}

function buildSummaryXml(input: {
  originalScore: number;
  finalScore: number;
  totalSuggestions: number;
  acceptedCount: number;
  rejectedCount: number;
  appliedChanges: string[];
  acceptedTitles: string[];
  rejectedTitles: string[];
  timestamp: string;
}) {
  const {
    originalScore,
    finalScore,
    totalSuggestions,
    acceptedCount,
    rejectedCount,
    appliedChanges,
    acceptedTitles,
    rejectedTitles,
    timestamp,
  } = input;

  const gain = Math.max(0, finalScore - originalScore);
  let improvementSummary = "No projected SEO gain was detected from accepted suggestions.";

  if (gain >= 18) {
    improvementSummary = "Strong expected SEO uplift in relevance, readability, and conversion clarity.";
  } else if (gain >= 8) {
    improvementSummary = "Moderate expected SEO uplift across ranking signals and reader clarity.";
  } else if (gain > 0) {
    improvementSummary = "Incremental expected SEO uplift based on accepted changes.";
  }

  const lines: string[] = [];
  lines.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
  lines.push(buildSummaryParagraphXml("SEO Checker Summary", 1));
  lines.push(buildSummaryParagraphXml("Brand: Cenzer"));
  lines.push(buildSummaryParagraphXml(`Original SEO score: ${originalScore}`));
  lines.push(buildSummaryParagraphXml(`Final/projected SEO score: ${finalScore}`));
  lines.push(buildSummaryParagraphXml(`Total suggestions: ${totalSuggestions}`));
  lines.push(buildSummaryParagraphXml(`Accepted suggestions count: ${acceptedCount}`));
  lines.push(buildSummaryParagraphXml(`Rejected suggestions count: ${rejectedCount}`));
  lines.push(buildSummaryParagraphXml(`Timestamp: ${timestamp}`));
  lines.push(buildSummaryParagraphXml("Summary bullets of what changed", 2));

  if (appliedChanges.length < 1) {
    lines.push(buildSummaryParagraphXml("- No direct inline replacements were applied."));
  } else {
    for (const line of appliedChanges.slice(0, 24)) {
      lines.push(buildSummaryParagraphXml(`- ${line}`));
    }
  }

  lines.push(buildSummaryParagraphXml("Expected SEO improvement", 2));
  lines.push(buildSummaryParagraphXml(`- ${improvementSummary}`));

  lines.push(buildSummaryParagraphXml("Accepted changes", 2));
  if (acceptedTitles.length < 1) {
    lines.push(buildSummaryParagraphXml("- None"));
  } else {
    for (const title of acceptedTitles.slice(0, 24)) {
      lines.push(buildSummaryParagraphXml(`- ${title}`));
    }
  }

  lines.push(buildSummaryParagraphXml("Rejected changes", 2));
  if (rejectedTitles.length < 1) {
    lines.push(buildSummaryParagraphXml("- None"));
  } else {
    for (const title of rejectedTitles.slice(0, 24)) {
      lines.push(buildSummaryParagraphXml(`- ${title}`));
    }
  }

  return lines.join("");
}

export async function applyAcceptedSuggestionsToDocx(input: {
  originalDocxBuffer: Buffer;
  analysis: SeoAnalysisResult;
  acceptedSuggestionIds: string[];
  rejectedSuggestionIds: string[];
  projectedScore: number;
  timestamp: string;
}) {
  const {
    originalDocxBuffer,
    analysis,
    acceptedSuggestionIds,
    rejectedSuggestionIds,
    projectedScore,
    timestamp,
  } = input;

  const parsed = await parseDocxStructure(originalDocxBuffer);
  const acceptedSet = new Set(acceptedSuggestionIds);
  const accepted = analysis.suggestions.filter((suggestion) => acceptedSet.has(suggestion.id));
  const updatedParagraphXmlByIndex = new Map<number, string>();
  const appliedChanges: string[] = [];

  for (const suggestion of accepted) {
    const index = resolveTargetIndex(suggestion, parsed.paragraphs);

    if (index < 0) {
      appliedChanges.push(`${suggestion.title}: target not found in original document.`);
      continue;
    }

    const paragraph = parsed.paragraphs[index];
    const update = applySuggestionToParagraph({ paragraph, suggestion });

    if (!update || update.nextText === paragraph.text) {
      appliedChanges.push(`${suggestion.title}: no inline change applied.`);
      continue;
    }

    const updatedParagraph = rebuildParagraphXml(paragraph.xml, update.nextText);
    updatedParagraphXmlByIndex.set(index, updatedParagraph);
    parsed.paragraphs[index] = {
      ...paragraph,
      xml: updatedParagraph,
      text: update.nextText,
    };
    appliedChanges.push(update.appliedMessage);
  }

  let paragraphCursor = 0;
  let updatedDocumentXml = parsed.documentXml.replace(PARAGRAPH_REGEX, (paragraphXml) => {
    const replacement = updatedParagraphXmlByIndex.get(paragraphCursor);
    paragraphCursor += 1;
    return replacement ?? paragraphXml;
  });

  const originalScore = analysis.overallScore;
  const maxModelProjected = Math.max(originalScore, analysis.projectedScore);
  const boundedRequestedScore = Math.max(
    originalScore,
    Math.min(maxModelProjected, Math.round(projectedScore)),
  );
  const finalScore = boundedRequestedScore;

  const summaryXml = buildSummaryXml({
    originalScore,
    finalScore,
    totalSuggestions: analysis.suggestions.length,
    acceptedCount: acceptedSuggestionIds.length,
    rejectedCount: rejectedSuggestionIds.length,
    appliedChanges,
    acceptedTitles: accepted.map((item) => item.title),
    rejectedTitles: analysis.suggestions
      .filter((item) => rejectedSuggestionIds.includes(item.id))
      .map((item) => item.title),
    timestamp,
  });

  if (!updatedDocumentXml.includes("</w:body>")) {
    throw new Error("[docx-xml] Could not append summary because </w:body> was not found.");
  }

  updatedDocumentXml = updatedDocumentXml.replace("</w:body>", `${summaryXml}</w:body>`);

  parsed.zip.file(DOCUMENT_XML_PATH, updatedDocumentXml);
  const updatedBuffer = await parsed.zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  return {
    buffer: updatedBuffer,
    appliedChanges,
    finalScore,
  };
}
