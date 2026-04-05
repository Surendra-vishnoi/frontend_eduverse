import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = "https://eduverse-4x8o.onrender.com";

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

  if (!code) {
    return NextResponse.redirect(`${origin}/callback?error=${encodeURIComponent("No authorization code received")}`);
  }

  try {
    // Build the callback URL with all params to forward to backend
    const backendCallbackUrl = new URL(`${API_BASE_URL}/auth/callback`);
    if (code) backendCallbackUrl.searchParams.set("code", code);
    if (state) backendCallbackUrl.searchParams.set("state", state);
    if (scope) backendCallbackUrl.searchParams.set("scope", scope);
    if (authuser) backendCallbackUrl.searchParams.set("authuser", authuser);
    if (prompt) backendCallbackUrl.searchParams.set("prompt", prompt);

    // Call the backend callback endpoint
    const response = await fetch(backendCallbackUrl.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[v0] Backend callback error:", errorText);
      return NextResponse.redirect(
        `${origin}/callback?error=${encodeURIComponent("Authentication failed: " + response.status)}`
      );
    }

    const data = await response.json();

    // Redirect to frontend callback with tokens
    const redirectUrl = new URL(`${origin}/callback`);
    
    if (data.access_token) {
      redirectUrl.searchParams.set("access_token", data.access_token);
    }
    if (data.refresh_token) {
      redirectUrl.searchParams.set("refresh_token", data.refresh_token);
    }
    if (data.user) {
      redirectUrl.searchParams.set("user", JSON.stringify(data.user));
    }

    return NextResponse.redirect(redirectUrl.toString());
  } catch (err) {
    console.error("[v0] Auth callback error:", err);
    return NextResponse.redirect(
      `${origin}/callback?error=${encodeURIComponent("Failed to complete authentication")}`
    );
  }
}
