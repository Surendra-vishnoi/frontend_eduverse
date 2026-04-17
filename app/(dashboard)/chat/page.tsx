"use client";

import { useEffect, useState, useRef, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  classroomApi,
  chatApi,
  Classroom,
  ChatMessage,
  ChatSession,
  getGroqKey,
  setGroqKey,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Send,
  Bot,
  User,
  MessageSquare,
  Sparkles,
  BookOpen,
  Plus,
  Trash2,
  History,
  Key,
} from "lucide-react";

function ChatContent() {
  const STREAM_CHARS_PER_TICK = 5;
  const STREAM_TICK_MS = 45;

  const searchParams = useSearchParams();
  const initialCourse = searchParams.get("course");

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>(initialCourse || "");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamBufferRef = useRef("");
  const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamDrainResolverRef = useRef<(() => void) | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const appendAssistantDelta = useCallback((delta: string) => {
    if (!delta) {
      return;
    }

    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];

      if (!last || last.role !== "assistant") {
        next.push({ role: "assistant", content: delta });
        return next;
      }

      next[next.length - 1] = {
        ...last,
        content: `${last.content || ""}${delta}`,
      };
      return next;
    });
  }, []);

  const resolveStreamDrainIfIdle = useCallback(() => {
    if (!streamBufferRef.current && !streamTimerRef.current && streamDrainResolverRef.current) {
      const resolve = streamDrainResolverRef.current;
      streamDrainResolverRef.current = null;
      resolve();
    }
  }, []);

  const startStreamRenderer = useCallback(() => {
    if (streamTimerRef.current) {
      return;
    }

    streamTimerRef.current = setInterval(() => {
      if (!streamBufferRef.current) {
        if (streamTimerRef.current) {
          clearInterval(streamTimerRef.current);
          streamTimerRef.current = null;
        }
        resolveStreamDrainIfIdle();
        return;
      }

      const delta = streamBufferRef.current.slice(0, STREAM_CHARS_PER_TICK);
      streamBufferRef.current = streamBufferRef.current.slice(STREAM_CHARS_PER_TICK);
      appendAssistantDelta(delta);

      if (!streamBufferRef.current && streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
        resolveStreamDrainIfIdle();
      }
    }, STREAM_TICK_MS);
  }, [appendAssistantDelta, resolveStreamDrainIfIdle]);

  const enqueueStreamDelta = useCallback(
    (delta: string) => {
      if (!delta) {
        return;
      }

      streamBufferRef.current += delta;
      startStreamRenderer();
    },
    [startStreamRenderer]
  );

  const stopStreamRenderer = useCallback(
    (flushRemaining: boolean) => {
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }

      if (flushRemaining && streamBufferRef.current) {
        const pending = streamBufferRef.current;
        streamBufferRef.current = "";
        appendAssistantDelta(pending);
      } else if (!flushRemaining) {
        streamBufferRef.current = "";
      }

      resolveStreamDrainIfIdle();
    },
    [appendAssistantDelta, resolveStreamDrainIfIdle]
  );

  const waitForStreamDrain = useCallback(async () => {
    if (!streamBufferRef.current && !streamTimerRef.current) {
      return;
    }

    await new Promise<void>((resolve) => {
      streamDrainResolverRef.current = resolve;
    });
  }, []);

  useEffect(() => {
    return () => {
      stopStreamRenderer(false);
    };
  }, [stopStreamRenderer]);

  // Check if Groq API key is set
  useEffect(() => {
    const key = getGroqKey();
    if (!key) {
      setShowApiKeyDialog(true);
    }
  }, []);

  // Fetch classrooms
  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const data = await classroomApi.getCourses();
        const classroomsArray = Array.isArray(data) ? data : [];
        setClassrooms(classroomsArray);
        if (initialCourse && classroomsArray.some((c) => c.id === initialCourse)) {
          setSelectedCourse(initialCourse);
        }
      } catch (error) {
        console.error("Failed to fetch classrooms:", error);
        toast.error("Failed to load classrooms");
        setClassrooms([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClassrooms();
  }, [initialCourse]);

  // Fetch sessions when we have a Groq key
  const fetchSessions = useCallback(async () => {
    const key = getGroqKey();
    if (!key) return;

    try {
      const sessionsData = await chatApi.getSessions();
      // Ensure sessions is always an array
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Load session history when selecting a session
  const loadSessionHistory = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    try {
      const history = await chatApi.getHistory(sessionId);
      setMessages(history);
    } catch (error) {
      console.error("Failed to load session history:", error);
      toast.error("Failed to load chat history");
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId("");
    setMessages([]);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this chat session?")) return;

    try {
      await chatApi.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
      toast.success("Chat session deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete session");
    }
  };

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast.error("Please enter a valid API key");
      return;
    }
    setGroqKey(apiKey.trim());
    setShowApiKeyDialog(false);
    toast.success("Groq API key saved");
    fetchSessions();
  };

  const handleSend = async () => {
    const question = input.trim();
    if (!question || !selectedCourse) return;

    const key = getGroqKey();
    if (!key) {
      setShowApiKeyDialog(true);
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: question };
  stopStreamRenderer(false);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      // Add an assistant placeholder that gets filled progressively as stream events arrive.
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const response = await chatApi.queryStream(
        question,
        currentSessionId || undefined,
        selectedCourse || undefined,
        {
          onAnswer: (delta) => {
            enqueueStreamDelta(delta);
          },
        }
      );

      if (response && typeof response === "object" && response.session_id) {
        setCurrentSessionId(response.session_id);
      }

      let messageContent = "No response received";
      let citations: ChatMessage["citations"] = [];

      if (typeof response === "string") {
        messageContent = response;
      } else if (response && typeof response === "object") {
        messageContent = response.answer || response.response || response.message || response.content || JSON.stringify(response);
        citations = Array.isArray(response.citations) ? response.citations : [];
      }

      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];

        if (last?.role === "assistant") {
          next[next.length - 1] = {
            ...last,
            content: last.content || messageContent,
            citations,
          };
          return next;
        }

        next.push({
          role: "assistant",
          content: messageContent,
          citations,
        });
        return next;
      });

      await waitForStreamDrain();

      // Refresh sessions list
      fetchSessions();
    } catch (streamError) {
      console.warn("[chat] Stream failed, falling back to one-shot response", streamError);
      stopStreamRenderer(false);

      // Remove in-progress assistant bubble (if any) before fallback.
      setMessages((prev) => {
        const next = [...prev];
        if (next[next.length - 1]?.role === "assistant") {
          next.pop();
        }
        return next;
      });

      try {
        const response = await chatApi.query(
          question,
          currentSessionId || undefined,
          selectedCourse || undefined
        );

        if (response && typeof response === "object" && response.session_id) {
          setCurrentSessionId(response.session_id);
        }

        let messageContent = "No response received";
        let citations: ChatMessage["citations"] = [];

        if (typeof response === "string") {
          messageContent = response;
        } else if (response && typeof response === "object") {
          messageContent =
            response.answer ||
            response.response ||
            response.message ||
            response.content ||
            JSON.stringify(response);
          citations = Array.isArray(response.citations) ? response.citations : [];
        }

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: messageContent,
          citations,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        fetchSessions();
      } catch (error) {
        console.error("[v0] Chat error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast.error(errorMessage);

        // Remove the user message if both streaming and fallback failed.
        setMessages((prev) => prev.slice(0, -1));
        setInput(question);

        // If it's an API key error, show the dialog.
        if (
          errorMessage.toLowerCase().includes("api key") ||
          errorMessage.toLowerCase().includes("groq")
        ) {
          setShowApiKeyDialog(true);
        }
      }
    } finally {
      stopStreamRenderer(true);
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedClassroomData = classrooms.find((c) => c.id === selectedCourse);
  const isAssistantStreaming = isSending && messages[messages.length - 1]?.role === "assistant";

  const getSessionLabel = (session: ChatSession) => {
    if (session.created_at) {
      const createdAt = new Date(session.created_at);
      if (!Number.isNaN(createdAt.getTime())) {
        return createdAt.toLocaleDateString();
      }
    }

    return `Session ${session.id.slice(-8)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* API Key Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Groq API Key Required
            </DialogTitle>
            <DialogDescription>
              To use the AI chat feature, you need to provide your Groq API key. You can get one
              for free at{" "}
              <a
                href="https://console.groq.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                console.groq.com
              </a>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="password"
              placeholder="gsk_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveApiKey}>Save API Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex h-screen">
        {/* Sessions Sidebar */}
        <div className="w-64 border-r border-border bg-card hidden md:flex flex-col">
          <div className="p-4 border-b border-border">
            <Button className="w-full gap-2" onClick={handleNewChat}>
              <Plus className="w-4 h-4" />
              New Chat
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-2">
            <div className="flex items-center gap-2 px-2 py-1 mb-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Chat History
              </span>
            </div>
            {sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No chat history yet</p>
            ) : (
              <div className="space-y-1">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                      currentSessionId === session.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-secondary text-foreground"
                    }`}
                    onClick={() => loadSessionHistory(session.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{getSessionLabel(session)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2 justify-start"
              onClick={() => setShowApiKeyDialog(true)}
            >
              <Key className="w-4 h-4" />
              Update API Key
            </Button>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-border bg-card p-4">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">AI Tutor Chat</h1>
                  <p className="text-sm text-muted-foreground">
                    Ask questions about your study materials
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden"
                  onClick={handleNewChat}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {classrooms.map((classroom) => (
                      <SelectItem key={classroom.id} value={classroom.id}>
                        {classroom.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-auto p-4">
            <div className="max-w-4xl mx-auto">
              {!selectedCourse ? (
                <Card className="border-border bg-card">
                  <CardContent className="py-20">
                    <Empty
                      icon={<BookOpen className="w-16 h-16" />}
                      title="Select a course"
                      description="Choose a course to start chatting with your AI tutor about the indexed materials"
                    />
                  </CardContent>
                </Card>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                    <Sparkles className="w-10 h-10 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Start a conversation
                  </h2>
                  <p className="text-muted-foreground text-center max-w-md mb-6">
                    Ask me anything about the materials in{" "}
                    <span className="font-medium text-foreground">
                      {selectedClassroomData?.name}
                    </span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                    {[
                      "Summarize the key concepts",
                      "Explain the main topics",
                      "What are the important points?",
                      "Help me understand this better",
                    ].map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        className="justify-start text-left h-auto py-3 px-4"
                        onClick={() => setInput(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        {message.citations && message.citations.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <p className="text-xs text-muted-foreground mb-1">Sources:</p>
                            <ul className="text-xs text-muted-foreground list-disc list-inside">
                              {message.citations.map((citation, i) => (
                                <li key={i}>
                                  {typeof citation === "string" ? (
                                    citation
                                  ) : (
                                    <>
                                      <span>
                                        [{citation.number ?? i + 1}] {citation.file_name || citation.source_id || "Source"}
                                        {citation.page_number != null ? ` (page ${citation.page_number})` : ""}
                                      </span>
                                      {citation.text_snippet ? (
                                        <p className="mt-1 italic text-muted-foreground/90">
                                          "{citation.text_snippet}"
                                        </p>
                                      ) : null}
                                    </>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      {message.role === "user" && (
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-secondary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isSending && !isAssistantStreaming && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <div className="bg-secondary rounded-2xl px-4 py-3">
                        <Spinner className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Input Area */}
          {selectedCourse && (
            <div className="border-t border-border bg-card p-4">
              <div className="max-w-4xl mx-auto flex gap-3">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your question..."
                  className="min-h-[60px] max-h-[200px] resize-none"
                  disabled={isSending}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isSending}
                  className="h-auto px-4"
                >
                  {isSending ? <Spinner className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Spinner className="w-8 h-8 text-primary" />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
