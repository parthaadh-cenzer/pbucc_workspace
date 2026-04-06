import { requestCenzerText } from "@/lib/cenzer-provider";
import { buildDeterministicUtmUrl, normalizeHttpUrl } from "@/lib/qr-code-runtime";

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
  requestId?: string;
}) {
  const fallback = buildDeterministicUtmUrl(input.destinationUrl, input.campaign);

  try {
    const result = await requestCenzerText({
      feature: "qr-code-maker",
      requestId: input.requestId,
      mode: "utm",
      prompt: buildUtmPrompt(input),
      maxTokens: 350,
      temperature: 0,
      timeoutMs: 20_000,
    });

    const modelText = result.text;

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
    const message = error instanceof Error ? error.message : "unknown";

    if (message.includes("[cenzer-provider-timeout]")) {
      console.warn("[Cenzer QR][UTM] Claude request timed out; using fallback UTM.", {
        requestId: input.requestId ?? null,
      });
      return fallback;
    }

    console.warn("[Cenzer QR][UTM] Claude generation failed; using fallback UTM.", {
      requestId: input.requestId ?? null,
      error: message,
    });
    return fallback;
  }
}
