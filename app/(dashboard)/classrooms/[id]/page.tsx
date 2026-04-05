"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  classroomApi,
  filesApi,
  indexingApi,
  Classroom,
  FileItem,
  getGroqKey,
  getCachedCourseFiles,
  updateCachedCourseFile,
  upsertCachedCourseFile,
} from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { toast } from "sonner";
import {
  ArrowLeft,
  Upload,
  FileText,
  Trash2,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
} from "lucide-react";

interface ClassroomDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ClassroomDetailPage({ params }: ClassroomDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncingFiles, setIsSyncingFiles] = useState(false);
  const [indexingFileIds, setIndexingFileIds] = useState<Set<string>>(new Set());
  const [showFilesUnavailableHint, setShowFilesUnavailableHint] = useState(false);
  const pollingIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const fetchCourseFiles = useCallback(async () => {
    try {
      const filesData = await classroomApi.getCourseFiles(id);
      const cachedFiles = getCachedCourseFiles(id);
      const shouldShowHint = filesData.length === 0 && cachedFiles.length === 0;
      setShowFilesUnavailableHint(shouldShowHint);

      setFiles((prev) => {
        // Keep current UI state if backend temporarily returns an empty fallback list.
        if (filesData.length === 0 && prev.length > 0) {
          return prev;
        }
        return filesData;
      });
    } catch (error) {
      console.error("Failed to fetch files:", error);
    }
  }, [id]);

  const fetchData = useCallback(async () => {
    try {
      // Get courses and find this one
      const courses = await classroomApi.getCourses();
      const course = courses.find((c) => c.id === id);
      if (course) {
        setClassroom(course);
      }
      // Get course files
      await fetchCourseFiles();
    } catch (error) {
      console.error("Failed to fetch classroom:", error);
      toast.error("Failed to load classroom");
      router.push("/classrooms");
    } finally {
      setIsLoading(false);
    }
  }, [id, router, fetchCourseFiles]);

  useEffect(() => {
    fetchData();
    
    // Cleanup polling intervals on unmount
    return () => {
      pollingIntervals.current.forEach((interval) => clearInterval(interval));
    };
  }, [fetchData]);

  // Poll for indexing status
  const pollIndexingStatus = useCallback((fileId: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await indexingApi.getFileStatus(fileId);
        if (status.status === "completed") {
          clearInterval(interval);
          pollingIntervals.current.delete(fileId);
          setIndexingFileIds((prev) => {
            const next = new Set(prev);
            next.delete(fileId);
            return next;
          });
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, indexing_status: "completed", indexed: true } : f
            )
          );
          updateCachedCourseFile(id, fileId, { indexing_status: "completed", indexed: true });
          toast.success("File indexed and ready for AI chat!");
        } else if (status.status === "failed") {
          clearInterval(interval);
          pollingIntervals.current.delete(fileId);
          setIndexingFileIds((prev) => {
            const next = new Set(prev);
            next.delete(fileId);
            return next;
          });
          setFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, indexing_status: "failed" } : f))
          );
          updateCachedCourseFile(id, fileId, { indexing_status: "failed", indexed: false });
          toast.error("Failed to index file");
        }
      } catch {
        // Continue polling on error
      }
    }, 3000);
    
    pollingIntervals.current.set(fileId, interval);
  }, []);

  const handleSyncFiles = async () => {
    setIsSyncingFiles(true);
    try {
      const result = await classroomApi.syncCourseFiles(id);
      toast.success(result.message || "File sync started! Downloading files in background...");

      // The backend runs file sync as a background task.
      // Poll for completion by checking the course sync_status and fetching files.
      let attempts = 0;
      const maxAttempts = 15; // ~60 seconds
      const pollInterval = 4000;

      const poll = async () => {
        attempts++;
        try {
          // Check course sync status
          const courseStatus = await classroomApi.getCourseStatus(id);
          if (courseStatus) {
            setClassroom(courseStatus);
          }

          // Try fetching files
          await fetchCourseFiles();

          const status = courseStatus?.sync_status;
          if (status === "completed" || status === "failed") {
            setIsSyncingFiles(false);
            if (status === "completed") {
              toast.success("Files synced successfully!");
            } else {
              toast.error("File sync encountered an error. Some files may not have been downloaded.");
            }
            return;
          }

          if (attempts < maxAttempts) {
            setTimeout(poll, pollInterval);
          } else {
            setIsSyncingFiles(false);
            toast.info("File sync is still running in the background. Refresh the page later to see new files.");
          }
        } catch {
          if (attempts < maxAttempts) {
            setTimeout(poll, pollInterval);
          } else {
            setIsSyncingFiles(false);
          }
        }
      };

      // Start polling after a short delay to let the backend start processing
      setTimeout(poll, 2000);
    } catch (error) {
      setIsSyncingFiles(false);
      toast.error(error instanceof Error ? error.message : "Failed to sync files");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploaded = await filesApi.upload(file, id);

      // Optimistically show uploaded file even if backend list endpoint is temporarily inconsistent.
      setFiles((prev) => {
        const exists = prev.some((f) => f.id === uploaded.file_id);
        if (exists) {
          return prev;
        }

        return [
          {
            id: uploaded.file_id,
            filename: uploaded.file_name || file.name,
            file_type: file.type || "uploaded",
            course_id: id,
            indexed: false,
            indexing_status: "pending",
          },
          ...prev,
        ];
      });

      upsertCachedCourseFile(id, {
        id: uploaded.file_id,
        filename: uploaded.file_name || file.name,
        file_type: file.type || "uploaded",
        course_id: id,
        indexed: false,
        indexing_status: "pending",
      });

      toast.success("File uploaded successfully!");

      // Refresh in background; if backend returns validation error it is handled in api layer.
      void fetchCourseFiles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleIndexFile = async (fileId: string) => {
    if (!getGroqKey()) {
      toast.error("Groq API key required. Open AI Chat and set your API key first.");
      return;
    }

    setIndexingFileIds((prev) => new Set(prev).add(fileId));
    try {
      await indexingApi.indexFile(fileId);
      toast.info("Indexing started. This may take a few moments...");
      updateCachedCourseFile(id, fileId, { indexing_status: "processing", indexed: false });
      pollIndexingStatus(fileId);
    } catch (error) {
      setIndexingFileIds((prev) => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });

      const errorMessage = error instanceof Error ? error.message : "Failed to start indexing";

      if (errorMessage.toLowerCase().includes("already indexed")) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, indexed: true, indexing_status: "completed" } : f
          )
        );
        updateCachedCourseFile(id, fileId, { indexed: true, indexing_status: "completed" });
        toast.success("File is already indexed and ready for AI chat.");
        return;
      }

      toast.error(errorMessage);
    }
  };

  const handleIndexAllFiles = async () => {
    if (!getGroqKey()) {
      toast.error("Groq API key required. Open AI Chat and set your API key first.");
      return;
    }

    try {
      await indexingApi.indexCourse(id);
      toast.info("Indexing all files. This may take a few moments...");
      // Start polling for all files
      files.forEach((file) => {
        if (!file.indexed && file.indexing_status !== "completed") {
          setIndexingFileIds((prev) => new Set(prev).add(file.id));
          pollIndexingStatus(file.id);
        }
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to index files");
    }
  };

  const handleDeleteFromMemory = async (fileId: string) => {
    if (!confirm("Remove this file from AI memory? The file will still be available.")) return;

    try {
      await indexingApi.deleteFile(fileId);
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, indexed: false, indexing_status: "pending" } : f))
      );
      updateCachedCourseFile(id, fileId, { indexed: false, indexing_status: "pending" });
      toast.success("File removed from AI memory");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove from memory");
    }
  };

  const getStatusIcon = (file: FileItem) => {
    if (indexingFileIds.has(file.id) || file.indexing_status === "processing") {
      return <Spinner className="w-4 h-4 text-primary" />;
    }
    if (file.indexed || file.indexing_status === "completed") {
      return <CheckCircle2 className="w-4 h-4 text-primary" />;
    }
    if (file.indexing_status === "failed") {
      return <AlertCircle className="w-4 h-4 text-destructive" />;
    }
    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  const getStatusText = (file: FileItem) => {
    if (indexingFileIds.has(file.id) || file.indexing_status === "processing") {
      return "Indexing...";
    }
    if (file.indexed || file.indexing_status === "completed") {
      return "Ready for AI";
    }
    if (file.indexing_status === "failed") {
      return "Indexing failed";
    }
    return "Not indexed";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  if (!classroom) {
    return null;
  }

  const indexedCount = files.filter((f) => f.indexed || f.indexing_status === "completed").length;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/classrooms">
          <Button variant="ghost" size="sm" className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Classrooms
          </Button>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{classroom.name}</h1>
            <p className="text-muted-foreground mb-3">
              {classroom.section || classroom.description || "No description"}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {classroom.room && (
                <span className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium">
                  Room: {classroom.room}
                </span>
              )}
              {classroom.sync_status && (
                <span
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    classroom.sync_status === "completed"
                      ? "bg-primary/10 text-primary"
                      : classroom.sync_status === "syncing"
                      ? "bg-yellow-500/10 text-yellow-600"
                      : classroom.sync_status === "failed"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {classroom.sync_status === "completed" ? "Synced" :
                   classroom.sync_status === "syncing" ? "Syncing..." :
                   classroom.sync_status === "failed" ? "Sync Failed" :
                   "Pending"}
                </span>
              )}
              {classroom.last_synced && (
                <span className="text-xs text-muted-foreground">
                  Last synced: {new Date(classroom.last_synced).toLocaleDateString()}
                </span>
              )}
              {classroom.classroom_id && (
                <a
                  href={`https://classroom.google.com/c/${classroom.classroom_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm ml-auto"
                >
                  Open in Google Classroom
                </a>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Link href={`/chat?course=${id}`}>
              <Button className="gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat with AI
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Index Status Card */}
      <Card className="mb-6 border-border bg-card">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {indexedCount > 0 ? (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              ) : (
                <BookOpen className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium text-card-foreground">
                  {indexedCount > 0
                    ? `${indexedCount} of ${files.length} files indexed`
                    : "No files indexed yet"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {indexedCount > 0
                    ? "Indexed files are ready for AI chat"
                    : "Index files to enable AI-powered learning"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleIndexAllFiles}
              disabled={files.length === 0 || indexedCount === files.length}
            >
              <RefreshCw className="w-4 h-4" />
              Index All Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Files Section */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl text-card-foreground">Course Files</CardTitle>
              <CardDescription>
                Sync files from Google Classroom or upload manually
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleSyncFiles}
                disabled={isSyncingFiles}
              >
                {isSyncingFiles ? <Spinner className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                Sync from Classroom
              </Button>
              <div className="relative">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md,.ppt,.pptx"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                <Button className="gap-2" disabled={isUploading}>
                  {isUploading ? <Spinner className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                  Upload
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <Empty
              icon={<FileText className="w-12 h-12" />}
              title={showFilesUnavailableHint ? "Files unavailable right now" : "No files yet"}
              description={
                showFilesUnavailableHint
                  ? "Backend file listing endpoint is failing for this course. You can still upload and index files from this page."
                  : "Sync files from Google Classroom or upload your own study materials"
              }
            />
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{file.filename}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{file.file_type}</span>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(file)}
                          {getStatusText(file)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.indexed || file.indexing_status === "completed" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteFromMemory(file.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove from AI
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleIndexFile(file.id)}
                        disabled={indexingFileIds.has(file.id) || file.indexing_status === "processing"}
                      >
                        {indexingFileIds.has(file.id) ? (
                          <Spinner className="w-4 h-4 mr-1" />
                        ) : (
                          <BookOpen className="w-4 h-4 mr-1" />
                        )}
                        Index for AI
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
