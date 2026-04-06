const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

type AnthropicRuntimeConfig = {
  apiKey: string;
  model: string;
};

export function resolveRequestOrigin(request: Request) {
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = request.headers.get("host")?.trim();

  if (forwardedHost) {
    return `${forwardedProto ?? "https"}://${forwardedHost}`;
  }

  if (host) {
    return `${forwardedProto ?? "http"}://${host}`;
  }

  return new URL(request.url).origin;
}

export function getAnthropicRuntimeConfig(): AnthropicRuntimeConfig {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("[config] ANTHROPIC_API_KEY is missing.");
  }

  return {
    apiKey,
    model: process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL,
  };
}
