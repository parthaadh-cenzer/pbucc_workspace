import { requestCenzerText } from "@/lib/cenzer-provider";
import {
  assertValidSlug,
  fallbackSlugFromContext,
  sanitizeSlugCandidate,
} from "@/lib/short-link-runtime";
import type { ShortDomain } from "@/lib/short-link-types";

function buildSlugPrompt(input: {
  destinationUrl: string;
  campaign: string | null;
  domain: ShortDomain;
}) {
  return [
    "You are Cenzer URL slug assistant.",
    "Generate exactly one short URL slug.",
    "Constraints:",
    "- lowercase only",
    "- use hyphens between words",
    "- no special characters",
    "- concise and readable",
    "- no leading/trailing hyphen",
    "- max 48 characters",
    "- include campaign context if useful",
    "Return only the slug text and nothing else.",
    `Domain context: ${input.domain}`,
    `Destination URL: ${input.destinationUrl}`,
    `Campaign: ${input.campaign ?? ""}`,
  ].join("\n");
}

function parseSlugFromClaude(output: string) {
  const firstLine = output.split(/\r?\n/)[0] ?? "";
  return sanitizeSlugCandidate(firstLine);
}

export async function suggestShortSlugWithCenzer(input: {
  destinationUrl: string;
  campaign: string | null;
  domain: ShortDomain;
  requestId?: string;
}) {
  const fallback = fallbackSlugFromContext(input);

  try {
    const result = await requestCenzerText({
      feature: "url-shortener",
      requestId: input.requestId,
      mode: "slug",
      prompt: buildSlugPrompt(input),
      maxTokens: 120,
      temperature: 0,
      timeoutMs: 20_000,
    });
    const text = result.text || "";
    const candidate = parseSlugFromClaude(text);

    if (!candidate) {
      return fallback;
    }

    try {
      assertValidSlug(candidate, "Suggested slug");
      return candidate;
    } catch {
      return fallback;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";

    if (message.includes("[cenzer-provider-timeout]")) {
      console.warn("[Cenzer ShortLink][Slug] Claude request timed out. Using fallback slug.", {
        requestId: input.requestId ?? null,
      });
      return fallback;
    }

    console.warn("[Cenzer ShortLink][Slug] Claude request failed. Using fallback slug.", {
      requestId: input.requestId ?? null,
      error: message,
    });
    return fallback;
  }
}
