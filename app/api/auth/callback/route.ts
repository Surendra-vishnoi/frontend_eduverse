import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://eduverse-4x8o.onrender.com";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Get all the OAuth params that Google sends
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const scope = searchParams.get("scope");
  const authuser = searchParams.get("authuser");
  const prompt = searchParams.get("prompt");
  const error = searchParams.get("error");

  // Get the frontend origin for redirect
  const origin = request.headers.get("x-forwarded-host") 
    ? `https://${request.headers.get("x-forwarded-host")}`
    : request.nextUrl.origin;

  if (error) {
    return NextResponse.redirect(`${origin}/callback?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${origin}/callback?error=${encodeURIComponent("Missing OAuth callback parameters")}`
    );
  }

  // Redirect browser to backend callback so backend session cookies are included.
  // The backend then redirects to frontend /callback with tokens in fragment.
  const backendCallbackUrl = new URL(`${BACKEND_URL}/auth/callback`);
  backendCallbackUrl.searchParams.set("code", code);
  backendCallbackUrl.searchParams.set("state", state);
  if (scope) backendCallbackUrl.searchParams.set("scope", scope);
  if (authuser) backendCallbackUrl.searchParams.set("authuser", authuser);
  if (prompt) backendCallbackUrl.searchParams.set("prompt", prompt);

  return NextResponse.redirect(backendCallbackUrl.toString(), { status: 307 });
}
