import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStudyWorkspaces } from "@/lib/study-workspace";
import { useHomework } from "@/lib/homework";
import { collectContext, currentUserId } from "@/lib/daily-plan-client";
import { requestExplain, requestPool, submitQuizSet, type PublicQuestion, type SubmitResult } from "@/lib/quiz-client";
import { quizSummary, recordQuizSet, recordTermResult } from "@/lib/academy-progress";
import { dayKey, shuffle } from "@/lib/daily";
import { glossaryCategoryLabel, type GlossaryCategory } from "@/lib/glossary";

/**
 * Today's quiz. The set follows the daily plan: it is made once per day, on the days the
 * rhythm gives a quiz. Each set uses the same questions, with the choices in a new order,
 * so the learner can practise as much as they like. Answers are checked on the server.
 */

export const Route = createFileRoute("/_authenticated/academy/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz · STELLUN Academy" },
      { name: "description", content: "Today's quiz: five questions, as many sets as you like, with explanations." },
    ],
  }),
  component: QuizPage,
});

type Phase = "intro" | "loading" | "signin" | "no_quiz" | "error" | "ready" | "answering" | "submitting" | "result" | "explaining" | "explained";

const TRACK_LABEL: Record<string, string> = { aviation: "Aviation", astronomy: "Astronomy", aerospace: "Aerospace", stem: "STEM" };
const termKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const categoryName = (c: string) => {
  try {
    return glossaryCategoryLabel(c as GlossaryCategory);
  } catch {
    return c.replace(/-/g, " ");
  }
};

