import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { GLOSSARY_TRACKS, type GlossaryTrack } from "@/lib/glossary";
import { DEFAULT_PENALTY, type Homework, type Penalty } from "@/lib/homework";
import type { StudyWorkspace } from "@/lib/study-workspace";
import { collectContext, currentUserId, readCachedPlan, requestPlan } from "@/lib/daily-plan-client";
import { recordTermResult } from "@/lib/academy-progress";
import { dayKey, readJSON, shuffle, writeJSON } from "@/lib/daily";
import { homeworkDueSoon, mixFor, type PlanType } from "@/lib/plan/rhythm";
import type { DailyPlan, FlashcardItem, HomeworkItem, NewTermItem, PairItem } from "@/lib/plan/types";

/**
 * Today's plan on the Today tab. The plan is created the first time a learner opens it,
 * then kept for the rest of the day. Every item the learner completes is recorded, so
 * tomorrow's plan can review what they struggled with.
 */

const TRACK_NAME: Record<string, string> = Object.fromEntries(GLOSSARY_TRACKS.map((t) => [t.id, t.label]));
const TYPE_NAME: Record<PlanType, string> = {
  homework: "Homework",
  quiz: "Quiz",
  flashcards: "Flashcards",
  word_match: "Word match",
  new_terms: "New terms",
};

type Props = {
  workspaces: StudyWorkspace[];
  homework: Homework[];
  addHomework: (input: Omit<Homework, "id" | "createdAt" | "submittedAt" | "score">) => void;
  penaltyDefaults: Partial<Record<GlossaryTrack, Penalty>>;
};

export function DailyPlanView({ workspaces, homework, addHomework, penaltyDefaults }: Props) {
  const date = dayKey(new Date());
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    void currentUserId().then((id) => {
      if (alive) setUserId(id);
    });
    setPlan(readCachedPlan(date));
    return () => {
      alive = false;
    };
  }, [date]);

  // Shown before the plan is opened: the same rule the server uses, so the two agree.
  const mix = useMemo(() => {
    if (!userId) return null;
    const dueSoon = homeworkDueSoon(
      homework.map((h) => ({ dueAt: h.dueAt, submitted: !!h.submittedAt || h.score !== null })),
      Date.now(),
    );
    return mixFor(userId, date, { hasWorkspaces: workspaces.length > 0, homeworkDueSoon: dueSoon });
  }, [userId, date, workspaces.length, homework]);

  const open = async () => {
    if (!userId) return;
    setBusy(true);
    setMessage("");
    const { tracks, context } = await collectContext(workspaces, homework);
    const res = await requestPlan(date, tracks, context);
    setBusy(false);
    if (res.ok) setPlan(res.plan);
    else setMessage(res.message);
  };

  if (userId === undefined) {
    return (
      <div className="ac-card">
        <p className="ac-muted">Loading today's plan…</p>
      </div>
    );
  }
  if (!userId) {
    return (
      <div className="ac-card">
        <h2 className="ac-h2">Today's plan</h2>
        <p className="ac-muted">Sign in to see today's plan.</p>
      </div>
    );
  }

  if (plan) {
    if (plan.restDay) {
      return (
        <div className="ac-card">
          <h2 className="ac-h2">Rest day</h2>
          <p className="ac-muted">{plan.summary}</p>
        </div>
      );
    }
    return (
      <div className="pdp">
        <div className="ac-card">
          <h2 className="ac-h2">Today's plan</h2>
          <p className="ac-muted">{plan.summary}</p>
        </div>
        {plan.mix.includes("homework") && plan.homework ? (
          <HomeworkSection date={date} hw={plan.homework} homework={homework} addHomework={addHomework} penaltyDefaults={penaltyDefaults} />
        ) : null}
        {plan.mix.includes("quiz") ? <QuizLinkCard /> : null}
        {plan.mix.includes("flashcards") && plan.flashcards.length ? <FlashcardSection cards={plan.flashcards} /> : null}
        {plan.mix.includes("word_match") && plan.word_match.length ? <WordMatchSection pairs={plan.word_match} /> : null}
        {plan.mix.includes("new_terms") && plan.new_terms.length ? <NewTermsSection items={plan.new_terms} /> : null}
      </div>
    );
  }

  if (mix?.restDay) {
    return (
      <div className="ac-card">
        <h2 className="ac-h2">Rest day</h2>
        <p className="ac-muted">Nothing new is planned today. Look back over a term you missed this week if you like.</p>
      </div>
    );
  }

  return (
    <div className="ac-card">
      <h2 className="ac-h2">Today's plan</h2>
      <p className="ac-muted">
        {mix ? `Today: ${mix.types.map((t) => TYPE_NAME[t]).join(", ")}.` : "Today's work is being prepared."}
      </p>
      <button type="button" className="btn btn-primary" onClick={open} disabled={busy}>
        {busy ? "Preparing today's plan…" : "Open today's plan"}
      </button>
      {message ? <p className="ac-error" role="alert">{message}</p> : null}
    </div>
  );
}

