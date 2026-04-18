"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authApi, removeToken, setToken, setRefreshToken, type User } from "@/lib/api";
import { Loader2 } from "lucide-react";

const API_PROXY_BASE = "/api/proxy";
const LEGACY_FRAGMENT_FALLBACK_ENABLED =
  (process.env.NEXT_PUBLIC_AUTH_FRAGMENT_FALLBACK_ENABLED || "false").toLowerCase() === "true";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const hasHandledCallback = useRef(false);

  const finalizeSuccess = () => {
    // Remove callback query/hash artifacts from browser history.
    window.history.replaceState({}, document.title, window.location.pathname);
    router.replace("/dashboard");
  };

  const completeAuth = async (accessToken: string, refreshToken: string | null, user: User | null) => {
    setToken(accessToken);
    if (refreshToken) {
      setRefreshToken(refreshToken);
    }

    await login(accessToken, user);
    finalizeSuccess();
  };

  const completeCookieAuth = async () => {
    const user = await authApi.getMe();
    removeToken();
    await login("", user);
    finalizeSuccess();
  };

  const exchangeCodeForToken = async (code: string, state: string) => {
    const callbackUrl = `${API_PROXY_BASE}/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}&response_mode=json`;
    const response = await fetch(callbackUrl, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const fallbackMessage = `Authentication failed with status ${response.status}`;
      let detail = fallbackMessage;
      try {
        const data = await response.json();
        detail = data?.detail || fallbackMessage;
      } catch {
        // Keep fallback message.
      }
      throw new Error(detail);
    }

    const data = await response.json();
    if (!data?.access_token) {
      throw new Error("Authentication response missing access token");
    }

    await completeAuth(data.access_token, data.refresh_token || null, data.user || null);
  };

  useEffect(() => {
    if (hasHandledCallback.current) {
      return;
    }

    hasHandledCallback.current = true;

    const handleCallback = async () => {
      const hash = LEGACY_FRAGMENT_FALLBACK_ENABLED ? window.location.hash.replace(/^#/, "") : "";
      const hashParams = new URLSearchParams(hash);

      const accessToken = LEGACY_FRAGMENT_FALLBACK_ENABLED
        ? searchParams.get("access_token") || hashParams.get("access_token")
        : null;
      const refreshToken = LEGACY_FRAGMENT_FALLBACK_ENABLED
        ? searchParams.get("refresh_token") || hashParams.get("refresh_token")
        : null;
      const userParam = LEGACY_FRAGMENT_FALLBACK_ENABLED
        ? searchParams.get("user") || hashParams.get("user")
        : null;
      const errorParam = searchParams.get("error") || (LEGACY_FRAGMENT_FALLBACK_ENABLED ? hashParams.get("error") : null);

      if (errorParam) {
        setError(errorParam);
        return;
      }

      // Cookie-first path: if backend already issued HttpOnly cookies,
      // use them and avoid relying on URL token fragments.
      try {
        await completeCookieAuth();
        return;
      } catch {
        // Cookie session not ready; continue with legacy fallback flows.
      }

      if (LEGACY_FRAGMENT_FALLBACK_ENABLED && accessToken) {
        try {
          let user = null;
          if (userParam) {
            user = JSON.parse(userParam);
          }

          await completeAuth(accessToken, refreshToken, user);
        } catch (err) {
          console.error("Error processing auth callback:", err);
          setError("Failed to process authentication");
        }
        return;
      }

      if (LEGACY_FRAGMENT_FALLBACK_ENABLED) {
        // Legacy fallback: if callback has code/state, exchange for tokens.
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        if (code && state) {
          try {
            await exchangeCodeForToken(code, state);
          } catch (err) {
            console.error("Error exchanging code for token:", err);
            setError(err instanceof Error ? err.message : "Failed to complete authentication");
          }
          return;
        }
      }

      setError("No authentication token received. Please try logging in again.");
    };

    void handleCallback();
  }, [searchParams, login, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-destructive mb-2">Authentication Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <a href="/login" className="text-primary hover:underline">
            Return to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
