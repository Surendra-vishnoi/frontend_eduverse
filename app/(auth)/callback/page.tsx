"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { setToken, setRefreshToken } from "@/lib/api";
import { Loader2 } from "lucide-react";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // Check for tokens in URL hash (fragment)
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      
      // Check for tokens in query params
      const accessToken = searchParams.get("access_token") || hashParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token") || hashParams.get("refresh_token");
      const userParam = searchParams.get("user") || hashParams.get("user");
      const errorParam = searchParams.get("error") || hashParams.get("error");

      if (errorParam) {
        setError(errorParam);
        return;
      }

      if (accessToken) {
        try {
          let user = null;
          if (userParam) {
            user = JSON.parse(decodeURIComponent(userParam));
          }
          
          // Store the tokens using the API helper
          setToken(accessToken);
          if (refreshToken) {
            setRefreshToken(refreshToken);
          }

          // Update auth context
          await login(accessToken, user);
          
          // Redirect to dashboard
          router.push("/dashboard");
        } catch (err) {
          console.error("Error processing auth callback:", err);
          setError("Failed to process authentication");
        }
      } else {
        setError("No authentication token received. Please try logging in again.");
      }
    };

    handleCallback();
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
