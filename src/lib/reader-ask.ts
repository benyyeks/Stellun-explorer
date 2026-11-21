/**
 * Ask Stellun from the workspace reader.
 *
 * Uses the same endpoint and request shape as the main Ask page (/api/ask),
 * so answers match what students get elsewhere in the app. The session token
 * is attached when it exists; the request is not blocked when it does not.
 */

import { supabase } from "@/integrations/supabase/client";

export type ReaderAskInput = {
  question: string;
  passage?: string | undefined;
  bookTitle?: string | undefined;
  workspaceTitle?: string | undefined;
  /** Passages from the book chosen for this question (see book-context.ts). */
  excerpt?: string | undefined;
  signal?: AbortSignal | undefined;
  onChunk: (text: string) => void;
};

const MAX_PASSAGE = 1500;
const MAX_QUESTION = 600;

function buildPrompt(input: ReaderAskInput): string {
  const context = [
    input.workspaceTitle ? `Study workspace: ${input.workspaceTitle}.` : "",
    input.bookTitle ? `Book: ${input.bookTitle}.` : "",
    input.passage
      ? `The student highlighted this passage:\n"""${input.passage.slice(0, MAX_PASSAGE)}"""`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const task = input.passage
    ? "Explain the highlighted passage in plain language. Define any technical terms, give one short example, and end with one question that checks understanding."
    : "Answer the student's question clearly, in plain language.";

  return [
    context,
    task,
    `Question: ${input.question.trim().slice(0, MAX_QUESTION)}`,
    "Answer from the book excerpt when one is given. If the excerpt does not contain the answer, say so.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Plain wording for every error the server can return. Raw codes are never shown. */
const ERROR_COPY: Record<string, string> = {
  unauthorized: "Sign in to ask Stellun.",
  rate_limited: "Too many questions in a short time. Wait a moment, then try again.",
  free_model_unavailable: "Stellun AI is offline until a free model is available.",
  assistant_unavailable: "Stellun AI is temporarily unavailable. Try again shortly.",
  bad_request: "That question could not be sent. Try again with a shorter question.",
};

function friendlyError(status: number, serverMessage?: string): string {
  if (serverMessage && !/^[a-z_]+$/.test(serverMessage)) return serverMessage;
  if (serverMessage && ERROR_COPY[serverMessage]) return ERROR_COPY[serverMessage];
  if (status === 401) return ERROR_COPY["unauthorized"]!;
  if (status === 402 || status === 429) return ERROR_COPY["rate_limited"]!;
  if (status === 503) return ERROR_COPY["assistant_unavailable"]!;
  return "Stellun AI could not answer just now. Try again shortly.";
}

export async function askStellun(input: ReaderAskInput): Promise<string> {
  const prompt = buildPrompt(input);

  let token: string | undefined;
  try {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;
  } catch {
    token = undefined;
  }

  const response = await fetch("/api/ask", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      mode: "explain",
      messages: [{ role: "user", content: prompt }],
      book: input.excerpt ? { title: (input.bookTitle ?? "").slice(0, 200), excerpt: input.excerpt.slice(0, 9000) } : undefined,
    }),
    signal: input.signal ?? null,
  });

  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(friendlyError(response.status, body?.error));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    input.onChunk(text);
  }
  text += decoder.decode();
  input.onChunk(text);

  if (!text.trim()) {
    throw new Error("No answer came back. Try asking again.");
  }
  return text;
}
