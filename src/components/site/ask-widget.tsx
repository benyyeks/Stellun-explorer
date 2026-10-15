// Floating Orbitex AI widget, bottom right on every page except the Ask page.
// One continuing conversation follows the user across pages (id in localStorage).
// Opening the Ask page archives the widget thread into saved chats.
import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAskHistory, type AskMsg } from "@/lib/ask-history";
import { AnswerText } from "@/components/site/answer-text";

const KEY = "orbitex-widget-conversation";
const NEAR_BOTTOM_PX = 72;

function errorCopy(status: number, code?: string): string {
  if (status === 402 || code === "free_model_unavailable") return "Orbitex AI is offline until a free model is available.";
  if (status === 429 || code === "rate_limited") return "Too many questions in a short time. Wait a moment, then retry.";
  if (status === 401 || code === "unauthorized") return "Your session expired. Sign in again to continue.";
  if (status === 400 || code === "bad_request") return "That question could not be sent. Start a new chat and try again.";
  if (status === 503 || code === "assistant_unavailable") return "Orbitex AI is temporarily unavailable. Please try again later.";
  if (status === 502) return "The model did not respond in time. Retry the same question.";
  return "The answer link failed. Check your connection and retry.";
}

export function AskWidget() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const history = useAskHistory();
  const [open, setOpen] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AskMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stickRef = useRef(true);
  const onAsk = path.startsWith("/ask");

  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem(KEY);
    if (saved) {
      setConvId(saved);
      void history.loadMessages(saved).then((m) => {
        if (m.length) setMessages(m);
        else localStorage.removeItem(KEY);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!onAsk) return;
    abortRef.current?.abort();
    localStorage.removeItem(KEY);
    setConvId(null);
    setMessages([]);
    setOpen(false);
  }, [onAsk]);

  // Auto-scroll only when the user is already near the bottom.
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

  const ensureConversation = async (): Promise<string | null> => {
    if (convId) return convId;
    const id = await history.createConversation("Widget chat", "chat");
    if (id) {
      setConvId(id);
      localStorage.setItem(KEY, id);
    }
    return id;
  };

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || streaming || !user) return;

    stickRef.current = true;
    setInput("");
    setError(null);

    const userMsg: AskMsg = { role: "user", content: text };
    // Drop empty or failed turns so one bad answer never breaks the next question.
    const clean = messages.filter((m) => m.content.trim().length > 0);
    const thread = [...clean, userMsg];
    setMessages([...thread, { role: "assistant", content: "" }]);
    setStreaming(true);

    const id = await ensureConversation().catch(() => null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Use a fresh session token; the widget can stay open long after sign-in.
      let { data } = await supabase.auth.getSession();
      const exp = data.session?.expires_at ?? 0;
      if (data.session && exp * 1000 - Date.now() < 60_000) {
        const refreshed = await supabase.auth.refreshSession();
        if (refreshed.data.session) data = { session: refreshed.data.session };
      }
      const token = data.session?.access_token;
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mode: "chat",
          messages: thread.slice(-20),
          ...(id ? { conversationId: id } : {}),
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message || errorCopy(res.status, body?.error));
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const snap = acc;
        setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: snap }]);
      }
      if (!acc.trim()) {
        setMessages((prev) => prev.slice(0, -1));
        setError("No answer came back. Retry the same question.");
      }
    } catch (err) {
      setMessages((prev) => {
        const last = prev.at(-1);
        return last?.role === "assistant" && !last.content ? prev.slice(0, -1) : prev;
      });
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message || errorCopy(0));
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

  const newChat = () => {
    if (streaming) return;
    localStorage.removeItem(KEY);
    setConvId(null);
    setMessages([]);
    setError(null);
    setInput("");
  };

  if (onAsk) return null;

  return (
    <div className="ask-widget">
      {open && (
        <div className="ask-widget-panel glass" role="dialog" aria-label="Orbitex AI">
          <div className="ask-widget-head">
            <div>
              <strong>Orbitex AI</strong>
              <span>{streaming ? "Writing…" : "Live feeds and agency sources"}</span>
            </div>
            <div className="ask-widget-actions">
              {user && messages.length > 0 && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={newChat} disabled={streaming}>
                  New
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setOpen(false)}
                aria-label="Close Orbitex AI"
              >
                Close
              </button>
            </div>
          </div>

          {!user ? (
            <div className="ask-widget-empty">
              <p>Sign in to ask about missions, orbits, and space weather.</p>
              <Link to="/auth" className="btn btn-primary btn-sm">
                Sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="ask-widget-thread" ref={threadRef} onScroll={onThreadScroll}>
                {messages.length === 0 && (
                  <p className="ask-widget-hint">
                    Ask a space question. This chat follows you across pages and saves to your
                    account.
                  </p>
                )}
                {messages.map((m, i) => {
                  const isLast = i === messages.length - 1;
                  const isLastUser =
                    m.role === "user" && !messages.slice(i + 1).some((x) => x.role === "user");
                  return (
                    <div key={i} className={`ask-widget-msg ask-widget-${m.role}`}>
                      {m.role === "assistant" ? (
                        m.content ? (
                          <AnswerText text={m.content} />
                        ) : (
                          <span className="live-dot" aria-label="Thinking" />
                        )
                      ) : (
                        <span className="ask-widget-user-text">{m.content}</span>
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
                })}
                {error && (
                  <div className="ask-widget-error-bar" role="alert">
                    <p>{error}</p>
                    {lastUser && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={retryLast}>
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </div>

              <form
                className="ask-widget-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="Mission, orbit, weather, calculation…"
                  rows={2}
                  aria-label="Your question"
                  disabled={streaming}
                />
                {streaming ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => abortRef.current?.abort()}
                  >
                    Stop
                  </button>
                ) : (
                  <button type="submit" className="btn btn-primary btn-sm" disabled={!input.trim()}>
                    Send
                  </button>
                )}
              </form>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        className="ask-widget-fab"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close Orbitex AI" : "Open Orbitex AI"}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-25 12 12)" />
          <circle cx="12" cy="12" r="2.4" fill="currentColor" />
        </svg>
        <span>Orbitex AI</span>
      </button>
    </div>
  );
}
