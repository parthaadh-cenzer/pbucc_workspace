import { getAnthropicRuntimeConfig } from "@/lib/cenzer-runtime";
import {
  assertValidSlug,
  fallbackSlugFromContext,
  sanitizeSlugCandidate,
} from "@/lib/short-link-runtime";
import type { ShortDomain } from "@/lib/short-link-types";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

type AnthropicResponse = {
  content?: Array<{
    type: string;
    text?: string;
  }>;
};

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
}) {
  const fallback = fallbackSlugFromContext(input);

  let runtimeConfig;
  try {
    runtimeConfig = getAnthropicRuntimeConfig();
  } catch {
    return fallback;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": runtimeConfig.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: runtimeConfig.model,
        max_tokens: 120,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: buildSlugPrompt(input),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn("[Cenzer ShortLink][Slug] Claude request failed", {
        status: response.status,
      });
      return fallback;
    }

    const payload = (await response.json()) as AnthropicResponse;
    const text = payload.content?.find((part) => part.type === "text")?.text?.trim() || "";
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
    if (controller.signal.aborted) {
      console.warn("[Cenzer ShortLink][Slug] Claude request timed out. Using fallback slug.");
      return fallback;
    }

    console.warn("[Cenzer ShortLink][Slug] Claude request failed. Using fallback slug.", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}
