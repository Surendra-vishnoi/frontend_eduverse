import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://eduverse-4x8o.onrender.com";

const FRONTEND_CALLBACK_PATH = "/callback";
const BACKEND_SESSION_COOKIE_NAME = process.env.BFF_BACKEND_SESSION_COOKIE_NAME || "session";
const AUTH_COOKIE_ACCESS_NAME = process.env.AUTH_COOKIE_ACCESS_NAME || "eduverse_access_token";
const AUTH_COOKIE_REFRESH_NAME = process.env.AUTH_COOKIE_REFRESH_NAME || "eduverse_refresh_token";
const CSRF_COOKIE_NAME = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || "eduverse_csrf_token";

function getRequestOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    return `${forwardedProto}://${forwardedHost}`;
  }
  return request.nextUrl.origin;
}

function getSetCookieValues(headers: Headers): string[] {
  const headersWithGetSetCookie = headers as unknown as { getSetCookie?: () => string[] };
  if (typeof headersWithGetSetCookie.getSetCookie === "function") {
    return headersWithGetSetCookie.getSetCookie();
  }

  const singleSetCookie = headers.get("set-cookie");
  return singleSetCookie ? [singleSetCookie] : [];
}

function getCookieName(setCookieValue: string): string | null {
  const pair = setCookieValue.split(";", 1)[0];
  const index = pair.indexOf("=");
  if (index <= 0) {
    return null;
  }
  return pair.slice(0, index).trim();
}

function appendSelectedSetCookies(
  sourceHeaders: Headers,
  targetHeaders: Headers,
  allowedCookieNames: Set<string>
): void {
  for (const setCookieValue of getSetCookieValues(sourceHeaders)) {
    const cookieName = getCookieName(setCookieValue);
    if (cookieName && allowedCookieNames.has(cookieName)) {
      targetHeaders.append("set-cookie", setCookieValue);
    }
  }
}

function redirectWithError(origin: string, message: string): NextResponse {
  return NextResponse.redirect(
    `${origin}${FRONTEND_CALLBACK_PATH}?error=${encodeURIComponent(message)}`,
    { status: 303 }
  );
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Get all the OAuth params that Google sends
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const scope = searchParams.get("scope");
  const authuser = searchParams.get("authuser");
  const prompt = searchParams.get("prompt");
  const error = searchParams.get("error");

  const origin = getRequestOrigin(request);

  if (error) {
    return redirectWithError(origin, error);
  }

  if (!code || !state) {
    return redirectWithError(origin, "Missing OAuth callback parameters");
  }

  const backendSessionCookie = request.cookies.get(BACKEND_SESSION_COOKIE_NAME)?.value;
  if (!backendSessionCookie) {
    return redirectWithError(origin, "No login session found. Please try again.");
  }

  const backendCallbackUrl = new URL(`${BACKEND_URL}/auth/callback`);
  backendCallbackUrl.searchParams.set("code", code);
  backendCallbackUrl.searchParams.set("state", state);
  if (scope) backendCallbackUrl.searchParams.set("scope", scope);
  if (authuser) backendCallbackUrl.searchParams.set("authuser", authuser);
  if (prompt) backendCallbackUrl.searchParams.set("prompt", prompt);

  let backendResponse: Response;
  try {
    backendResponse = await fetch(backendCallbackUrl.toString(), {
      method: "GET",
      headers: {
        Cookie: `${BACKEND_SESSION_COOKIE_NAME}=${backendSessionCookie}`,
      },
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return redirectWithError(origin, "Failed to complete authentication");
  }

  if (backendResponse.status >= 400) {
    let detail = "Authentication failed";
    try {
      const responseText = await backendResponse.text();
      if (responseText) {
        try {
          const responseJson = JSON.parse(responseText);
          detail = responseJson.detail || responseJson.message || responseText;
        } catch {
          detail = responseText;
        }
      }
    } catch {
      // Keep default error detail.
    }
    return redirectWithError(origin, detail);
  }

  const response = NextResponse.redirect(`${origin}${FRONTEND_CALLBACK_PATH}`, {
    status: 303,
  });

  appendSelectedSetCookies(
    backendResponse.headers,
    response.headers,
    new Set([AUTH_COOKIE_ACCESS_NAME, AUTH_COOKIE_REFRESH_NAME, CSRF_COOKIE_NAME])
  );

  response.cookies.delete(BACKEND_SESSION_COOKIE_NAME);
  return response;
}
