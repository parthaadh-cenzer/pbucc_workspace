"use client";

import Image from "next/image";
import { type ChangeEvent, Fragment, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileUp,
  LoaderCircle,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  analyzeSeoDocument,
  downloadFinalSeoDocument,
  type SeoAnalysisResult,
  type SeoImpactLevel,
  type SeoPreviewBlock,
  type SeoSuggestion,
} from "@/lib/seo-checker-client";

type SuggestionDecision = "Accepted" | "Rejected" | null;

const CENZER_LOGO_SRC = "/assets/cenzer_logo.png";

function scoreStatusClass(score: number) {
  if (score >= 78) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  }

  if (score >= 55) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  }

  return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
}

function impactClass(level: SeoImpactLevel) {
  if (level === "High") {
    return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
  }

  if (level === "Medium") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  }

  return "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300";
}

function decisionClass(decision: SuggestionDecision) {
  if (decision === "Accepted") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  }

  if (decision === "Rejected") {
    return "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }

  return "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300";
}

function replaceFirst(text: string, find: string, replacement: string) {
  const index = text.indexOf(find);

  if (index < 0) {
    return text;
  }

  return `${text.slice(0, index)}${replacement}${text.slice(index + find.length)}`;
}

function applyAcceptedSuggestionsToPreview(input: {
  analysis: SeoAnalysisResult;
  reviewDecisions: Record<string, SuggestionDecision>;
}) {
  const { analysis, reviewDecisions } = input;
  const blocksByIndex = new Map<number, SeoPreviewBlock>(
    analysis.previewBlocks.map((block) => [block.index, { ...block }]),
  );

  for (const suggestion of analysis.suggestions) {
    if (reviewDecisions[suggestion.id] !== "Accepted") {
      continue;
    }

    const target = blocksByIndex.get(suggestion.targetIndex);

    if (!target) {
      continue;
    }

    if (suggestion.targetType === "phrase") {
      target.text = replaceFirst(
        target.text,
        suggestion.originalTextSnippet,
        suggestion.suggestedReplacementText,
      );
      continue;
    }

    target.text = suggestion.suggestedReplacementText || suggestion.suggestedText;
  }

  return [...blocksByIndex.values()].sort((a, b) => a.index - b.index);
}

function createHighlightRanges(text: string, snippets: string[]) {
  const ranges: Array<{ start: number; end: number }> = [];

  for (const snippet of snippets) {
    if (!snippet) {
      continue;
    }

    const start = text.indexOf(snippet);
    if (start < 0) {
      continue;
    }

    const end = start + snippet.length;
    if (ranges.some((range) => !(end <= range.start || start >= range.end))) {
      continue;
    }

    ranges.push({ start, end });
  }

  return ranges.sort((a, b) => a.start - b.start);
}

