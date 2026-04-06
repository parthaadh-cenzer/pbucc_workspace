"use client";

import { useEffect, useState } from "react";
import type { ReviewItem } from "@/lib/review-types";

type WordPreviewState = {
  loading: boolean;
  error: string;
  html: string;
};

function buildWordPreviewHtml(documentHtml: string) {
  const baseStyles = `
    :root {
      color-scheme: light;
    }

    body {
      margin: 0;
      background: #f4f6fb;
      color: #111827;
      font-family: "Segoe UI", Arial, sans-serif;
      line-height: 1.6;
      padding: 24px;
    }

    .doc-page {
      max-width: 840px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e4e7ec;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
      padding: 36px 42px;
    }

    h1, h2, h3, h4, h5, h6 {
      margin: 0 0 12px;
      line-height: 1.3;
      font-weight: 700;
      color: #0f172a;
    }

    h1 { font-size: 2rem; }
    h2 { font-size: 1.5rem; }
    h3 { font-size: 1.25rem; }

    p {
      margin: 0 0 12px;
      white-space: pre-wrap;
    }

    ul, ol {
      margin: 0 0 12px 22px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 12px;
    }

    td, th {
      border: 1px solid #e4e7ec;
      padding: 6px 8px;
      vertical-align: top;
    }
  `;

  return `<!doctype html><html><head><meta charset="utf-8"/><style>${baseStyles}</style></head><body><article class="doc-page">${documentHtml}</article></body></html>`;
}

export function ReviewFilePreview({ item }: { item: ReviewItem }) {
  const [wordState, setWordState] = useState<WordPreviewState>({
    loading: false,
    error: "",
    html: "",
  });

  useEffect(() => {
    if (item.fileType !== "WORD") {
      setWordState({ loading: false, error: "", html: "" });
      return;
    }

    if (/\.doc$/i.test(item.fileName) && !/\.docx$/i.test(item.fileName)) {
      setWordState({
        loading: false,
        error: "Legacy .doc preview is limited. Download the file to review full content.",
        html: "",
      });
      return;
    }

    let disposed = false;

    const loadWordPreview = async () => {
      setWordState({ loading: true, error: "", html: "" });

      try {
        const mammoth = await import("mammoth/mammoth.browser");
        const response = await fetch(item.fileUrl);
        const arrayBuffer = await response.arrayBuffer();
        const converted = await mammoth.convertToHtml({ arrayBuffer });

        if (disposed) {
          return;
        }

        const htmlContent = converted.value.trim();

        if (!htmlContent) {
          setWordState({
            loading: false,
            error: "No renderable content found in this document.",
            html: "",
          });
          return;
        }

        setWordState({
          loading: false,
          error: "",
          html: buildWordPreviewHtml(htmlContent),
        });
      } catch {
        if (disposed) {
          return;
        }

        setWordState({
          loading: false,
          error: "Unable to render document preview. Download file to review.",
          html: "",
        });
      }
    };

    void loadWordPreview();

    return () => {
      disposed = true;
    };
  }, [item.fileName, item.fileType, item.fileUrl]);

  if (item.fileType === "IMAGE") {
    return (
      <div className="h-[620px] overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
        <div className="mx-auto flex min-h-full max-w-[860px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-white p-4">
          <img
            src={item.fileUrl}
            alt={item.fileName}
            className="max-h-[580px] w-full object-contain"
          />
        </div>
      </div>
    );
  }

  if (item.fileType === "PDF") {
    return (
      <div className="h-[620px] overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
        <div className="h-full rounded-lg border border-[var(--color-border)] bg-white p-1">
          <iframe title={item.fileName} src={item.fileUrl} className="h-full w-full rounded-md bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
      {wordState.loading ? (
        <p className="text-sm text-muted">Loading Word document preview...</p>
      ) : null}

      {!wordState.loading && wordState.error ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
          {wordState.error}
        </p>
      ) : null}

      {!wordState.loading && !wordState.error ? (
        <div className="h-[620px] overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2">
          <iframe
            title={`${item.fileName} preview`}
            sandbox="allow-same-origin"
            srcDoc={wordState.html}
            className="h-full w-full rounded-md border border-[var(--color-border)] bg-white"
          />
        </div>
      ) : null}

      <a
        href={item.fileUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex text-xs font-semibold text-[var(--color-accent)]"
      >
        Open original file
      </a>
    </div>
  );
}
