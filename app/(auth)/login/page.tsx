"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowRight, KeyRound } from "lucide-react";
import { authApi } from "@/lib/api";

export default function LoginPage() {
  const handleGoogleLogin = () => {
    authApi.googleLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary">
            <GraduationCap className="w-7 h-7 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">Eduverse</span>
        </div>

        {/* Main Card */}
        <Card className="border-border bg-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-card-foreground">Welcome to Eduverse</CardTitle>
            <CardDescription>
              Sign in with your Google account to sync your classroom and start AI-powered learning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary: Google Login */}
            <Button
              type="button"
              className="w-full h-12 text-base gap-3"
              onClick={handleGoogleLogin}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">or</span>
              </div>
            </div>

            {/* Token Login Option */}
            <Link href="/token-login" className="block">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 gap-2"
              >
                <KeyRound className="w-4 h-4" />
                Paste Login Token
              </Button>
            </Link>

            {/* Help Text */}
            <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2 mt-4">
              <p className="font-medium text-card-foreground">How to sign in:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Click <strong>&quot;Continue with Google&quot;</strong> above</li>
                <li>Complete Google authentication</li>
                <li>If you see a JSON response, copy it and use <strong>&quot;Paste Login Token&quot;</strong></li>
                <li>Otherwise, you&apos;ll be redirected automatically</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
