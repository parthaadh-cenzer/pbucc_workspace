import { getAnthropicRuntimeConfig } from "@/lib/cenzer-runtime";
import { buildDeterministicUtmUrl, normalizeHttpUrl } from "@/lib/qr-code-runtime";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

type AnthropicResponse = {
  content?: Array<{
    type: string;
    text?: string;
  }>;
};

function extractJsonCandidate(raw: string) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start < 0 || end <= start) {
    throw new Error("JSON object not found in model response.");
  }

  return raw.slice(start, end + 1);
}

function slugifyCampaign(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildUtmPrompt(input: { destinationUrl: string; campaign: string | null }) {
  const campaignSlug = input.campaign ? slugifyCampaign(input.campaign) : "";

  return [
    "You generate tracking URLs for QR campaigns.",
    "Return exactly one JSON object with key utmUrl.",
    "Do not include markdown, code fences, or explanations.",
    "Use the destination URL as base and include these params:",
    "- utm_source=cenzer",
    "- utm_medium=qr",
    campaignSlug ? `- utm_campaign=${campaignSlug}` : "- omit utm_campaign when campaign is blank",
    "Keep existing query parameters from the destination URL.",
    "Output shape: {\"utmUrl\":\"https://example.com/?utm_source=cenzer&utm_medium=qr\"}",
    `Destination URL: ${input.destinationUrl}`,
    `Campaign: ${input.campaign ?? ""}`,
  ].join("\n");
}

export async function generateUtmUrlWithClaude(input: {
  destinationUrl: string;
  campaign: string | null;
}) {
  const fallback = buildDeterministicUtmUrl(input.destinationUrl, input.campaign);

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
        max_tokens: 350,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: buildUtmPrompt(input),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn("[Cenzer QR][UTM] Claude request failed", {
        status: response.status,
        detail: text.slice(0, 220),
      });
      return fallback;
    }

    const payload = (await response.json()) as AnthropicResponse;
    const modelText = payload.content?.find((item) => item.type === "text")?.text?.trim();

    if (!modelText) {
      console.warn("[Cenzer QR][UTM] Claude response missing text content.");
      return fallback;
    }

    let candidateUrl = "";

    if (modelText.startsWith("{") && modelText.endsWith("}")) {
      const parsed = JSON.parse(modelText) as { utmUrl?: string };
      candidateUrl = parsed.utmUrl ?? "";
    } else {
      const parsed = JSON.parse(extractJsonCandidate(modelText)) as { utmUrl?: string };
      candidateUrl = parsed.utmUrl ?? "";
    }

    if (!candidateUrl) {
      return fallback;
    }

    return normalizeHttpUrl(candidateUrl, "UTM URL");
  } catch (error) {
    if (controller.signal.aborted) {
      console.warn("[Cenzer QR][UTM] Claude request timed out; using fallback UTM.");
      return fallback;
    }

    console.warn("[Cenzer QR][UTM] Claude generation failed; using fallback UTM.", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}
