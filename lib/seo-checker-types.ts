export type SeoStatusLabel = "Strong" | "Needs Improvement" | "Weak";

export type SeoImpactLevel = "High" | "Medium" | "Low";

export type SeoSuggestionCategory =
  | "Title"
  | "Headings"
  | "Keywords"
  | "Readability"
  | "Intent"
  | "CTA"
  | "Structure";

export type SeoSuggestionTargetType = "title" | "heading" | "paragraph" | "phrase";

export type SeoScoreBreakdown = {
  titleClarityKeywordRelevance: number;
  headingHierarchyStructure: number;
  keywordPlacement: number;
  readabilitySentenceClarity: number;
  searchIntentMatch: number;
  ctaClarity: number;
  paragraphScannability: number;
  repetitionKeywordStuffing: number;
  metaReadiness: number;
  internalLinkingReadiness: number;
  audienceRelevance: number;
  actionabilitySpecificity: number;
};

export type SeoPreviewBlock = {
  id: string;
  index: number;
  kind: "title" | "heading" | "paragraph" | "list-item";
  text: string;
  listLevel?: number;
  listOrder?: number;
};

export type SeoSuggestion = {
  id: string;
  title: string;
  reason: string;
  currentText: string;
  suggestedText: string;
  targetType: SeoSuggestionTargetType;
  targetIndex: number;
  originalTextSnippet: string;
  suggestedReplacementText: string;
  impact: SeoImpactLevel;
  projectedGain: number;
  category: SeoSuggestionCategory;
};

export type SeoAnalysisResult = {
  analysisId: string;
  fileName: string;
  uploadDate: string;
  wordCount: number;
  documentText: string;
  overallScore: number;
  currentScore: number;
  projectedScore: number;
  status: SeoStatusLabel;
  scoreBreakdown: SeoScoreBreakdown;
  previewBlocks: SeoPreviewBlock[];
  suggestions: SeoSuggestion[];
};

export type SeoAnalyzeApiResponse = {
  analysis: SeoAnalysisResult;
  requestId?: string;
};

export type SeoFinalizeRequest = {
  analysisId: string;
  analysis: SeoAnalysisResult;
  acceptedSuggestionIds: string[];
  rejectedSuggestionIds: string[];
  projectedScore: number;
};