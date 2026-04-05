"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { classroomApi, healthApi, Classroom } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  MessageSquare,
  FileText,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [healthStatus, setHealthStatus] = useState<"healthy" | "unhealthy" | "checking">("checking");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Always check health
        const health = await healthApi.check();
        setHealthStatus(health.status === "healthy" ? "healthy" : "unhealthy");

        // Only fetch classrooms if authenticated
        if (isAuthenticated) {
          const classroomsData = await classroomApi.getCourses();
          setClassrooms(Array.isArray(classroomsData) ? classroomsData : []);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        // Don't show error toast for unauthenticated users
        if (isAuthenticated) {
          toast.error("Failed to load dashboard data");
        }
        setHealthStatus("unhealthy");
      } finally {
        setIsLoading(false);
      }
    };

    // Wait for auth to finish loading before fetching
    if (!authLoading) {
      fetchData();
    }
  }, [isAuthenticated, authLoading]);

  const features = [
    {
      icon: BookOpen,
      title: "Classrooms",
      description: "Sync your Google Classroom courses and manage learning materials",
      href: "/classrooms",
    },
    {
      icon: FileText,
      title: "Documents",
      description: "Sync or upload PDFs and files, then index them for AI learning",
      href: "/classrooms",
    },
    {
      icon: MessageSquare,
      title: "AI Chat",
      description: "Ask questions and get intelligent answers from your indexed materials",
      href: "/chat",
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome back, {user?.name?.split(" ")[0] || "Student"}
        </h1>
        <p className="text-muted-foreground">
          Your AI-powered learning companion is ready to help
        </p>
      </div>

      {/* Status Card */}
      <Card className="mb-8 border-border bg-card">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            {healthStatus === "checking" ? (
              <Spinner className="w-5 h-5 text-primary" />
            ) : healthStatus === "healthy" ? (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            ) : (
              <AlertCircle className="w-5 h-5 text-destructive" />
            )}
            <span className="text-sm text-card-foreground">
              {healthStatus === "checking"
                ? "Checking server status..."
                : healthStatus === "healthy"
                ? "Server is online and ready"
                : "Server may be experiencing issues"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4" />
            AI Tutor Ready
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-border bg-card">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Classrooms</p>
                <p className="text-3xl font-bold text-card-foreground">
                  {isLoading ? "-" : classrooms.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">AI Conversations</p>
                <p className="text-3xl font-bold text-card-foreground">Ready</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Learning Status</p>
                <p className="text-3xl font-bold text-card-foreground">Active</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Classrooms */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Your Classrooms</h2>
          <Link href="/classrooms">
            <Button variant="ghost" size="sm" className="gap-1">
              View all
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-6 h-6 text-primary" />
          </div>
        ) : classrooms.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="py-12">
              <Empty
                icon={<BookOpen className="w-12 h-12" />}
                title="No courses synced yet"
                description="Sync your Google Classroom courses to start learning with AI"
              >
                <Link href="/classrooms">
                  <Button className="mt-4 gap-2">
                    <Plus className="w-4 h-4" />
                    Sync Classrooms
                  </Button>
                </Link>
              </Empty>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classrooms.slice(0, 3).map((classroom) => (
              <Link key={classroom.id} href={`/classrooms/${classroom.id}`}>
                <Card className="border-border bg-card hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="text-lg text-card-foreground">{classroom.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {classroom.section || classroom.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {classroom.room && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="px-2 py-1 rounded bg-secondary text-secondary-foreground">
                          Room: {classroom.room}
                        </span>
                      </div>
                    )}
                    {classroom.sync_status && (
                      <div className="flex items-center mt-2 gap-2 text-xs text-muted-foreground">
                         <span className={`px-2 py-1 rounded ${
                          classroom.sync_status === "completed"
                            ? "bg-primary/10 text-primary"
                            : classroom.sync_status === "syncing"
                            ? "bg-yellow-500/10 text-yellow-600"
                            : classroom.sync_status === "failed"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                         }`}>
                          {classroom.sync_status === "completed" ? "Synced" :
                           classroom.sync_status === "syncing" ? "Syncing..." :
                           classroom.sync_status === "failed" ? "Failed" :
                           "Pending"}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Features */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature) => (
            <Link key={feature.title} href={feature.href}>
              <Card className="border-border bg-card hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-card-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
