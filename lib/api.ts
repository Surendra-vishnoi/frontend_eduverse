const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://eduverse-4x8o.onrender.com";
// Use proxy to avoid CORS issues
const API_BASE_URL = typeof window !== "undefined" ? "/api/proxy" : BACKEND_URL;

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface Classroom {
  id: string;
  classroom_id?: string;
  name: string;
  description?: string;
  section?: string;
  room?: string;
  sync_status?: string;
  last_synced?: string;
  total_files?: number;
  processed_files?: number;
}

export interface FileItem {
  id: string;
  filename: string;
  file_type: string;
  course_id?: string;
  uploaded_at?: string;
  url?: string;
  indexed?: boolean;
  indexing_status?: "pending" | "processing" | "completed" | "failed";
  drive_id?: string;
  file_size?: number;
  processing_error?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Array<string | ChatCitation>;
}

export interface ChatCitation {
  number?: number;
  source_id?: string | null;
  file_name?: string;
  source_type?: string;
  page_number?: number | null;
  start_time?: number | null;
  end_time?: number | null;
  text_snippet?: string;
}

export interface ChatQueryResponse {
  answer?: string;
  response?: string;
  message?: string;
  content?: string;
  citations?: Array<string | ChatCitation>;
  session_id?: string;
  sources_used?: number;
}

export interface ChatStreamEvent {
  type: "answer" | "tool_call" | "tool_result" | "citations";
  content?: unknown;
  tool?: string;
  args?: string;
  citations?: Array<string | ChatCitation>;
}

interface ChatStreamCallbacks {
  onAnswer?: (delta: string, fullAnswer: string) => void;
  onEvent?: (event: ChatStreamEvent) => void;
  signal?: AbortSignal;
}

export interface ChatSession {
  id: string;
  course_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface BackendCourse {
  id: string;
  classroom_id?: string;
  name?: string;
  section?: string | null;
  description?: string | null;
  room?: string | null;
  sync_status?: string;
  last_synced?: string | null;
  total_files?: number;
  processed_files?: number;
}

interface BackendFile {
  id: string;
  course_id?: string | null;
  drive_id?: string | null;
  drive_name?: string;
  file_name?: string;
  filename?: string;
  detected_type?: string | null;
  file_type?: string;
  processing_status?: "pending" | "processing" | "completed" | "failed";
  indexing_status?: "pending" | "processing" | "completed" | "failed";
  status?: "pending" | "processing" | "completed" | "failed";
  file_size?: number;
  processing_error?: string | null;
  uploaded_at?: string;
  created_at?: string;
  web_view_link?: string;
  url?: string;
}

interface BackendChatHistoryResponse {
  session_id: string;
  message_count: number;
  messages: Array<{ role: string; content: string }>;
}

interface BackendChatSessionsResponse {
  sessions?: Array<string | Partial<ChatSession>>;
  count?: number;
}

export interface ApiError {
  detail: string;
}

export class ApiRequestError extends Error {
  status: number;
  endpoint: string;

  constructor(message: string, status: number, endpoint: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.endpoint = endpoint;
  }
}

function normalizeToken(token: string | null | undefined): string | null {
  if (!token) {
    return null;
  }

  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/^Bearer\s+/i, "");
}

function normalizeIndexingStatus(status: unknown): FileItem["indexing_status"] {
  const normalized = String(status ?? "").toLowerCase();
  if (normalized === "processing") return "processing";
  if (normalized === "completed") return "completed";
  if (normalized === "failed") return "failed";
  return "pending";
}

function mapCourse(course: BackendCourse): Classroom {
  return {
    id: String(course.id),
    classroom_id: course.classroom_id || undefined,
    name: course.name || "Untitled Course",
    section: course.section || undefined,
    description: course.description || undefined,
    room: course.room || undefined,
    sync_status: course.sync_status || "pending",
    last_synced: course.last_synced || undefined,
    total_files: typeof course.total_files === "number" ? course.total_files : 0,
    processed_files: typeof course.processed_files === "number" ? course.processed_files : 0,
  };
}

