import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestIdentifier, tooManyRequests } from "@/lib/security";

const nextAuthHandler = NextAuth(authOptions);
const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const FALLBACK_LOCAL_AUTH_URL = "http://localhost:3000";

type NextAuthRouteContext = {
	params: Promise<{ nextauth?: string[] }>;
};

function isLocalDevelopmentRequest(request: NextRequest) {
	if (process.env.NODE_ENV === "production") {
		return false;
	}

	return LOCALHOST_HOSTS.has(request.nextUrl.hostname.toLowerCase());
}

function resolveAuthBaseUrl(request: NextRequest) {
	const candidates = [
		process.env.AUTH_URL,
		process.env.NEXTAUTH_URL,
		request.nextUrl.origin,
		FALLBACK_LOCAL_AUTH_URL,
	];

	for (const candidate of candidates) {
		if (!candidate) {
			continue;
		}

		try {
			const parsed = new URL(candidate);

			if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
				continue;
			}

			return parsed.origin;
		} catch {
			continue;
		}
	}

	return FALLBACK_LOCAL_AUTH_URL;
}

function buildCredentialsCallbackRedirectResponse(request: NextRequest, errorCode: string) {
	const baseUrl = resolveAuthBaseUrl(request);
	return NextResponse.json(
		{ url: `${baseUrl}/auth?error=${encodeURIComponent(errorCode)}` },
		{ status: 200 },
	);
}

const handler = async (request: NextRequest, context: NextAuthRouteContext) => {
	const path = request.nextUrl.pathname.toLowerCase();
	const isCredentialsCallback = path.includes("/callback/credentials");
	const isSessionRequest = path.includes("/session");
	const isAuthSensitive =
		isCredentialsCallback ||
		path.includes("/signin") ||
		path.includes("/register") ||
		isSessionRequest;

	if (isAuthSensitive && !isLocalDevelopmentRequest(request)) {
		const identifier = getRequestIdentifier(request);
		const limit = isCredentialsCallback ? 5 : isSessionRequest ? 60 : 20;
		const limiter = checkRateLimit({
			key: `nextauth:${identifier}:${isCredentialsCallback ? "credentials" : "default"}`,
			limit,
			windowMs: 15 * 60 * 1000,
		});

		if (!limiter.allowed) {
			if (isCredentialsCallback) {
				return buildCredentialsCallbackRedirectResponse(request, "RateLimit");
			}

			return tooManyRequests(limiter.retryAfterSeconds);
		}
	}

	try {
		const response = await nextAuthHandler(request, context);

		if (!(response instanceof Response)) {
			return NextResponse.json({ error: "Auth handler failure." }, { status: 500 });
		}

		return response;
	} catch (error) {
		console.error("[Auth][NextAuth] Handler failed", {
			path,
			error: error instanceof Error ? error.message : "unknown",
		});

		if (isCredentialsCallback) {
			return buildCredentialsCallbackRedirectResponse(request, "AuthHandler");
		}

		return NextResponse.json({ error: "Authentication request failed." }, { status: 500 });
	}
};

export { handler as GET, handler as POST };
