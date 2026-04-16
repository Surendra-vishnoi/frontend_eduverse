import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://eduverse-4x8o.onrender.com";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, await params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, await params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, await params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, await params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, await params);
}

async function handleProxy(
  request: NextRequest,
  params: { path: string[] }
) {
  const path = params.path.join("/");
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();
  const targetUrl = `${API_BASE_URL}/${path}${searchParams ? `?${searchParams}` : ""}`;

  // Get authorization header from request
  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");

  // Prepare headers
  const headers: Record<string, string> = {};
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }
  
  // Proxy Groq API Key if provided
  const groqKeyHeader = request.headers.get("X-Groq-Api-Key") || request.headers.get("x-groq-api-key");
  if (groqKeyHeader) {
    headers["X-Groq-Api-Key"] = groqKeyHeader;
  }

  // Handle different content types
  const contentType = request.headers.get("Content-Type");
  let body: BodyInit | null = null;

  if (request.method !== "GET" && request.method !== "HEAD") {
    if (contentType?.includes("multipart/form-data")) {
      // For file uploads, pass the formData directly
      body = await request.formData();
    } else if (contentType?.includes("application/x-www-form-urlencoded")) {
      // For form data (like login)
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      body = await request.text();
    } else {
      // For JSON
      headers["Content-Type"] = "application/json";
      try {
        const jsonBody = await request.json();
        body = JSON.stringify(jsonBody);
      } catch {
        // No body or empty body
      }
    }
  }

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    });

    // Get response data
    const responseContentType = response.headers.get("Content-Type");

    if (responseContentType?.includes("text/event-stream")) {
      const streamHeaders = new Headers();
      streamHeaders.set("Content-Type", "text/event-stream");
      streamHeaders.set(
        "Cache-Control",
        response.headers.get("Cache-Control") || "no-cache"
      );
      streamHeaders.set("Connection", "keep-alive");

      const sessionId =
        response.headers.get("X-Session-Id") ||
        response.headers.get("x-session-id");
      if (sessionId) {
        streamHeaders.set("X-Session-Id", sessionId);
      }

      return new NextResponse(response.body, {
        status: response.status,
        headers: streamHeaders,
      });
    }
    
    if (responseContentType?.includes("application/json")) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } else if (responseContentType?.includes("application/octet-stream") || 
               responseContentType?.includes("application/pdf") ||
               path.includes("download")) {
      // Handle file downloads
      const blob = await response.blob();
      return new NextResponse(blob, {
        status: response.status,
        headers: {
          "Content-Type": responseContentType || "application/octet-stream",
          "Content-Disposition": response.headers.get("Content-Disposition") || "",
        },
      });
    } else {
      const text = await response.text();
      return new NextResponse(text, { status: response.status });
    }
  } catch (error) {
    console.error("[v0] Proxy error:", error);
    return NextResponse.json(
      { detail: "Failed to connect to backend server" },
      { status: 502 }
    );
  }
}
