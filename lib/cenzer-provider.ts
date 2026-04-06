import "server-only";
import { getAnthropicRuntimeConfig } from "@/lib/cenzer-runtime";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

type AnthropicResponse = {
  content?: Array<{
    type: string;
    text?: string;
  }>;
};

export type CenzerProviderTextRequest = {
  feature: "seo-checker" | "qr-code-maker" | "url-shortener";
  prompt: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
  requestId?: string;
  mode?: string;
};

export type CenzerProviderTextResult = {
  text: string;
  model: string;
  status: number;
};

export async function requestCenzerText(
  input: CenzerProviderTextRequest,
): Promise<CenzerProviderTextResult> {
  let runtimeConfig;

  try {
    runtimeConfig = getAnthropicRuntimeConfig();
  } catch (error) {
    const configuredModel = process.env.ANTHROPIC_MODEL?.trim() || "(default)";
    console.error("[Cenzer Provider] Anthropic runtime configuration invalid", {
      feature: input.feature,
      requestId: input.requestId ?? null,
      mode: input.mode ?? null,
      model: configuredModel,
      hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
      error: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1_000, input.timeoutMs));

  console.info("[Cenzer Provider] Anthropic request started", {
    feature: input.feature,
    requestId: input.requestId ?? null,
    mode: input.mode ?? null,
    model: runtimeConfig.model,
    hasApiKey: true,
    keyLength: runtimeConfig.apiKey.length,
    promptChars: input.prompt.length,
  });

  let response: Response;

  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": runtimeConfig.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: runtimeConfig.model,
        max_tokens: input.maxTokens,
        temperature: input.temperature,
        messages: [
          {
            role: "user",
            content: input.prompt,
          },
        ],
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`[cenzer-provider-timeout] Request timed out after ${input.timeoutMs}ms.`);
    }

    const message = error instanceof Error ? error.message : "unknown network error";
    throw new Error(`[cenzer-provider-network] ${message}`);
  } finally {
    clearTimeout(timeout);
  }

  console.info("[Cenzer Provider] Anthropic response received", {
    feature: input.feature,
    requestId: input.requestId ?? null,
    mode: input.mode ?? null,
    model: runtimeConfig.model,
    status: response.status,
  });

  if (!response.ok) {
    const failureText = await response.text();
    const providerRequestId =
      response.headers.get("request-id") || response.headers.get("x-request-id") || null;
    const unauthorizedFromProvider = response.status === 401 || response.status === 403;

    console.error("[Cenzer Provider] Anthropic request failed", {
      feature: input.feature,
      requestId: input.requestId ?? null,
      mode: input.mode ?? null,
      model: runtimeConfig.model,
      status: response.status,
      unauthorizedFromProvider,
      hasApiKey: true,
      keyLength: runtimeConfig.apiKey.length,
      providerRequestId,
      detail: failureText.slice(0, 300),
    });

    throw new Error(`[cenzer-provider-http-${response.status}] ${failureText.slice(0, 300)}`);
  }

  let payload: AnthropicResponse;

  try {
    payload = (await response.json()) as AnthropicResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown json parse error";
    throw new Error(`[cenzer-provider-response-json] ${message}`);
  }

  const text = payload.content?.find((item) => item.type === "text")?.text?.trim();

  console.info("[Cenzer Provider] Anthropic content check", {
    feature: input.feature,
    requestId: input.requestId ?? null,
    mode: input.mode ?? null,
    model: runtimeConfig.model,
    hasTextContent: Boolean(text),
    contentBlocks: Array.isArray(payload.content) ? payload.content.length : 0,
  });

  if (!text) {
    throw new Error("[cenzer-provider-response-content] Provider response did not contain text output.");
  }

  return {
    text,
    model: runtimeConfig.model,
    status: response.status,
  };
}