function mapFile(file: BackendFile): FileItem {
  if (!file || typeof file !== "object") {
    return {
      id: "unknown",
      filename: "Unnamed file",
      file_type: "unknown",
      indexed: false,
      indexing_status: "pending",
    };
  }

  const indexingStatus = normalizeIndexingStatus(
    file.processing_status ?? file.indexing_status ?? file.status
  );

  return {
    id: String(file.id ?? "unknown"),
    filename: file.filename || file.file_name || file.drive_name || "Unnamed file",
    file_type: file.file_type || file.detected_type || "unknown",
    course_id: file.course_id ?? undefined,
    uploaded_at: file.uploaded_at || file.created_at || undefined,
    url: file.url || file.web_view_link || undefined,
    indexed: indexingStatus === "completed",
    indexing_status: indexingStatus,
    drive_id: file.drive_id ?? undefined,
    file_size: typeof file.file_size === "number" ? file.file_size : undefined,
    processing_error: file.processing_error ?? undefined,
  };
}

function getCourseFilesCacheKey(courseId: string): string {
  return `eduverse_course_files_${courseId}`;
}

function readCourseFilesCache(courseId: string): FileItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(getCourseFilesCacheKey(courseId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FileItem[]) : [];
  } catch {
    return [];
  }
}

function writeCourseFilesCache(courseId: string, files: FileItem[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(getCourseFilesCacheKey(courseId), JSON.stringify(files));
  } catch {
    // Ignore cache write failures.
  }
}

function upsertCourseFileCache(courseId: string, file: FileItem): void {
  const current = readCourseFilesCache(courseId);
  const exists = current.some((item) => item.id === file.id);
  const next = exists
    ? current.map((item) => (item.id === file.id ? { ...item, ...file } : item))
    : [file, ...current];

  writeCourseFilesCache(courseId, next);
}

export function getCachedCourseFiles(courseId: string): FileItem[] {
  return readCourseFilesCache(courseId);
}

export function upsertCachedCourseFile(courseId: string, file: FileItem): void {
  upsertCourseFileCache(courseId, file);
}

export function updateCachedCourseFile(
  courseId: string,
  fileId: string,
  updates: Partial<FileItem>
): void {
  const current = readCourseFilesCache(courseId);
  if (!current.length) {
    return;
  }

  const next = current.map((file) => (file.id === fileId ? { ...file, ...updates } : file));
  writeCourseFilesCache(courseId, next);
}

function mapChatRole(role: string): "user" | "assistant" {
  return role === "human" || role === "user" ? "user" : "assistant";
}

// Token management
export function getToken(): string | null {
  if (typeof window !== "undefined") {
    return normalizeToken(localStorage.getItem("eduverse_token"));
  }
  return null;
}

export function setToken(token: string): void {
  if (typeof window !== "undefined") {
    const normalizedToken = normalizeToken(token);
    if (normalizedToken) {
      localStorage.setItem("eduverse_token", normalizedToken);
    }
  }
}

export function getRefreshToken(): string | null {
  if (typeof window !== "undefined") {
    return normalizeToken(localStorage.getItem("eduverse_refresh_token"));
  }
  return null;
}

export function setRefreshToken(token: string): void {
  if (typeof window !== "undefined") {
    const normalizedToken = normalizeToken(token);
    if (normalizedToken) {
      localStorage.setItem("eduverse_refresh_token", normalizedToken);
    }
  }
}

export function removeToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("eduverse_token");
    localStorage.removeItem("eduverse_refresh_token");
    localStorage.removeItem("eduverse_groq_key");
  }
}

// Groq API key management (required for chat)
export function getGroqKey(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("eduverse_groq_key");
  }
  return null;
}

export function setGroqKey(key: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("eduverse_groq_key", key);
  }
}

async function parseResponseBody<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const refreshPayload = refreshToken ? { refresh_token: refreshToken } : {};
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(refreshPayload),
        });

        if (!response.ok) {
          return false;
        }

        const data = await parseResponseBody<{ access_token?: string; refresh_token?: string }>(response);

        if (!data.access_token) {
          return false;
        }

        setToken(data.access_token);
        if (data.refresh_token) {
          setRefreshToken(data.refresh_token);
        }

        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

// Generic fetch wrapper
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  includeGroqKey = false,
  retryOnAuthFailure = true
): Promise<T> {
  let token = getToken();

  // If access token is missing but refresh token exists, recover before the first request.
  if (!token && retryOnAuthFailure && endpoint !== "/auth/refresh") {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      token = getToken();
    }
  }

  const headers: Record<string, string> = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (includeGroqKey) {
    const groqKey = getGroqKey();
    if (groqKey) {
      headers["X-Groq-Api-Key"] = groqKey;
    }
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      ...headers,
      ...(options.headers as Record<string, string>),
    },
  });

  if (response.status === 401 && retryOnAuthFailure && endpoint !== "/auth/refresh") {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch<T>(endpoint, options, includeGroqKey, false);
    }

    // Keep auth state consistent if both access and refresh tokens are invalid.
    removeToken();
  }

  if (!response.ok) {
    let errorDetail = "An error occurred";
    try {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.detail || errorJson.message || errorText;
      } catch {
        errorDetail = errorText || `Request failed with status ${response.status}`;
      }
    } catch {
      // Keep default error
    }

    const message = errorDetail || `Request failed with status ${response.status}`;
    throw new ApiRequestError(message, response.status, endpoint);
  }

  return parseResponseBody<T>(response);
}

