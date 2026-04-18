"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authApi, removeToken } from "@/lib/api";
import { Loader2 } from "lucide-react";

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

  const completeCookieAuth = async () => {
    const user = await authApi.getMe();
    removeToken();
    await login("", user);
    finalizeSuccess();
  };

  useEffect(() => {
    if (hasHandledCallback.current) {
      return;
    }

    hasHandledCallback.current = true;

    const handleCallback = async () => {
      const errorParam = searchParams.get("error");

      if (errorParam) {
        setError(errorParam);
        return;
      }

      try {
        await completeCookieAuth();
        return;
      } catch (err) {
        console.error("Error completing cookie authentication:", err);
        setError("No authentication session found. Please try logging in again.");
      }
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
