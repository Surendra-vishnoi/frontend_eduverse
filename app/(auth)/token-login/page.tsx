"use client";

import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Info } from "lucide-react";
import Link from "next/link";

function TokenLoginNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Info className="h-10 w-10 text-primary mx-auto mb-2" />
          <CardTitle className="text-2xl">Token Paste Disabled</CardTitle>
          <CardDescription>
            Google sign-in now completes automatically with secure redirect.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-md text-sm text-muted-foreground">
              Use the regular Google login button and you will be signed in automatically.
            </div>

            <Button asChild className="w-full">
              <Link href="/login">Back to Login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TokenLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <TokenLoginNotice />
    </Suspense>
  );
}