function QuizPage() {
  const { workspaces } = useStudyWorkspaces();
  const hw = useHomework();
  const [phase, setPhase] = useState<Phase>("intro");
  const [date, setDate] = useState(dayKey(new Date()));
  const [nextDate, setNextDate] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [order, setOrder] = useState<Record<string, string[]>>({});
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [setNo, setSetNo] = useState(0);
  const [last, setLast] = useState<Extract<SubmitResult, { kind: "ok" }> | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  // Read from this device after the page loads, so server and browser render the same first time.
  const [summary, setSummary] = useState<ReturnType<typeof quizSummary>>({ sets: 0, right: 0, total: 0, successRate: null, byCategory: [] });
  useEffect(() => {
    setSummary(quizSummary());
  }, [phase]);

  const startSet = (qs: PublicQuestion[]) => {
    setOrder(Object.fromEntries(qs.map((q) => [q.id, shuffle(q.choices)])));
    setChosen({});
    setIndex(0);
    setSetNo((n) => n + 1);
    setLast(null);
    setExplanations({});
    setMessage("");
    setPhase("answering");
  };

  const open = async () => {
    setPhase("loading");
    setMessage("");
    const userId = await currentUserId();
    if (!userId) return setPhase("signin");
    const today = dayKey(new Date());
    setDate(today);
    const { tracks, context } = await collectContext(workspaces, hw.items);
    const res = await requestPool(today, tracks, context);
    if (res.kind === "error") {
      setMessage(res.message);
      return setPhase("error");
    }
    if (res.kind === "no_quiz") {
      setNextDate(res.nextDate);
      return setPhase("no_quiz");
    }
    setQuestions(res.questions);
    setSetNo(0);
    setPhase("ready");
  };

  const submit = async () => {
    setPhase("submitting");
    setMessage("");
    const res = await submitQuizSet(
      date,
      questions.map((q) => ({ id: q.id, chosen: chosen[q.id] ?? null })),
    );
    if (res.kind === "error") {
      setMessage(res.message);
      return setPhase("answering");
    }
    const byId = new Map(questions.map((q) => [q.id, q] as const));
    recordQuizSet({
      date,
      attemptId: res.attemptId,
      score: res.score,
      total: res.total,
      items: res.results.map((r) => ({
        track: byId.get(r.id)?.track ?? "",
        category: byId.get(r.id)?.category ?? "",
        style: byId.get(r.id)?.style ?? "",
        correct: r.correct,
      })),
    });
    for (const r of res.results) recordTermResult(termKey(r.answer), byId.get(r.id)?.track ?? "aerospace", r.correct);
    setLast(res);
    setPhase("result");
  };

  const explain = async () => {
    if (!last) return;
    setPhase("explaining");
    const res = await requestExplain(last.attemptId);
    if (res.kind === "error") {
      setMessage(res.message);
      return setPhase("result");
    }
    setExplanations(Object.fromEntries(res.explanations.map((e) => [e.id, e.text])));
    setPhase("explained");
  };

  const current = questions[index];
  const answered = Object.keys(chosen).length;

  return (
    <div className="ac-page">
      <header className="ac-hero">
        <div className="ac-hero-copy">
          <span className="ac-kicker">Academy</span>
          <h1 className="ac-title">Quiz</h1>
          <p className="ac-hero-sub">Today's questions. Take as many sets as you like, then check the explanations.</p>
        </div>
      </header>

      {summary.sets > 0 ? (
        <div className="ac-card">
          <p className="ac-small ac-muted" style={{ margin: 0 }}>
            Your success on this device: {summary.successRate === null ? "no answers yet" : `${Math.round(summary.successRate * 100)}% over ${summary.sets} set${summary.sets === 1 ? "" : "s"}`}
            {summary.byCategory[0] && summary.byCategory[0].wrong > 0 ? `. Most to review: ${categoryName(summary.byCategory[0].category)}.` : "."}
          </p>
        </div>
      ) : null}

      {phase === "intro" ? (
        <div className="ac-card">
          <h2 className="ac-h2">Today's quiz</h2>
          <p className="ac-muted">Five questions picked for you today. A new set appears on the next quiz day.</p>
          <button type="button" className="btn btn-primary" onClick={open}>Open today's quiz</button>
        </div>
      ) : null}

      {phase === "loading" ? <div className="ac-card"><p className="ac-muted">Preparing today's quiz…</p></div> : null}

      {phase === "signin" ? (
        <div className="ac-card"><p className="ac-muted">Sign in to take today's quiz.</p></div>
      ) : null}

      {phase === "no_quiz" ? (
        <div className="ac-card">
          <h2 className="ac-h2">No quiz today</h2>
          <p className="ac-muted">
            {nextDate
              ? `Your next quiz is on ${new Date(nextDate + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}.`
              : "Your next quiz will appear on a later day."}
          </p>
          <Link to="/academy/practice" className="btn">Back to Today</Link>
        </div>
      ) : null}

      {phase === "error" ? (
        <div className="ac-card">
          <p className="ac-error" role="alert">{message}</p>
          <button type="button" className="btn" onClick={open}>Try again</button>
        </div>
      ) : null}

      {phase === "ready" ? (
        <div className="ac-card">
          <h2 className="ac-h2">{setNo === 0 ? "Start today's set" : `Set ${setNo + 1} today`}</h2>
          <p className="ac-muted">{questions.length} questions. You can take the set as many times as you like today; each time the choices come in a new order.</p>
          <button type="button" className="btn btn-primary" onClick={() => startSet(questions)}>Start set</button>
        </div>
      ) : null}

      {phase === "answering" && current ? (
        <div className="ac-card">
          <p className="ac-small ac-muted">
            Question {index + 1} of {questions.length} · {TRACK_LABEL[current.track] ?? current.track} · {categoryName(current.category)} · Set {setNo}
          </p>
          <p style={{ fontWeight: 600 }}>{current.prompt}</p>
          <div className="pr-match-col">
            {(order[current.id] ?? current.choices).map((c) => (
              <button
                key={c}
                type="button"
                className={`pr-pair${chosen[current.id] === c ? " pr-pair--picked" : ""}`}
                onClick={() => setChosen((m) => ({ ...m, [current.id]: c }))}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="pr-actions" style={{ marginTop: 12 }}>
            <button type="button" className="btn" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</button>
            {index + 1 < questions.length ? (
              <button type="button" className="btn btn-primary" onClick={() => setIndex(index + 1)}>Next question</button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={submit}>Submit set</button>
            )}
          </div>
          <p className="ac-small ac-muted" style={{ marginTop: 8 }}>Answered {answered} of {questions.length}.</p>
          {message ? <p className="ac-error" role="alert">{message}</p> : null}
        </div>
      ) : null}

      {phase === "submitting" ? <div className="ac-card"><p className="ac-muted">Checking your set…</p></div> : null}

      {(phase === "result" || phase === "explaining" || phase === "explained") && last ? (
        <div className="ac-card">
          <h2 className="ac-h2">Set {setNo}: {last.score} of {last.total}</h2>
          {last.results.map((r) => {
            const q = questions.find((x) => x.id === r.id);
            return (
              <div key={r.id} className="pr-day-item" style={{ marginBottom: 10 }}>
                <p className="ac-small" style={{ margin: "0 0 4px" }}>{q?.prompt}</p>
                <p className="ac-small" style={{ margin: 0 }}>
                  {r.correct ? "✓ " : "✗ "}
                  Your answer: {r.chosen ?? "none"} · Correct answer: {r.answer}
                </p>
                {phase === "explained" && explanations[r.id] ? (
                  <p className="ac-small ac-muted" style={{ margin: "6px 0 0" }}>{explanations[r.id]}</p>
                ) : null}
              </div>
            );
          })}
          {message ? <p className="ac-error" role="alert">{message}</p> : null}
          <div className="pr-actions">
            {phase === "result" ? (
              <button type="button" className="btn" onClick={explain}>Check explanations</button>
            ) : null}
            {phase === "explaining" ? <p className="ac-muted">Stellun is explaining the answers…</p> : null}
            <button type="button" className="btn btn-primary" onClick={() => startSet(questions)}>Try a new set</button>
            <Link to="/academy/practice" className="btn">Back to Today</Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
