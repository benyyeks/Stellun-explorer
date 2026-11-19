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
    "Use only the passage and the question. If the passage does not contain enough to answer, say so.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function friendlyError(status: number, serverMessage?: string): string {
  if (serverMessage) return serverMessage;
  if (status === 401) return "Sign in to ask Stellun.";
  if (status === 402 || status === 429) {
    return "Stellun AI is busy right now. Wait a moment and try again.";
  }
  return "Stellun AI is unavailable right now. Try again shortly.";
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