// ------------------------------------------------------------------ homework

function HomeworkSection({
  date,
  hw,
  homework,
  addHomework,
  penaltyDefaults,
}: {
  date: string;
  hw: HomeworkItem;
  homework: Homework[];
  addHomework: Props["addHomework"];
  penaltyDefaults: Props["penaltyDefaults"];
}) {
  const planItemId = `${date}:homework`;
  const added = homework.some((h) => h.planItemId === planItemId);
  const answersKey = `stellun:daily-plan-answers:v1:${date}:homework`;
  const [answers, setAnswers] = useState<string[]>(() => {
    const saved = readJSON<string[]>(answersKey, []);
    return hw.parts.map((_, k) => saved[k] ?? "");
  });

  useEffect(() => {
    writeJSON(answersKey, answers);
  }, [answersKey, answers]);

  const add = () => {
    // Due date from the size of the assignment: one part per day of work, up to three days.
    const due = new Date();
    due.setDate(due.getDate() + Math.min(3, Math.max(1, hw.parts.length - 1)) - 1);
    due.setHours(23, 59, 0, 0);
    addHomework({
      title: hw.title,
      track: hw.track,
      dueAt: due.toISOString(),
      maxPoints: 100,
      penalty: penaltyDefaults[hw.track] ?? DEFAULT_PENALTY,
      source: "plan",
      planItemId,
    });
  };

  return (
    <div className="ac-card">
      <h2 className="ac-h2">Homework: {hw.title}</h2>
      <p className="ac-small ac-muted">{TRACK_NAME[hw.track] ?? hw.track} · {hw.instructions}</p>
      {hw.parts.map((part, k) => (
        <div key={k} className="pr-field" style={{ marginTop: 10 }}>
          <p style={{ margin: "0 0 6px" }}>{k + 1}. {part}</p>
          <textarea
            className="ac-input"
            rows={3}
            aria-label={`Answer to part ${k + 1}`}
            value={answers[k] ?? ""}
            onChange={(e) => setAnswers((a) => a.map((x, j) => (j === k ? e.target.value : x)))}
          />
        </div>
      ))}
      {added ? (
        <p className="ac-small" style={{ marginTop: 10 }}>
          Added to your homework. Open Homework to mark it submitted and enter your mark.
        </p>
      ) : (
        <div className="pr-actions" style={{ marginTop: 10 }}>
          <button type="button" className="btn btn-primary" onClick={add}>Add to my homework</button>
        </div>
      )}
      {added ? (
        <details style={{ marginTop: 10 }}>
          <summary>Model answer</summary>
          <p className="ac-small">{hw.model_answer}</p>
        </details>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ quiz (on its own page)

function QuizLinkCard() {
  return (
    <div className="ac-card">
      <h2 className="ac-h2">Quiz</h2>
      <p className="ac-muted">Today's quiz has 5 questions. Take the set as many times as you like today.</p>
      <div className="pr-actions">
        <Link to="/academy/quiz" className="btn btn-primary">Open today's quiz</Link>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ flashcards

function FlashcardSection({ cards }: { cards: FlashcardItem[] }) {
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);
  const [got, setGot] = useState(0);
  const [done, setDone] = useState(false);
  const c = cards[i];

  const mark = (ok: boolean) => {
    if (!c) return;
    recordTermResult(c.term_id, c.track, ok);
    if (ok) setGot((g) => g + 1);
    setShow(false);
    if (i + 1 >= cards.length) setDone(true);
    else setI(i + 1);
  };

  return (
    <div className="ac-card">
      <h2 className="ac-h2">Flashcards</h2>
      {done ? (
        <p>You knew {got} of {cards.length}. The ones you missed will come back in a later plan.</p>
      ) : c ? (
        <>
          <p className="ac-small ac-muted">Card {i + 1} of {cards.length} · {TRACK_NAME[c.track] ?? c.track}</p>
          <p style={{ fontWeight: 600 }}>{c.front}</p>
          {show ? (
            <>
              <p>{c.back}</p>
              <p className="ac-small ac-muted">{c.detail}</p>
              <div className="pr-actions">
                <button type="button" className="btn btn-primary" onClick={() => mark(true)}>Got it</button>
                <button type="button" className="btn" onClick={() => mark(false)}>Review again</button>
              </div>
            </>
          ) : (
            <div className="pr-actions">
              <button type="button" className="btn btn-primary" onClick={() => setShow(true)}>Show answer</button>
            </div>
          )}
        </>
      ) : (
        <p className="ac-muted">No cards yet.</p>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ word match

function WordMatchSection({ pairs }: { pairs: PairItem[] }) {
  const rightOrder = useMemo(() => shuffle(pairs.map((p) => p.term_id)), [pairs]);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const shortOf = (id: string) => pairs.find((p) => p.term_id === id)?.short ?? "";
  const trackOf = (id: string) => pairs.find((p) => p.term_id === id)?.track ?? "aerospace";

  const choose = (rightId: string) => {
    if (!picked) return;
    if (picked === rightId) {
      recordTermResult(rightId, trackOf(rightId), true);
      setDone((d) => [...d, rightId]);
      setPicked(null);
    } else {
      recordTermResult(picked, trackOf(picked), false);
      setMistakes((m) => m + 1);
      setWrong(rightId);
      window.setTimeout(() => setWrong(null), 450);
    }
  };

  const finished = done.length === pairs.length;
  return (
    <div className="ac-card">
      <h2 className="ac-h2">Word match</h2>
      <p className="pr-score">
        <span>Matched {done.length} of {pairs.length}</span>
        <span>Mistakes {mistakes}</span>
      </p>
      {finished ? (
        <p>{mistakes === 0 ? "No mistakes. Excellent." : `${mistakes} mistake${mistakes === 1 ? "" : "s"}. Those terms will come back soon.`}</p>
      ) : (
        <div className="pr-match-cols">
          <div className="pr-match-col">
            <p className="ac-small ac-muted" style={{ margin: 0 }}>Terms</p>
            {pairs.map((p) => {
              const isDone = done.includes(p.term_id);
              return (
                <button
                  key={p.term_id}
                  type="button"
                  className={`pr-pair${isDone ? " pr-pair--done" : ""}${picked === p.term_id ? " pr-pair--picked" : ""}`}
                  disabled={isDone}
                  onClick={() => setPicked(p.term_id)}
                >
                  {p.term}
                </button>
              );
            })}
          </div>
          <div className="pr-match-col">
            <p className="ac-small ac-muted" style={{ margin: 0 }}>Definitions</p>
            {rightOrder.map((id) => {
              const isDone = done.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  className={`pr-pair${isDone ? " pr-pair--done" : ""}${wrong === id ? " pr-pair--wrong" : ""}`}
                  disabled={isDone || !picked}
                  onClick={() => choose(id)}
                >
                  {shortOf(id)}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {!picked && !finished ? <p className="ac-small ac-muted">Choose a term, then its definition.</p> : null}
    </div>
  );
}

// ------------------------------------------------------------------ new terms

function NewTermsSection({ items }: { items: NewTermItem[] }) {
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const mark = (item: NewTermItem, knows: boolean) => {
    recordTermResult(item.term_id, item.track, knows);
    setMarks((m) => ({ ...m, [item.term_id]: knows }));
  };
  return (
    <div className="ac-card">
      <h2 className="ac-h2">New terms to learn</h2>
      {items.map((item) => (
        <div key={item.term_id} className="pr-day-item" style={{ marginBottom: 12 }}>
          <p style={{ margin: "0 0 4px", fontWeight: 600 }}>{item.term}</p>
          <p className="ac-small" style={{ margin: "0 0 4px" }}>{item.short}</p>
          <p className="ac-small ac-muted" style={{ margin: "0 0 6px" }}>{item.detail}</p>
          <p className="ac-small" style={{ margin: "0 0 8px" }}>{item.why}</p>
          {marks[item.term_id] === undefined ? (
            <div className="pr-actions">
              <button type="button" className="btn btn-primary" onClick={() => mark(item, true)}>I know this now</button>
              <button type="button" className="btn" onClick={() => mark(item, false)}>Review later</button>
            </div>
          ) : (
            <p className="ac-small ac-muted" style={{ margin: 0 }}>{marks[item.term_id] ? "Noted as known." : "Noted for review."}</p>
          )}
        </div>
      ))}
    </div>
  );
}
