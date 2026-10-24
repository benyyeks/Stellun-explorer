import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AnswerText } from "@/components/site/answer-text";
import { BOOK_TOPICS } from "@/lib/books";
import { buildStudyAskPrompt, type StudyWorkspace } from "@/lib/study-workspace";
import { addUploadedBook, listUploadedBooks, removeUploadedBook, MAX_TITLE, MAX_UPLOADS, type UploadedBook } from "@/lib/study-uploads";

export function StudyUploadPanel({ workspace }: { workspace: StudyWorkspace | null }) {
  const [books, setBooks] = useState<UploadedBook[]>([]);
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [topic, setTopic] = useState(BOOK_TOPICS[0]?.id ?? "orbital-mechanics");
  const [customTopic, setCustomTopic] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const urls = useRef(new Set<string>());
  useEffect(() => { setBooks(listUploadedBooks()); return () => { abortRef.current?.abort(); urls.current.forEach((url) => URL.revokeObjectURL(url)); }; }, []);

  const upload = (event: FormEvent) => {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || title.trim().length < 2) return;
    if (topic === "other" && !customTopic.trim()) {
      setError("Write your topic under Others.");
      return;
    }
    if (!/\.(pdf|txt|md)$/i.test(file.name)) { setError("Choose a PDF, text, or Markdown book."); return; }
    const objectUrl = URL.createObjectURL(file);
    const book = addUploadedBook({ title, authors, topicId:
  topic === "other"
    ? `custom:${customTopic.trim().slice(0, 80)}`
    : topic, fileName: file.name, objectUrl });
    if (!book) { URL.revokeObjectURL(objectUrl); setError("The book could not be added. Check its title and your book list."); return; }
    urls.current.add(objectUrl);
    setBooks((prev) => [book, ...prev]); setReferenceId(book.id); setTitle(""); setAuthors(""); setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const ask = async (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim() || busy) return;
    const book = books.find((b) => b.id === referenceId);
    const context = [workspace ? buildStudyAskPrompt(workspace) : "", book ? `Study reference: ${book.title} by ${book.authors || "author unspecified"}. Topic: ${book.topicId}. ${book.notes}` : ""].filter(Boolean).join("\n");
    if (!context) { setError("Select a workspace or uploaded book first."); return; }
    const controller = new AbortController(); abortRef.current = controller;
    setBusy(true); setError(""); setAnswer("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sign in again to continue studying.");
      const response = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ mode: "explain", messages: [{ role: "user", content: `${context.slice(0, 1300)}\nThe book file has not been provided. Use only these references and notes, not unseen pages.\nQuestion: ${question.trim().slice(0, 450)}` }] }), signal: controller.signal });
      if (!response.ok || !response.body) throw new Error(response.status === 402 || response.status === 429 ? "Stellun AI is offline until a free model is available." : "Stellun AI is temporarily unavailable. Please try again later.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let text = "";
      for (;;) { const { done, value } = await reader.read(); if (done) break; text += decoder.decode(value, { stream: true }); setAnswer(text); }
      if (!text.trim()) throw new Error("No answer came back. Please retry your question.");
    } catch (err) { if ((err as Error).name !== "AbortError") setError((err as Error).message); }
    finally { setBusy(false); abortRef.current = null; }
  };

  return (
    <>
      <div className="glass glass-card scaffold-card study-upload-panel">
        <h3>Your books</h3>
        <p className="detail-note">Book references stay in this browser. Reading links last for this visit; Stellun AI receives titles and study notes, not the file contents.</p>
        <form className="study-desk-create" onSubmit={upload}>
          <label className="field-label" htmlFor="upload-book-title">Book title (required)</label>
          <input id="upload-book-title" className="input" required minLength={2} maxLength={MAX_TITLE} value={title} onChange={(e) => setTitle(e.target.value)} />
          <label className="field-label" htmlFor="upload-book-authors">Author</label>
          <input id="upload-book-authors" className="input" maxLength={120} value={authors} onChange={(e) => setAuthors(e.target.value)} />
          <label className="field-label" htmlFor="upload-book-topic">Book topic</label>
          <select
            id="upload-book-topic"
            className="input"
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              if (e.target.value !== "other") setCustomTopic("");
            }}
          >
            {BOOK_TOPICS.map((t) => (
              <option value={t.id} key={t.id}>
                {t.label}
              </option>
            ))}
            <option value="other">Others (write your own)</option>
          </select>
          {topic === "other" && (
            <>
              <label className="field-label" htmlFor="upload-book-topic-custom">
                Your topic
              </label>
              <input
                id="upload-book-topic-custom"
                className="input"
                value={customTopic}
                maxLength={120}
                required
                placeholder="e.g. Satellite communications"
                onChange={(e) => setCustomTopic(e.target.value)}
              />
            </>
          )}
          <label className="field-label" htmlFor="upload-book-file">Book file</label>
          <input ref={fileRef} id="upload-book-file" className="input" type="file" accept=".pdf,.txt,.md" required />
          <button className="btn btn-primary btn-sm" type="submit" disabled={books.length >= MAX_UPLOADS}>Add book</button>
        </form>
        <ul className="study-ws-list">{books.map((book) => <li key={book.id} className="study-upload-row"><span><b>{book.title}</b><small className="study-ws-meta">{book.authors}{book.fileName ? ` · ${book.fileName}` : ""}</small></span>{book.objectUrl && <a href={book.objectUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Read</a>}<button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove ${book.title}`} onClick={() => { removeUploadedBook(book.id); if (book.objectUrl) { URL.revokeObjectURL(book.objectUrl); urls.current.delete(book.objectUrl); } setBooks((prev) => prev.filter((b) => b.id !== book.id)); if (referenceId === book.id) setReferenceId(""); }}>Remove</button></li>)}</ul>
      </div>
      <div className="glass glass-card scaffold-card study-ai-box">
        <h3>Stellun AI</h3>
        <form className="study-desk-create" onSubmit={(e) => void ask(e)}>
          <label className="field-label" htmlFor="study-ai-reference">Additional book reference</label>
          <select id="study-ai-reference" className="input" value={referenceId} onChange={(e) => setReferenceId(e.target.value)}><option value="">Current workspace only</option>{books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}</select>
          <label className="field-label" htmlFor="study-ai-question">Study question</label>
          <textarea id="study-ai-question" className="input" rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={450} required disabled={busy} />
          {busy ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => abortRef.current?.abort()}>Stop</button> : <button type="submit" className="btn btn-primary btn-sm" disabled={!question.trim() || (!workspace && !referenceId)}>Stellun AI</button>}
        </form>
        {error && <div className="ask-error-bar" role="alert"><p>{error}</p></div>}
        <div aria-live="polite" aria-busy={busy}>{answer ? <AnswerText text={answer} /> : busy ? <span className="live-dot" aria-label="Thinking" /> : null}</div>
      </div>
    </>
  );
}
