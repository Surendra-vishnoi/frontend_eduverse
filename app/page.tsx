"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  GraduationCap,
  BookOpen,
  MessageSquare,
  FileText,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  const features = [
    {
      icon: BookOpen,
      title: "Virtual Classrooms",
      description: "Create and join classrooms to organize your learning materials",
    },
    {
      icon: FileText,
      title: "Document Upload",
      description: "Upload PDFs, notes, and study materials for AI processing",
    },
    {
      icon: MessageSquare,
      title: "AI-Powered Chat",
      description: "Ask questions and get intelligent answers from your materials",
    },
    {
      icon: Sparkles,
      title: "Smart Indexing",
      description: "Automatic document indexing for accurate and fast responses",
    },
  ];

  const benefits = [
    "24/7 access to your AI tutor",
    "Learn at your own pace",
    "Get instant answers to your questions",
    "Organize materials by classroom",
    "Share classrooms with peers",
    "Secure and private",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">Eduverse</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Sign in</Button>
              </Link>
              <Link href="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 text-balance">
              Your AI-Powered Learning Companion
            </h1>
            <p className="text-xl text-muted-foreground mb-8 text-pretty">
              Upload your study materials, ask questions, and get intelligent answers.
              Eduverse transforms how you learn with the power of AI.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="gap-2 text-base">
                  Start Learning Free
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="text-base">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Everything you need to learn smarter
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to enhance your learning experience
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">
                Why choose Eduverse?
              </h2>
              <p className="text-muted-foreground mb-8">
                Our AI-powered platform is designed to make learning more efficient,
                accessible, and personalized. Get answers to your questions instantly,
                right from your uploaded materials.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-secondary/50 border border-border flex items-center justify-center">
                <div className="text-center p-8">
                  <Sparkles className="w-16 h-16 text-primary mx-auto mb-4" />
                  <p className="text-lg font-semibold text-foreground mb-2">
                    AI-Powered Learning
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ask questions, get instant answers
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to transform your learning?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of students using Eduverse to study smarter, not harder.
          </p>
          <Link href="/register">
            <Button size="lg" className="gap-2 text-base">
              Get Started for Free
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">Eduverse</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built with AI for the future of education
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
