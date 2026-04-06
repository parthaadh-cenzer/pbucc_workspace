import type { SeoAnalysisResult } from "@/lib/seo-checker-types";

type StoredSeoAnalysis = {
  analysis: SeoAnalysisResult;
  originalDocxBuffer: Buffer;
  createdAt: number;
};

const TTL_MS = 45 * 60 * 1000;

const analysisStore = new Map<string, StoredSeoAnalysis>();

function cleanupExpired(now: number) {
  for (const [key, value] of analysisStore.entries()) {
    if (now - value.createdAt > TTL_MS) {
      analysisStore.delete(key);
    }
  }
}

export function saveSeoAnalysisSession(input: {
  analysis: SeoAnalysisResult;
  originalDocxBuffer: Buffer;
}) {
  const now = Date.now();
  cleanupExpired(now);

  const analysisId = input.analysis.analysisId;
  analysisStore.set(analysisId, {
    analysis: input.analysis,
    originalDocxBuffer: input.originalDocxBuffer,
    createdAt: now,
  });

  return analysisId;
}

export function getSeoAnalysisSession(analysisId: string) {
  const now = Date.now();
  cleanupExpired(now);

  const session = analysisStore.get(analysisId);

  if (!session) {
    return null;
  }

  if (now - session.createdAt > TTL_MS) {
    analysisStore.delete(analysisId);
    return null;
  }

  return session;
}

export function deleteSeoAnalysisSession(analysisId: string) {
  analysisStore.delete(analysisId);
}
