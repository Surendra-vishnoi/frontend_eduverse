"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { classroomApi, Classroom } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { toast } from "sonner";
import { BookOpen, RefreshCw, ExternalLink } from "lucide-react";

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchClassrooms = async () => {
    try {
      const data = await classroomApi.getCourses();
      setClassrooms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch classrooms:", error);
      toast.error("Failed to load classrooms. Please try syncing.");
      setClassrooms([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // syncCourses returns the updated list directly
      const courses = await classroomApi.syncCourses();
      if (Array.isArray(courses)) {
        setClassrooms(courses);
      } else {
        await fetchClassrooms();
      }
      toast.success("Classrooms synced from Google Classroom!");
    } catch (error) {
      console.error("Failed to sync:", error);
      toast.error(error instanceof Error ? error.message : "Failed to sync classrooms");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Classrooms</h1>
          <p className="text-muted-foreground">
            Your Google Classroom courses synced for AI learning
          </p>
        </div>
        <Button 
          onClick={handleSync} 
          disabled={isSyncing}
          className="gap-2"
        >
          {isSyncing ? (
            <Spinner className="w-4 h-4" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Sync from Google Classroom
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="w-8 h-8 text-primary" />
        </div>
      ) : classrooms.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-20">
            <Empty
              icon={<BookOpen className="w-16 h-16" />}
              title="No classrooms found"
              description="Sync your courses from Google Classroom to get started with AI-powered learning"
            >
              <Button onClick={handleSync} disabled={isSyncing} className="mt-6 gap-2">
                {isSyncing ? (
                  <Spinner className="w-4 h-4" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Sync from Google Classroom
              </Button>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classrooms.map((classroom) => (
            <Link key={classroom.id} href={`/classrooms/${classroom.id}`}>
              <Card className="border-border bg-card hover:border-primary/50 transition-colors cursor-pointer h-full group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    {classroom.classroom_id && (
                      <a
                        href={`https://classroom.google.com/c/${classroom.classroom_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="Open in Google Classroom"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  <CardTitle className="text-lg text-card-foreground">
                    {classroom.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {classroom.section || classroom.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    {classroom.room && (
                      <span className="px-2 py-1 rounded bg-secondary text-secondary-foreground">
                        Room: {classroom.room}
                      </span>
                    )}
                    {classroom.sync_status && (
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
                    )}
                    {(classroom.total_files ?? 0) > 0 && (
                      <span className="px-2 py-1 rounded bg-secondary text-secondary-foreground">
                        {classroom.total_files} files
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
