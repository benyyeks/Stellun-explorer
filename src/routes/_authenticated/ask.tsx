// Stellun AI: a space-only study assistant. Four modes (chat, practice
// quizzes, explanations, resource guidance) all post to /api/ask, which
// grounds answers in live STELLUN telemetry and enforces the space-only
// scope. Replies stream token by token.
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AnswerText } from "@/components/site/answer-text";
import { createFileRoute } from "@tanstack/react-router";
import { BOOK_TOPICS } from "@/lib/books";
import { useAskHistory } from "@/lib/ask-history";
import { consumeAskPrefill } from "@/lib/study-workspace";

export const Route = createFileRoute("/_authenticated/ask")({
  head: () => ({
    meta: [
      { title: "Stellun AI - STELLUN" },
      {
        name: "description",
        content:
          "A space-only study assistant. Ask questions, generate practice quizzes from aerospace topics, get explanations at your level, and find the right resources.",
      },
      { property: "og:title", content: "Stellun AI - STELLUN" },
      {
        property: "og:description",
        content:
          "A space-only study assistant: answers, practice quizzes, explanations, and resource guidance, grounded in live STELLUN data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AskPage,
});

type Mode = "chat" | "quiz" | "explain" | "resources";
type Msg = { role: "user" | "assistant"; content: string };

const MODE_LABELS: Record<Mode, string> = {
  chat: "Chat",
  quiz: "Practice quiz",
  explain: "Explain a concept",
  resources: "Find resources",
};

const SUGGESTIONS: Record<Mode, string[]> = {
  chat: [
    "Where is the ISS right now?",
    "What is the Kp index and why does it matter?",
    "Why do sun-synchronous orbits always face the Sun the same way?",
  ],
  quiz: [],
  explain: [
    "Explain specific impulse",
    "What is a gravity turn during launch?",
    "Why do low Earth orbits slowly decay?",
  ],
  resources: [
    "I want to start learning orbital mechanics",
    "Best study path for rocket propulsion",
    "How do I learn to read satellite TLE data?",
  ],
};

const LEVELS = [
  { id: "curious beginner", label: "Curious beginner" },
  { id: "high school student", label: "High school student" },
  { id: "engineering student", label: "Engineering student" },
] as const;

const DIFFICULTIES = [
  { id: "introductory", label: "Introductory" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
] as const;

const NEAR_BOTTOM_PX = 96;

function errorCopy(status: number, code: string | undefined): string {
  if (status === 402 || status === 429 || code === "free_model_unavailable" || code === "rate_limited") {
    return "Stellun AI is offline until a free model is available.";
  }
  if (status === 401 || code === "unauthorized") {
    return "Your session has expired. Sign in again to continue the conversation.";
  }
  if (status === 503 || code === "assistant_unavailable") {
    return "The assistant is temporarily unavailable. Please try again later.";
  }
  if (status === 502) {
    return "The model did not respond in time. Retry the same question.";
  }
  return "The answer link failed. Check your connection and retry.";
}

function AskPage() {
  const [mode, setMode] = useState<Mode>("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizTopic, setQuizTopic] = useState(BOOK_TOPICS[0]?.id ?? "");
  const [quizDifficulty, setQuizDifficulty] = useState<string>("introductory");
  const [level, setLevel] = useState<string>("curious beginner");
  const abortRef = useRef<AbortController | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const stickRef = useRef(true);

  const history = useAskHistory();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const activeIdRef = useRef<string | null>(null);

  useEffect(() => {
    const prefill = consumeAskPrefill();
    if (!prefill) return;
    if (prefill.mode) setMode(prefill.mode);
    setInput(prefill.text);
  }, []);
  activeIdRef.current = activeId;

  // Auto-scroll only when the reader is already near the bottom.
  useEffect(() => {
    const el = threadRef.current;
    if (!el || !stickRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streaming, error]);

  const onThreadScroll = () => {
    const el = threadRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  };

  useEffect(() => () => abortRef.current?.abort(), []);

  const openConversation = async (id: string) => {
    if (streaming) return;
    const saved = history.conversations.find((c) => c.id === id);
    setActiveId(id);
    setError(null);
    if (saved) setMode(saved.mode);
    const thread = await history.loadMessages(id);
    setMessages(thread);
    stickRef.current = true;
  };

  const startNewChat = () => {
    if (streaming) return;
    setActiveId(null);
    setMessages([]);
    setError(null);
    setInput("");
  };

  const removeConversation = async (id: string) => {
    await history.deleteConversation(id);
    if (activeIdRef.current === id) {
      setActiveId(null);
      setMessages([]);
    }
  };

  const clearAllChats = async () => {
    await history.clearAll();
    setConfirmClear(false);
    setActiveId(null);
    setMessages([]);
  };

  const send = async (rawText: string) => {
    const content = rawText.trim();
    if (!content || streaming) return;
    stickRef.current = true;
    const thread = [...messages, { role: "user" as const, content }];
    setMessages([...thread, { role: "assistant", content: "" }]);
    setInput("");
    setError(null);
    setStreaming(true);

    let conversationId = activeId;
    if (history.signedIn) {
      if (!conversationId) {
        conversationId = await history.createConversation(content, mode);
        if (conversationId) setActiveId(conversationId);
      }
      if (conversationId) {
        await history.appendMessage(conversationId, { role: "user", content });
      }
    }

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ mode, messages: thread.slice(-20), conversationId }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorCopy(res.status, data?.error));
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const snapshot = acc;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: snapshot };
          return next;
        });
      }
      if (!acc.trim()) {
        setMessages((prev) => prev.slice(0, -1));
        setError("No answer came back. Retry the same question.");
      } else if (conversationId) {
        void history.refresh();
      }
    } catch (err) {
      let partial = "";
      setMessages((prev) => {
        const last = prev.at(-1);
        if (last?.role === "assistant") partial = last.content;
        return last?.role === "assistant" && !last.content ? prev.slice(0, -1) : prev;
      });
      if ((err as Error).name === "AbortError") {
        if (conversationId && partial.trim()) void history.refresh();
      } else {
        setError((err as Error).message || errorCopy(0, undefined));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const retryLast = () => {
    if (!lastUser || streaming) return;
    setMessages((prev) => {
      const last = prev.at(-1);
      if (last?.role === "assistant") return prev.slice(0, -1);
      return prev;
    });
    void send(lastUser);
  };

  const editLast = () => {
    if (!lastUser || streaming) return;
    setInput(lastUser);
    setMessages((prev) => {
      const cut = [...prev];
      while (cut.length && cut[cut.length - 1]?.role === "assistant") cut.pop();
      if (cut.length && cut[cut.length - 1]?.role === "user") cut.pop();
      return cut;
    });
    setError(null);
  };

  const startQuiz = () => {
    const topic = BOOK_TOPICS.find((t) => t.id === quizTopic);
    if (!topic) return;
    void send(
      `Generate a 5-question ${quizDifficulty} practice quiz on ${topic.label}. ` +
        "Include a mix of conceptual and calculation questions. Do not show the answers yet."
    );
  };

  const explainPrompt = (concept: string) =>
    mode === "explain" ? `Explain this for a ${level}: ${concept}` : concept;

  const lastMessage = messages.at(-1);
  const quizReady =
    mode === "quiz" &&
    !streaming &&
    messages.some((m) => m.role === "assistant" && m.content.includes("1"));

  return (
    <main className="container page-scaffold">
      <section className="page-hero">
        <h1>Stellun AI</h1>
        <p className="tagline">
          A study assistant for space and astronomy, grounded in live STELLUN
          data. It answers space questions only, and labels estimates rather
          than inventing figures.
        </p>
      </section>

      <div className="ask-layout">
        <aside className="glass glass-card ask-history" aria-label="Saved chats">
          <div className="ask-history-head">
            <h2>Saved chats</h2>
            <button type="button" className="btn btn-ghost" onClick={startNewChat}>
              New chat
            </button>
          </div>
          {!history.signedIn ? (
            <p className="ask-hint">
              Sign in to save your questions and answers and pick them up on any
              device. Without an account this conversation stays in this session
              only.
            </p>
          ) : history.conversations.length === 0 ? (
            <p className="ask-hint">
              Your saved conversations appear here once you ask a question.
            </p>
          ) : (
            <>
              <ul className="ask-history-list">
                {history.conversations.map((c) => (
                  <li key={c.id} className={c.id === activeId ? "active" : ""}>
                    {renamingId === c.id ? (
                      <form
                        className="ask-rename-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const title = renameValue.trim();
                          if (title) void history.renameConversation(c.id, title);
                          setRenamingId(null);
                        }}
                      >
                        <input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          aria-label="Chat title"
                          autoFocus
                        />
                        <button type="submit" className="btn btn-ghost btn-sm">
                          Save
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setRenamingId(null)}
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="ask-history-item"
                          onClick={() => void openConversation(c.id)}
                        >
                          <span className="ask-history-title">{c.title}</span>
                          <span className="ask-history-meta">{MODE_LABELS[c.mode as Mode] ?? c.mode}</span>
                        </button>
                        <span className="ask-history-actions">
                          <button
                            type="button"
                            className="ask-icon-btn"
                            aria-label={`Rename chat: ${c.title}`}
                            onClick={() => {
                              setRenamingId(c.id);
                              setRenameValue(c.title);
                            }}
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            className="ask-icon-btn"
                            aria-label={`Delete chat: ${c.title}`}
                            onClick={() => void removeConversation(c.id)}
                          >
                            Delete
                          </button>
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              {confirmClear ? (
                <div className="ask-confirm">
                  <p>Delete every saved chat? This cannot be undone.</p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void clearAllChats()}
                  >
                    Delete all
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setConfirmClear(false)}
                  >
                    Keep them
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost ask-clear-all"
                  onClick={() => setConfirmClear(true)}
                >
                  Delete all chats
                </button>
              )}
            </>
          )}
        </aside>

        <div className="ask-main">
          <div className="ask-modes" role="tablist" aria-label="Assistant mode">
            {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                className={mode === m ? "active" : ""}
                onClick={() => {
                  setMode(m);
                  if (activeId) void history.setConversationMode(activeId, m);
                }}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          {mode === "quiz" && (
            <div className="ask-controls glass">
              <label>
                Topic
                <select value={quizTopic} onChange={(e) => setQuizTopic(e.target.value)}>
                  {BOOK_TOPICS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Difficulty
                <select value={quizDifficulty} onChange={(e) => setQuizDifficulty(e.target.value)}>
                  {DIFFICULTIES.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn btn-primary" onClick={startQuiz} disabled={streaming}>
                Generate quiz
              </button>
            </div>
          )}

          {mode === "explain" && (
            <div className="ask-controls glass">
              <label>
                Level
                <select value={level} onChange={(e) => setLevel(e.target.value)}>
                  {LEVELS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <section
            className="chat-thread glass"
            ref={threadRef}
            onScroll={onThreadScroll}
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <div className="chat-empty">
                <p>
                  {mode === "quiz"
                    ? "Pick a topic and difficulty, then generate a practice set."
                    : mode === "explain"
                      ? "Name a concept and STELLUN will explain it at your level."
                      : mode === "resources"
                        ? "Describe what you want to learn and STELLUN will map out a study path."
                        : "Ask anything about space, missions, satellites, or space weather."}
                </p>
                {SUGGESTIONS[mode].length > 0 && (
                  <div className="chat-suggestions">
                    {SUGGESTIONS[mode].map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="chat-chip"
                        onClick={() => void send(explainPrompt(s))}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              messages.map((m, i) => {
                const isLast = i === messages.length - 1;
                const isLastUser =
                  m.role === "user" && !messages.slice(i + 1).some((x) => x.role === "user");
                return (
                  <div key={i} className={m.role === "user" ? "msg msg-user" : "msg msg-ai"}>
                    {m.role === "assistant" && <span className="msg-who">STELLUN</span>}
                    {m.role === "assistant" ? (
                      m.content ? (
                        <AnswerText text={m.content} />
                      ) : (
                        <span className="live-dot" aria-label="Thinking" />
                      )
                    ) : (
                      <p>{m.content}</p>
                    )}
                    {streaming && isLast && m.role === "assistant" && (
                      <span className="msg-cursor" aria-hidden="true" />
                    )}
                    {!streaming && isLastUser && (
                      <div className="ask-msg-actions">
                        <button type="button" className="ask-msg-action" onClick={editLast}>
                          Edit
                        </button>
                        <button type="button" className="ask-msg-action" onClick={retryLast}>
                          Retry
                        </button>
                      </div>
                    )}
                    {!streaming && isLast && m.role === "assistant" && m.content && (
                      <div className="ask-msg-actions">
                        <button type="button" className="ask-msg-action" onClick={retryLast}>
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            {quizReady && lastMessage?.role === "assistant" && (
              <div className="chat-suggestions">
                <button
                  type="button"
                  className="chat-chip"
                  onClick={() => void send("Show the answers, each with a brief explanation.")}
                >
                  Show answers with explanations
                </button>
                <button type="button" className="chat-chip" onClick={startQuiz}>
                  New set of questions
                </button>
              </div>
            )}
          </section>

          {error && (
            <div className="ask-error-bar" role="alert">
              <p>{error}</p>
              {lastUser && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={retryLast}>
                  Retry
                </button>
              )}
            </div>
          )}

          <form
            className="chat-composer"
            onSubmit={(e) => {
              e.preventDefault();
              void send(mode === "explain" ? explainPrompt(input) : input);
            }}
          >
            <label htmlFor="ask-input" className="sr-only">
              Your question
            </label>
            <input
              id="ask-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                mode === "quiz"
                  ? "Ask a follow-up, or request the answers..."
                  : "Ask a space question..."
              }
              maxLength={2000}
              disabled={streaming}
              autoComplete="off"
            />
            {streaming ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => abortRef.current?.abort()}
              >
                Stop
              </button>
            ) : (
              <button type="submit" className="btn btn-primary" disabled={!input.trim()}>
                Send
              </button>
            )}
            {messages.length > 0 && !streaming && (
              <button type="button" className="btn btn-ghost" onClick={startNewChat}>
                Clear
              </button>
            )}
          </form>
          <p className="ask-scope-note">
            STELLUN answers questions about space and space studies only.
            {history.signedIn
              ? " Saved chats stay on your account and can be deleted at any time."
              : ""}
          </p>
        </div>
      </div>
    </main>
  );
}
