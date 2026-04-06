import type {
  SeoAnalysisResult,
  SeoFinalizeRequest,
  SeoImpactLevel,
  SeoPreviewBlock,
  SeoStatusLabel,
  SeoSuggestion,
  SeoSuggestionCategory,
} from "@/lib/seo-checker-types";

export type {
  SeoAnalysisResult,
  SeoImpactLevel,
  SeoPreviewBlock,
  SeoStatusLabel,
  SeoSuggestion,
  SeoSuggestionCategory,
};

function buildApiErrorMessage(input: {
  fallback: string;
  payload: { error?: string; detail?: string; stage?: string; requestId?: string };
  status: number;
}) {
  const { fallback, payload, status } = input;
  const isDev = process.env.NODE_ENV !== "production";
  const stage = payload.stage ? `stage=${payload.stage}` : "";
  const requestId = payload.requestId ? `request=${payload.requestId}` : "";
  const debugParts = [stage, requestId].filter(Boolean).join(" ");
  const detail = isDev && payload.detail ? ` ${payload.detail}` : "";
  const base = payload.error || `${fallback} (${status})`;

  return `${base}${debugParts ? ` [${debugParts}]` : ""}${detail}`.trim();
}

export async function analyzeSeoDocument(file: File): Promise<SeoAnalysisResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/seo-checker/analyze", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      detail?: string;
      stage?: string;
      requestId?: string;
    };
    throw new Error(
      buildApiErrorMessage({
        fallback: "SEO analyze API failed",
        payload,
        status: response.status,
      }),
    );
  }

  const payload = (await response.json()) as { analysis?: SeoAnalysisResult };

  if (!payload.analysis) {
    throw new Error("SEO analyze API returned no analysis payload.");
  }

  return payload.analysis;
}

export async function downloadFinalSeoDocument(input: SeoFinalizeRequest) {
  const response = await fetch("/api/seo-checker/finalize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      detail?: string;
      stage?: string;
      requestId?: string;
    };
    throw new Error(
      buildApiErrorMessage({
        fallback: "SEO finalize API failed",
        payload,
        status: response.status,
      }),
    );
  }

  return {
    blob: await response.blob(),
    fileName: response.headers.get("x-cenzer-file-name") || "cenzer-seo-output.docx",
  };
}