function renderHighlightedText(text: string, snippets: string[], keyPrefix: string) {
  const ranges = createHighlightRanges(text, snippets);

  if (ranges.length < 1) {
    return text;
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  ranges.forEach((range, index) => {
    if (range.start > cursor) {
      parts.push(
        <Fragment key={`${keyPrefix}-plain-${index}`}>{text.slice(cursor, range.start)}</Fragment>,
      );
    }

    parts.push(
      <mark key={`${keyPrefix}-mark-${index}`} className="rounded bg-yellow-200 px-0.5">
        {text.slice(range.start, range.end)}
      </mark>,
    );

    cursor = range.end;
  });

  if (cursor < text.length) {
    parts.push(<Fragment key={`${keyPrefix}-tail`}>{text.slice(cursor)}</Fragment>);
  }

  return parts;
}

export function SeoCheckerWorkspace() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [analysis, setAnalysis] = useState<SeoAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [reviewDecisions, setReviewDecisions] = useState<Record<string, SuggestionDecision>>({});

  const progress = useMemo(() => {
    if (!analysis) {
      return {
        total: 0,
        accepted: 0,
        rejected: 0,
        pending: 0,
      };
    }

    const total = analysis.suggestions.length;
    const accepted = analysis.suggestions.filter(
      (suggestion) => reviewDecisions[suggestion.id] === "Accepted",
    ).length;
    const rejected = analysis.suggestions.filter(
      (suggestion) => reviewDecisions[suggestion.id] === "Rejected",
    ).length;

    return {
      total,
      accepted,
      rejected,
      pending: total - accepted - rejected,
    };
  }, [analysis, reviewDecisions]);

  const nextPendingSuggestionId = useMemo(() => {
    if (!analysis) {
      return null;
    }

    const nextPending = analysis.suggestions.find((suggestion) => !reviewDecisions[suggestion.id]);
    return nextPending?.id ?? null;
  }, [analysis, reviewDecisions]);

  const projectedScore = useMemo(() => {
    if (!analysis) {
      return 0;
    }

    const totalPotentialRaw = analysis.suggestions.reduce(
      (total, suggestion) => total + Math.max(1, suggestion.projectedGain),
      0,
    );

    if (totalPotentialRaw < 1) {
      return analysis.overallScore;
    }

    const acceptedPotentialRaw = analysis.suggestions.reduce((total, suggestion) => {
      if (reviewDecisions[suggestion.id] === "Accepted") {
        return total + Math.max(1, suggestion.projectedGain);
      }

      return total;
    }, 0);

    const maxAllowedGain = Math.max(0, analysis.projectedScore - analysis.overallScore);
    const scaledGain = Math.round((acceptedPotentialRaw / totalPotentialRaw) * maxAllowedGain);

    return Math.min(analysis.projectedScore, analysis.overallScore + scaledGain);
  }, [analysis, reviewDecisions]);

  const displayedPreviewBlocks = useMemo(() => {
    if (!analysis) {
      return [];
    }

    return applyAcceptedSuggestionsToPreview({
      analysis,
      reviewDecisions,
    });
  }, [analysis, reviewDecisions]);

  const pendingSuggestionsByTarget = useMemo(() => {
    if (!analysis) {
      return new Map<number, SeoSuggestion[]>();
    }

    const map = new Map<number, SeoSuggestion[]>();

    for (const suggestion of analysis.suggestions) {
      if (reviewDecisions[suggestion.id] !== null) {
        continue;
      }

      const current = map.get(suggestion.targetIndex) ?? [];
      current.push(suggestion);
      map.set(suggestion.targetIndex, current);
    }

    return map;
  }, [analysis, reviewDecisions]);

  const resetState = () => {
    setAnalysis(null);
    setReviewDecisions({});
    setUploadError("");
    setIsAnalyzing(false);
    setIsDownloading(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleFile = async (file: File) => {
    if (!/\.docx$/i.test(file.name)) {
      setUploadError("Only .docx files are supported right now.");
      return;
    }

    setUploadError("");
    setIsAnalyzing(true);

    try {
      const nextAnalysis = await analyzeSeoDocument(file);
      const nextDecisions = Object.fromEntries(
        nextAnalysis.suggestions.map((suggestion) => [suggestion.id, null]),
      ) as Record<string, SuggestionDecision>;

      setAnalysis(nextAnalysis);
      setReviewDecisions(nextDecisions);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setUploadError(message || "Unable to analyze this document. Please try another .docx file.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await handleFile(file);
  };

  const handleDecision = (suggestionId: string, decision: Exclude<SuggestionDecision, null>) => {
    if (!analysis || nextPendingSuggestionId !== suggestionId) {
      return;
    }

    setReviewDecisions((previous) => ({
      ...previous,
      [suggestionId]: decision,
    }));
  };

  const handleDownload = async () => {
    if (!analysis || progress.pending > 0 || isDownloading) {
      return;
    }

    const acceptedSuggestionIds = analysis.suggestions
      .filter((suggestion) => reviewDecisions[suggestion.id] === "Accepted")
      .map((suggestion) => suggestion.id);

    const rejectedSuggestionIds = analysis.suggestions
      .filter((suggestion) => reviewDecisions[suggestion.id] === "Rejected")
      .map((suggestion) => suggestion.id);

    setIsDownloading(true);

    try {
      const result = await downloadFinalSeoDocument({
        analysisId: analysis.analysisId,
        analysis,
        acceptedSuggestionIds,
        rejectedSuggestionIds,
        projectedScore,
      });

      const downloadUrl = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");

      anchor.href = downloadUrl;
      anchor.download = result.fileName;
      anchor.click();
      URL.revokeObjectURL(downloadUrl);

      resetState();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const isDev = process.env.NODE_ENV !== "production";

      if (isDev && message) {
        setUploadError(`Finalize failed: ${message}`);
      } else {
        setUploadError("Unable to generate the final .docx output. Please try again.");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  if (!analysis) {
    return (
      <Card className="p-7">
        <div className="max-w-3xl space-y-3">
          <h2 className="text-2xl font-bold tracking-tight">SEO Checker</h2>
          <p className="text-sm text-muted">
            Upload a Word document for Cenzer SEO analysis, review each suggestion,
            then download your final output.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold">Word Document Upload</p>
              <p className="text-xs text-muted">Supported format: .docx</p>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
                  <Image src={CENZER_LOGO_SRC} alt="Cenzer" width={20} height={20} />
                </span>
                <span className="text-xs font-semibold">Cenzer Analysis</span>
              </div>
            </div>

            <Button
              variant="primary"
              className="gap-1.5"
              onClick={() => inputRef.current?.click()}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <LoaderCircle size={14} className="animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <FileUp size={14} />
                  Upload Document
                </>
              )}
            </Button>
          </div>

          {uploadError ? (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {uploadError}
            </p>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".docx"
          className="hidden"
          onChange={handleInputChange}
        />
      </Card>
    );
  }

  const allReviewed = progress.pending < 1;

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">SEO Checker</h2>
            <p className="text-sm text-muted">
              Cenzer SEO Review workspace for uploaded Word documents.
            </p>
          </div>

          <Button
            variant="secondary"
            className="gap-1.5"
            onClick={() => inputRef.current?.click()}
            disabled={isAnalyzing}
          >
            <RefreshCcw size={14} />
            Upload Another
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".docx"
          className="hidden"
          onChange={handleInputChange}
        />
      </Card>

      <div className="grid gap-4 xl:h-[calc(100vh-13.5rem)] xl:grid-cols-[290px_1fr_380px]">
        <Card className="p-4 xl:overflow-y-auto">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">
            Document Summary
          </h3>

          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">File Name</p>
              <p className="mt-1 break-all text-sm font-semibold">{analysis.fileName}</p>
            </div>

            <div className="grid gap-2">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Upload Date</p>
                <p className="mt-1 text-sm font-semibold">{analysis.uploadDate}</p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Word Count</p>
                <p className="mt-1 text-sm font-semibold">{analysis.wordCount.toLocaleString()}</p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Overall SEO Score</p>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-2xl font-bold">{analysis.overallScore}</p>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${scoreStatusClass(analysis.overallScore)}`}
                >
                  {analysis.status}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Score Breakdown</p>
              <div className="mt-2 space-y-1.5 text-xs">
                {[
                  ["Title clarity & keyword relevance", analysis.scoreBreakdown.titleClarityKeywordRelevance],
                  ["Heading hierarchy", analysis.scoreBreakdown.headingHierarchyStructure],
                  ["Keyword placement", analysis.scoreBreakdown.keywordPlacement],
                  ["Readability", analysis.scoreBreakdown.readabilitySentenceClarity],
                  ["Search intent", analysis.scoreBreakdown.searchIntentMatch],
                  ["CTA clarity", analysis.scoreBreakdown.ctaClarity],
                  ["Paragraph scannability", analysis.scoreBreakdown.paragraphScannability],
                  ["Repetition control", analysis.scoreBreakdown.repetitionKeywordStuffing],
                  ["Meta readiness", analysis.scoreBreakdown.metaReadiness],
                  ["Internal linking readiness", analysis.scoreBreakdown.internalLinkingReadiness],
                  ["Audience relevance", analysis.scoreBreakdown.audienceRelevance],
                  ["Actionability", analysis.scoreBreakdown.actionabilitySpecificity],
                ].map(([label, score]) => (
                  <p key={label} className="flex items-center justify-between gap-3">
                    <span>{label}</span>
                    <span className="font-semibold">{score}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden">
          <div className="border-b border-[var(--color-border)] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">
              Document Preview
            </h3>
            <p className="mt-1 text-xs text-muted">
              Structure-aware preview of title, headings, paragraphs, lists, and pending suggestion highlights.
            </p>
          </div>

          <div className="min-h-0 overflow-y-auto bg-[var(--color-surface-muted)] p-4">
            <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_18px_38px_rgba(15,23,42,0.25)] md:p-10">
              <div className="mb-6 border-b border-slate-200 pb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Uploaded Document
                </p>
                <p className="mt-1 text-xs text-slate-500">{analysis.fileName}</p>
              </div>

              <div className="space-y-4">
                {displayedPreviewBlocks.map((block) => {
                  const pendingForBlock = pendingSuggestionsByTarget.get(block.index) ?? [];
                  const phraseSnippets = pendingForBlock
                    .filter((suggestion) => suggestion.targetType === "phrase")
                    .map((suggestion) => suggestion.originalTextSnippet)
                    .filter((value) => value.length > 0);

                  const hasNonPhrasePending = pendingForBlock.some(
                    (suggestion) => suggestion.targetType !== "phrase",
                  );
                  const phraseSnippetFound = phraseSnippets.some((snippet) => block.text.includes(snippet));
                  const highlightWholeBlock = hasNonPhrasePending || (pendingForBlock.length > 0 && !phraseSnippetFound);

                  const textNode = highlightWholeBlock
                    ? <mark className="rounded bg-yellow-200 px-0.5">{block.text}</mark>
                    : renderHighlightedText(block.text, phraseSnippets, `preview-${block.id}`);

                  if (block.kind === "title") {
                    return (
                      <h1 key={block.id} className="text-3xl font-bold leading-tight text-slate-900">
                        {textNode}
                      </h1>
                    );
                  }

                  if (block.kind === "heading") {
                    return (
                      <h2 key={block.id} className="pt-2 text-xl font-semibold leading-snug text-slate-800">
                        {textNode}
                      </h2>
                    );
                  }

                  if (block.kind === "list-item") {
                    return (
                      <p
                        key={block.id}
                        className="flex items-start gap-2 text-[15px] leading-7 text-slate-700"
                        style={{ marginLeft: `${(block.listLevel ?? 0) * 18}px` }}
                      >
                        <span className="pt-0.5 text-slate-500">{block.listOrder ? `${block.listOrder}.` : "•"}</span>
                        <span>{textNode}</span>
                      </p>
                    );
                  }

                  return (
                    <p key={block.id} className="text-[15px] leading-7 text-slate-700">
                      {textNode}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden">
          <div className="border-b border-[var(--color-border)] p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                <Image src={CENZER_LOGO_SRC} alt="Cenzer" width={20} height={20} />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">
                  Cenzer Suggestions
                </p>
                <p className="text-xs text-muted">Cenzer Analysis</p>
              </div>
            </div>

            <p className="mt-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-xs text-muted">
              Review suggestions one by one. Download unlocks only after every suggestion is accepted or rejected.
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {analysis.suggestions.map((suggestion) => {
                const decision = reviewDecisions[suggestion.id] ?? null;
                const isReviewable = nextPendingSuggestionId === suggestion.id;
                const reviewStatus = decision ?? "Pending";

                return (
                  <div
                    key={suggestion.id}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{suggestion.title}</p>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${impactClass(suggestion.impact)}`}
                        >
                          {suggestion.impact} Impact
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${decisionClass(decision)}`}
                        >
                          {reviewStatus}
                        </span>
                      </div>
                    </div>

                    <p className="mt-2 text-xs text-muted">{suggestion.reason}</p>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                      <p className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1">
                        <span className="font-semibold uppercase tracking-[0.08em] text-muted">Category</span>
                        <br />
                        {suggestion.category}
                      </p>
                      <p className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1">
                        <span className="font-semibold uppercase tracking-[0.08em] text-muted">Target</span>
                        <br />
                        {suggestion.targetType} #{suggestion.targetIndex + 1}
                      </p>
                    </div>

                    <div className="mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                        Original snippet
                      </p>
                      <p className="mt-1 text-xs">{suggestion.originalTextSnippet}</p>
                    </div>

                    <div className="mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                        Suggested replacement
                      </p>
                      <p className="mt-1 text-xs">{suggestion.suggestedReplacementText}</p>
                    </div>

                    <p className="mt-2 text-[11px] text-muted">
                      Projected gain if accepted: +{suggestion.projectedGain}
                    </p>

                    <div className="mt-2 flex gap-2">
                      <Button
                        variant="secondary"
                        className="flex-1 gap-1.5"
                        onClick={() => handleDecision(suggestion.id, "Rejected")}
                        disabled={!isReviewable || decision !== null}
                      >
                        <XCircle size={13} />
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        className="flex-1 gap-1.5"
                        onClick={() => handleDecision(suggestion.id, "Accepted")}
                        disabled={!isReviewable || decision !== null}
                      >
                        <CheckCircle2 size={13} />
                        Accept
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sticky bottom-0 z-10 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Total</p>
                <p className="mt-1 text-xs font-bold">{progress.total}</p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Accepted</p>
                <p className="mt-1 text-xs font-bold">{progress.accepted}</p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Rejected</p>
                <p className="mt-1 text-xs font-bold">{progress.rejected}</p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Pending</p>
                <p className="mt-1 text-xs font-bold">{progress.pending}</p>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-xs">
              <p className="flex items-center justify-between">
                <span className="font-semibold text-muted">Current SEO Score</span>
                <span className="font-bold">{analysis.overallScore}</span>
              </p>
              <p className="mt-1 flex items-center justify-between">
                <span className="font-semibold text-muted">Projected SEO Score</span>
                <span className="font-bold">{projectedScore}</span>
              </p>
            </div>

            {uploadError ? (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {uploadError}
              </p>
            ) : null}

            <Button
              variant="primary"
              className="mt-3 w-full gap-1.5"
              onClick={handleDownload}
              disabled={!allReviewed || isDownloading}
            >
              {isDownloading ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />}
              {isDownloading ? "Generating .docx..." : "Download Final .docx"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
