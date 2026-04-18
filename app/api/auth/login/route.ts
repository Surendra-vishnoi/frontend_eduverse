import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://eduverse-4x8o.onrender.com";

const FRONTEND_CALLBACK_PATH = "/callback";
const BACKEND_SESSION_COOKIE_NAME = process.env.BFF_BACKEND_SESSION_COOKIE_NAME || "session";

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

export async function GET(request: NextRequest) {
  const origin = getRequestOrigin(request);

  const backendLoginUrl = new URL(`${BACKEND_URL}/auth/login`);
  backendLoginUrl.searchParams.set("redirect", "true");
  backendLoginUrl.searchParams.set("frontend_redirect", `${origin}${FRONTEND_CALLBACK_PATH}`);

  let backendResponse: Response;
  try {
    backendResponse = await fetch(backendLoginUrl.toString(), {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return NextResponse.redirect(
      `${origin}${FRONTEND_CALLBACK_PATH}?error=${encodeURIComponent("Failed to start authentication")}`,
      { status: 303 }
    );
  }

  const location = backendResponse.headers.get("location");
  if (!location) {
    return NextResponse.redirect(
      `${origin}${FRONTEND_CALLBACK_PATH}?error=${encodeURIComponent("Authentication provider redirect was not returned")}`,
      { status: 303 }
    );
  }

  const response = NextResponse.redirect(location, { status: 302 });
  appendSelectedSetCookies(
    backendResponse.headers,
    response.headers,
    new Set([BACKEND_SESSION_COOKIE_NAME])
  );
  return response;
}