// ==========================================
// 1. Authentication (/auth)
// ==========================================
export const authApi = {
  // Redirect to Google login
  googleLogin: () => {
    const loginUrl = new URL(`${BACKEND_URL}/auth/login`);
    loginUrl.searchParams.set("redirect", "true");
    loginUrl.searchParams.set("frontend_redirect", `${window.location.origin}/callback`);
    window.location.href = loginUrl.toString();
  },

  // Backend supports Google OAuth only.
  login: async (_email: string, _password: string): Promise<{ access_token: string }> => {
    throw new Error("Email/password login is not supported. Please use Google login.");
  },

  // Backend supports Google OAuth only.
  register: async (_email: string, _password: string, _name: string): Promise<{ access_token: string }> => {
    throw new Error("Registration is handled through Google login.");
  },

  // Refresh access token
  refresh: async (refreshToken?: string) => {
    const payload = refreshToken ? { refresh_token: refreshToken } : {};
    return apiFetch<{ access_token: string; refresh_token: string }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  logout: async () => {
    return apiFetch<{ message: string }>("/auth/logout", {
      method: "POST",
    });
  },

  // Get current user profile
  getMe: async () => {
    return apiFetch<User>("/auth/me");
  },

  // Alternative: Get profile
  getProfile: async () => {
    return apiFetch<User>("/auth/me");
  },
};

// ==========================================
// 2. Google Classroom Integration (/classroom)
// ==========================================
export const classroomApi = {
  // Get all courses the student is enrolled in
  getCourses: async () => {
    const courses = await apiFetch<BackendCourse[]>("/classroom/courses");
    return Array.isArray(courses) ? courses.map(mapCourse) : [];
  },

  // Force sync courses from Google Classroom
  syncCourses: async () => {
    const response = await apiFetch<{ message?: string; courses?: BackendCourse[] } | BackendCourse[]>(
      "/classroom/courses/sync"
    );

    const courses = Array.isArray(response)
      ? response
      : Array.isArray(response?.courses)
      ? response.courses
      : [];

    return courses.map(mapCourse);
  },

  // Sync files from a specific course (scrape assignments/PDFs)
  // NOTE: This is a background task — returns immediately with status, not files.
  // Poll getCourseFiles() afterwards to get newly synced files.
  syncCourseFiles: async (courseId: string) => {
    return apiFetch<{ message: string; course_id?: string; status?: string }>(
      `/classroom/courses/${courseId}/sync-files`,
      { method: "POST" }
    );
  },

  // Get the current course to check sync_status (for polling after syncCourseFiles)
  getCourseStatus: async (courseId: string) => {
    const courses = await apiFetch<BackendCourse[]>("/classroom/courses");
    const course = (Array.isArray(courses) ? courses : []).find((c) => String(c.id) === courseId);
    return course ? mapCourse(course) : null;
  },

  // Get files for a specific course
  getCourseFiles: async (courseId: string) => {
    try {
      const response = await apiFetch<any>(`/classroom/courses/${courseId}/files`);
      
      const rawFiles = Array.isArray(response)
        ? response
        : Array.isArray(response?.files)
        ? response.files
        : Array.isArray(response?.data)
        ? response.data
        : [];
        
      const mappedFiles = rawFiles.map(mapFile);
      writeCourseFilesCache(courseId, mappedFiles);
      return mappedFiles;
    } catch (error) {
      // Backend bug workaround:
      // manually uploaded files may have null drive_id, while /classroom/courses/{id}/files
      // currently validates drive_id as required string, resulting in HTTP 500.
      if (error instanceof ApiRequestError && error.status === 500) {
        return readCourseFilesCache(courseId);
      }

      throw error;
    }
  },
};

// ==========================================
// 3. File Uploads (/files)
// ==========================================
export const filesApi = {
  // Upload a file manually
  upload: async (file: File, courseId: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("course_id", courseId);

    const response = await apiFetch<{ status: string; file_id: string; file_name: string; processing_status: string }>("/files/upload", {
      method: "POST",
      body: formData,
    });

    upsertCourseFileCache(courseId, {
      id: response.file_id,
      filename: response.file_name || file.name,
      file_type: file.type || "uploaded",
      course_id: courseId,
      indexed: false,
      indexing_status: normalizeIndexingStatus(response.processing_status),
    });

    return response;
  },

  // Get supported file formats
  getSupportedFormats: async () => {
    return apiFetch<{ pdf?: string[]; image?: string[]; document?: string[] }>("/files/supported-formats");
  },
};

// ==========================================
// 4. Background Indexing (/indexing)
// ==========================================
export const indexingApi = {
  // Index a specific file
  indexFile: async (fileId: string) => {
    return apiFetch<{ message: string; file_id: string; status: string }>(`/indexing/file/${fileId}`, {
      method: "POST",
    }, true);
  },

  // Index all files in a course
  indexCourse: async (courseId: string) => {
    return apiFetch<{ message: string; course_id: string; files_queued: number; file_ids: string[] }>(`/indexing/course/${courseId}`, {
      method: "POST",
    }, true);
  },

  // Check indexing status of a file
  getFileStatus: async (fileId: string) => {
    const response = await apiFetch<{
      file_id: string;
      file_name: string;
      processing_status: "pending" | "processing" | "completed" | "failed";
      chunk_count?: number;
      processing_error?: string;
    }>(`/indexing/status/${fileId}`);

    return {
      status: response.processing_status,
      progress: response.chunk_count,
      file_name: response.file_name,
      processing_error: response.processing_error,
    };
  },

  // Delete file from AI memory
  deleteFile: async (fileId: string) => {
    return apiFetch<{ message: string }>(`/indexing/file/${fileId}`, {
      method: "DELETE",
    });
  },

  // Delete course from AI memory
  deleteCourse: async (courseId: string) => {
    return apiFetch<{ message: string }>(`/indexing/course/${courseId}`, {
      method: "DELETE",
    });
  },
};

// ==========================================
// 5. AI Chat / RAG Tutor (/chat)
// CRITICAL: These require X-Groq-Api-Key header
// ==========================================
export const chatApi = {
  // Send a question and get a response
  query: async (question: string, sessionId?: string, courseId?: string) => {
    const payload: Record<string, string> = { question };
    if (sessionId) {
      payload.session_id = sessionId;
    }
    if (courseId) {
      payload.course_id = courseId;
    }

    return apiFetch<ChatQueryResponse>(
      "/chat/query",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true // Include Groq API key
    );
  },

  // Send a question and stream response via SSE
  queryStream: async (
    question: string,
    sessionId?: string,
    courseId?: string,
    callbacks?: ChatStreamCallbacks
  ): Promise<ChatQueryResponse> => {
    const payload: Record<string, string> = { question };
    if (sessionId) {
      payload.session_id = sessionId;
    }
    if (courseId) {
      payload.course_id = courseId;
    }

    const parseError = async (response: Response) => {
      let detail = `Request failed with status ${response.status}`;
      try {
        const errorText = await response.text();
        if (errorText) {
          try {
            const errorJson = JSON.parse(errorText);
            detail = errorJson.detail || errorJson.message || errorText;
          } catch {
            detail = errorText;
          }
        }
      } catch {
        // Keep default detail.
      }
      throw new ApiRequestError(detail, response.status, "/chat/query/stream");
    };

    const readStream = async (retryOnAuthFailure = true): Promise<ChatQueryResponse> => {
      let token = getToken();

      if (!token && retryOnAuthFailure) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          token = getToken();
        }
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const groqKey = getGroqKey();
      if (groqKey) {
        headers["X-Groq-Api-Key"] = groqKey;
      }

      const response = await fetch(`${API_BASE_URL}/chat/query/stream`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        credentials: "include",
        signal: callbacks?.signal,
      });

      if (response.status === 401 && retryOnAuthFailure) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return readStream(false);
        }
        removeToken();
      }

      if (!response.ok) {
        await parseError(response);
      }

      if (!response.body) {
        throw new ApiRequestError("Streaming response has no body", 500, "/chat/query/stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let doneSignal = false;
      let fullAnswer = "";
      let citations: Array<string | ChatCitation> = [];

      const normalizeAnswerContent = (content: unknown): string => {
        if (typeof content === "string") {
          return content;
        }

        if (Array.isArray(content)) {
          return content
            .map((part) => {
              if (typeof part === "string") {
                return part;
              }

              if (part && typeof part === "object") {
                const block = part as { text?: unknown; content?: unknown };
                if (typeof block.text === "string") {
                  return block.text;
                }
                if (typeof block.content === "string") {
                  return block.content;
                }
              }

              return "";
            })
            .join("");
        }

        if (content && typeof content === "object") {
          const block = content as { text?: unknown; content?: unknown };
          if (typeof block.text === "string") {
            return block.text;
          }
          if (typeof block.content === "string") {
            return block.content;
          }
        }

        if (content == null) {
          return "";
        }

        return String(content);
      };

      const applyAnswerUpdate = (nextContent: string) => {
        if (!nextContent) {
          return;
        }

        if (nextContent === fullAnswer) {
          return;
        }

        if (nextContent.startsWith(fullAnswer)) {
          const delta = nextContent.slice(fullAnswer.length);
          fullAnswer = nextContent;
          if (delta) {
            callbacks?.onAnswer?.(delta, fullAnswer);
          }
          return;
        }

        fullAnswer += nextContent;
        callbacks?.onAnswer?.(nextContent, fullAnswer);
      };

      while (!doneSignal) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        while (true) {
          const boundary = buffer.indexOf("\n\n");
          if (boundary === -1) {
            break;
          }

          const rawEvent = buffer.slice(0, boundary).trim();
          buffer = buffer.slice(boundary + 2);

          if (!rawEvent) {
            continue;
          }

          const dataLines = rawEvent
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.startsWith("data:"));

          if (!dataLines.length) {
            continue;
          }

          const dataPayload = dataLines
            .map((line) => line.slice(5).trim())
            .join("\n");

          if (dataPayload === "[DONE]") {
            doneSignal = true;
            break;
          }

          try {
            const event = JSON.parse(dataPayload) as ChatStreamEvent;
            callbacks?.onEvent?.(event);

            if (event.type === "answer") {
              applyAnswerUpdate(normalizeAnswerContent(event.content));
            } else if (event.type === "citations" && Array.isArray(event.citations)) {
              citations = event.citations;
            }
          } catch {
            // Ignore malformed SSE chunks and continue.
          }
        }
      }

      if (!fullAnswer.trim()) {
        throw new ApiRequestError("Empty stream response", 502, "/chat/query/stream");
      }

      const finalAnswer = fullAnswer;

      return {
        answer: finalAnswer,
        citations,
        session_id: response.headers.get("X-Session-Id") || sessionId,
        sources_used: citations.length,
      };
    };

    return readStream(true);
  },

  // Get all chat sessions
  getSessions: async () => {
    const response = await apiFetch<BackendChatSessionsResponse | string[] | ChatSession[]>(
      "/chat/sessions",
      {},
      true
    );

    const rawSessions = Array.isArray(response)
      ? response
      : Array.isArray(response?.sessions)
      ? response.sessions
      : [];

    return rawSessions
      .map((session): ChatSession => {
        if (typeof session === "string") {
          return { id: session };
        }

        const sessionLike = session as Partial<ChatSession> & {
          session_id?: string;
          thread_id?: string;
        };

        return {
          id: String(sessionLike.id || sessionLike.session_id || sessionLike.thread_id || ""),
          course_id: sessionLike.course_id,
          created_at: sessionLike.created_at,
          updated_at: sessionLike.updated_at,
        };
      })
      .filter((session) => !!session.id);
  },

  // Get chat history for a session
  getHistory: async (sessionId: string) => {
    const response = await apiFetch<BackendChatHistoryResponse | ChatMessage[]>(
      `/chat/history/${sessionId}`,
      {},
      true
    );

    const rawMessages = Array.isArray(response)
      ? response
      : Array.isArray(response?.messages)
      ? response.messages
      : [];

    return rawMessages
      .map((message): ChatMessage => {
        if (typeof message === "string") {
          return { role: "assistant", content: message };
        }

        const role = mapChatRole(String((message as { role?: string }).role || "assistant"));
        const content = String((message as { content?: unknown }).content ?? "");

        return {
          role,
          content,
        };
      })
      .filter((message) => message.content.trim().length > 0);
  },

  // Delete a chat session
  deleteSession: async (sessionId: string) => {
    return apiFetch<{ message: string }>(`/chat/session/${sessionId}`, {
      method: "DELETE",
    }, true);
  },
};

// ==========================================
// Health Check
// ==========================================
export const healthApi = {
  check: async () => {
    return apiFetch<{ status: string }>("/health");
  },
};
