import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStudyWorkspaces } from "@/lib/study-workspace";
import { useAcademyContent } from "@/lib/academy-content";
import { CATEGORY_TRACK, GLOSSARY_TRACKS, type GlossaryTrack } from "@/lib/glossary";
import {
  DEFAULT_PENALTY,
  STATUS_LABEL,
  describePenalty,
  gradeOf,
  useHomework,
  usePenaltyDefaults,
  type Homework,
  type Penalty,
} from "@/lib/homework";
import { dailyPick, dayKey, freshPick, readJSON, shuffle, writeJSON } from "@/lib/daily";
import { DailyPlanView } from "@/components/academy/daily-plan-view";

/**
 * Practice
 * --------
 * Homework: due dates, scores, and a late penalty set for each task.
 * Today: the daily question, today's word match, and today's picture.
 * Word match and the puzzle draw items that have not been shown before, so the
 * questions and pictures change daily and do not repeat until every item is used.
 */

export const Route = createFileRoute("/_authenticated/academy/practice")({
  head: () => ({
    meta: [
      { title: "Practice · STELLUN Academy" },
      { name: "description", content: "Homework with due dates and late penalties, a daily question, word match, and a picture puzzle." },
    ],
  }),
  component: PracticePage,
});

type Tab = "homework" | "today" | "week" | "match" | "puzzle";
const TABS: { id: Tab; label: string }[] = [
  { id: "homework", label: "Homework" },
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "match", label: "Word match" },
  { id: "puzzle", label: "Puzzle" },
];

type TermEntry = ReturnType<typeof useAcademyContent>["terms"][number];
type PictureEntry = ReturnType<typeof useAcademyContent>["pictures"][number];
type Grade = ReturnType<typeof gradeOf>;

const TRACK_LABEL: Record<GlossaryTrack, string> = Object.fromEntries(
  GLOSSARY_TRACKS.map((t) => [t.id, t.label]),
) as Record<GlossaryTrack, string>;

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** One line that explains what the late penalty did, or will do, for this task. */
function penaltyText(h: Homework, g: Grade): string | null {
  if (g.lateDays === 0) return h.submittedAt ? "Submitted on time. No penalty." : null;
  const late = `${plural(g.lateDays, "day")} late`;
  if (h.penalty.kind === "none") return `${late}. This task has no late penalty.`;
  if (h.penalty.kind === "zero") {
    const limit = `${h.penalty.afterDays}-day limit`;
    return g.zero
      ? `${late}, past the ${limit}, so the mark ${h.submittedAt ? "is" : "would be"} zero.`
      : `${late}, within the ${limit}. Full mark.`;
  }
  const amount = h.penalty.kind === "percent" ? `${g.penaltyPct}%` : plural(g.deductionPts, "point");
  return h.submittedAt ? `${late}, so ${amount} is deducted.` : `${late}. Submitting now deducts ${amount}.`;
}

function finalNote(g: Grade): string {
  if (g.zero) return " after the late limit (mark set to zero)";
  if (g.deductionPts > 0) return ` after ${plural(g.deductionPts, "point")} deducted`;
  if (g.penaltyPct > 0) return ` after ${g.penaltyPct}% deducted`;
  return "";
}

function PracticePage() {
  const [tab, setTab] = useState<Tab>("homework");
  return (
    <div className="ac-page">
      <header className="ac-hero">
        <div className="ac-hero-copy">
          <span className="ac-kicker">Academy</span>
          <h1 className="ac-title">Practice</h1>
          <p className="ac-hero-sub">Keep up with homework, follow today's plan, and drill the terms and pictures you are learning.</p>
        </div>
      </header>

      <div className="pr-tabs" role="tablist" aria-label="Practice sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className="pr-tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "homework" && <HomeworkPanel />}
      {tab === "today" && <TodayPanel />}
      {tab === "week" && <WeekPanel />}
      {tab === "match" && <WordMatch />}
      {tab === "puzzle" && <PicturePuzzle />}
    </div>
  );
}

// ------------------------------------------------------------------ homework

const PENALTY_KINDS: { id: Penalty["kind"]; label: string }[] = [
  { id: "percent", label: "Percent of the score per late day" },
  { id: "points", label: "Points per late day" },
  { id: "zero", label: "Full mark, then zero after a set number of days" },
  { id: "none", label: "No late penalty" },
];

function HomeworkPanel() {
  const hw = useHomework();
  const { defaults, remember } = usePenaltyDefaults();
  const [title, setTitle] = useState("");
  const [track, setTrack] = useState<GlossaryTrack>("aerospace");
  const [dueAt, setDueAt] = useState("");
  const [maxPoints, setMaxPoints] = useState("100");

  const [kind, setKind] = useState<Penalty["kind"]>("percent");
  const [perDay, setPerDay] = useState("10");
  const [cap, setCap] = useState("50");
  const [afterDays, setAfterDays] = useState("3");
  const [grace, setGrace] = useState("0");
  const [rememberSection, setRememberSection] = useState(false);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const now = Date.now();
  const sorted = useMemo(() => [...hw.items].sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt)), [hw.items]);

  const applyPenalty = (p: Penalty) => {
    setKind(p.kind);
    if (p.kind === "percent") {
      setPerDay(String(p.perDay));
      setCap(String(p.cap));
      setGrace(String(p.graceHours));
    } else if (p.kind === "points") {
      setPerDay(String(p.perDay));
      setCap(String(p.cap));
      setGrace(String(p.graceHours));
    } else if (p.kind === "zero") {
      setAfterDays(String(p.afterDays));
      setGrace(String(p.graceHours));
    }
  };

  // Each section starts with the penalty it last used; the first load applies the saved defaults.
  useEffect(() => {
    applyPenalty(defaults[track] ?? DEFAULT_PENALTY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaults]);

  const chooseTrack = (t: GlossaryTrack) => {
    setTrack(t);
    applyPenalty(defaults[t] ?? DEFAULT_PENALTY);
  };

  const buildPenalty = (): { penalty: Penalty } | { error: string } => {
    if (kind === "none") return { penalty: { kind: "none" } };
    const g = Number(grace);
    if (!(g >= 0 && g <= 168)) return { error: "The grace period must be between 0 and 168 hours." };
    if (kind === "percent") {
      const p = Number(perDay);
      const c = Number(cap);
      if (!(p >= 0 && p <= 100 && c >= 0 && c <= 100)) return { error: "Percentages must be between 0 and 100." };
      return { penalty: { kind, perDay: p, cap: c, graceHours: g } };
    }
    if (kind === "points") {
      const p = Number(perDay);
      const c = Number(cap);
      if (!(p >= 0 && c >= 0)) return { error: "Points must be zero or more." };
      return { penalty: { kind, perDay: p, cap: c, graceHours: g } };
    }
    const d = Number(afterDays);
    if (!(Number.isInteger(d) && d >= 0 && d <= 365)) return { error: "Late days before zero must be a whole number from 0 to 365." };
    return { penalty: { kind: "zero", afterDays: d, graceHours: g } };
  };

  const add = () => {
    setError("");
    if (!title.trim()) return setError("Give the homework a title.");
    if (!dueAt) return setError("Choose a due date and time.");
    const points = Number(maxPoints);
    if (!(points > 0)) return setError("Maximum points must be above zero.");
    const built = buildPenalty();
    if ("error" in built) return setError(built.error);
    if (built.penalty.kind === "points" && built.penalty.cap > points) {
      return setError("The points cap cannot be more than the maximum points.");
    }
    hw.add({
      title: title.trim().slice(0, 120),
      track,
      dueAt: new Date(dueAt).toISOString(),
      maxPoints: points,
      penalty: built.penalty,
    });
    if (rememberSection) remember(track, built.penalty);
    setTitle("");
    setDueAt("");
  };

  const saveGrade = (h: Homework) => {
    const raw = drafts[h.id];
    if (raw === undefined || raw === "") return;
    const score = Number(raw);
    if (!(score >= 0 && score <= h.maxPoints)) {
      setError(`Enter a score between 0 and ${h.maxPoints}.`);
      return;
    }
    setError("");
    hw.update(h.id, { score, submittedAt: h.submittedAt ?? new Date().toISOString() });
    setDrafts((d) => ({ ...d, [h.id]: "" }));
  };

  const preview = buildPenalty();
  const previewPts = Number(maxPoints) || 100;

  return (
    <section className="pr-panel" aria-label="Homework">
      <form
        className="pr-form"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <h2 className="ac-h2">Add homework</h2>
        <div className="pr-form-grid">
          <label className="pr-field">
            <span className="ac-label">Title</span>
            <input className="ac-input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Problem set 3" />
          </label>
          <label className="pr-field">
            <span className="ac-label">Section</span>
            <select className="ac-input" value={track} onChange={(e) => chooseTrack(e.target.value as GlossaryTrack)}>
              {GLOSSARY_TRACKS.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="pr-field">
            <span className="ac-label">Due</span>
            <input className="ac-input" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </label>
          <label className="pr-field">
            <span className="ac-label">Maximum points</span>
            <input className="ac-input" type="number" min={1} value={maxPoints} onChange={(e) => setMaxPoints(e.target.value)} />
          </label>
        </div>

        <fieldset className="pr-penalty">
          <legend className="ac-label">Late penalty for this task</legend>
          <label className="pr-field">
            <span className="ac-label">Rule</span>
            <select className="ac-input" value={kind} onChange={(e) => setKind(e.target.value as Penalty["kind"])}>
              {PENALTY_KINDS.map((k) => (
                <option key={k.id} value={k.id}>{k.label}</option>
              ))}
            </select>
          </label>
          {kind === "percent" || kind === "points" ? (
            <div className="pr-form-grid">
              <label className="pr-field">
                <span className="ac-label">{kind === "percent" ? "Deducted per late day (%)" : "Points deducted per late day"}</span>
                <input className="ac-input" type="number" min={0} max={kind === "percent" ? 100 : undefined} value={perDay} onChange={(e) => setPerDay(e.target.value)} />
              </label>
              <label className="pr-field">
                <span className="ac-label">{kind === "percent" ? "Most that can be deducted (%)" : "Most that can be deducted (points)"}</span>
                <input className="ac-input" type="number" min={0} max={kind === "percent" ? 100 : undefined} value={cap} onChange={(e) => setCap(e.target.value)} />
              </label>
            </div>
          ) : null}
          {kind === "zero" ? (
            <label className="pr-field">
              <span className="ac-label">Late days allowed before the mark becomes zero</span>
              <input className="ac-input" type="number" min={0} max={365} value={afterDays} onChange={(e) => setAfterDays(e.target.value)} />
            </label>
          ) : null}
          {kind !== "none" ? (
            <label className="pr-field">
              <span className="ac-label">Grace period (hours after the deadline with no penalty)</span>
              <input className="ac-input" type="number" min={0} max={168} value={grace} onChange={(e) => setGrace(e.target.value)} />
            </label>
          ) : null}
          <p className="ac-small ac-muted" style={{ margin: 0 }}>
            {"penalty" in preview ? describePenalty(preview.penalty, previewPts) : preview.error}
          </p>
          <label className="pr-check">
            <input type="checkbox" checked={rememberSection} onChange={(e) => setRememberSection(e.target.checked)} />
            <span>Use these penalty settings for {TRACK_LABEL[track]} next time</span>
          </label>
        </fieldset>

        {error ? <p className="ac-error" role="alert">{error}</p> : null}
        <div>
          <button type="submit" className="btn btn-primary">Add homework</button>
        </div>
      </form>

      {sorted.length === 0 ? (
        <p className="ac-empty">No homework yet. Add a task above to track its due date, score, and any late penalty.</p>
      ) : (
        <ul className="pr-hw-list">
          {sorted.map((h) => {
            const g = gradeOf(h, now);
            const note = penaltyText(h, g);
            return (
              <li key={h.id} className={`pr-hw pr-hw--${g.status === "due-soon" || g.status === "upcoming" ? "open" : g.status}`}>
                <div className="pr-hw-head">
                  <h3 className="pr-hw-title">{h.title}</h3>
                  <span className={`pr-chip pr-chip--${g.status}`}>{STATUS_LABEL[g.status]}</span>
                </div>
                <div className="pr-hw-meta">
                  <span>{TRACK_LABEL[h.track]}</span>
                  <span>Due {fmt(h.dueAt)}</span>
                  <span>{h.maxPoints} points</span>
                </div>
                <p className="ac-small" style={{ margin: 0 }}>Penalty: {describePenalty(h.penalty, h.maxPoints)}</p>
                {note ? <p className="ac-small" style={{ margin: 0 }}>{note}</p> : null}

                <div className="pr-grade">
                  <div className="pr-grade-row">
                    <label className="ac-small" htmlFor={`score-${h.id}`}>Score out of {h.maxPoints}</label>
                    <input
                      id={`score-${h.id}`}
                      className="ac-input"
                      type="number"
                      min={0}
                      max={h.maxPoints}
                      value={drafts[h.id] ?? (h.score ?? "")}
                      placeholder={h.score === null ? "Enter mark" : undefined}
                      onChange={(e) => setDrafts((d) => ({ ...d, [h.id]: e.target.value }))}
                    />
                    <button type="button" className="btn" onClick={() => saveGrade(h)}>Save grade</button>
                  </div>
                  {g.finalScore !== null ? (
                    <p className="pr-final" style={{ margin: 0 }}>
                      Final: {g.finalScore} / {h.maxPoints}
                      {finalNote(g) ? <span className="ac-small ac-muted">{finalNote(g)}</span> : null}
                    </p>
                  ) : null}
                </div>

                <div className="pr-actions">
                  {!h.submittedAt && h.score === null ? (
                    <button type="button" className="btn btn-primary" onClick={() => hw.update(h.id, { submittedAt: new Date().toISOString() })}>
                      Mark submitted now
                    </button>
                  ) : null}
                  <button type="button" className="btn" onClick={() => hw.remove(h.id)}>Remove</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ today

function TodayPanel() {
  const hw = useHomework();
  const { workspaces } = useStudyWorkspaces();
  const { defaults } = usePenaltyDefaults();
  const now = Date.now();
  const dueToday = hw.items.filter((h) => !h.submittedAt && h.score === null && (sameDay(Date.parse(h.dueAt), now) || Date.parse(h.dueAt) < now));
  const checklist = workspaces.flatMap((w) => w.checklist.filter((c) => !c.done).map((c) => ({ id: `${w.id}-${c.id}`, label: c.label, workspace: w.title })));

  return (
    <section className="pr-panel" aria-label="Today">
      <DailyPlanView workspaces={workspaces} homework={hw.items} addHomework={hw.add} penaltyDefaults={defaults} />

      <div className="ac-card">
        <h2 className="ac-h2">Due today or overdue</h2>
        {dueToday.length === 0 ? (
          <p className="pr-empty">Nothing due today. Good time to work through your checklist.</p>
        ) : (
          <ul className="pr-hw-list">
            {dueToday.map((h) => {
              const g = gradeOf(h, now);
              const note = penaltyText(h, g);
              return (
                <li key={h.id} className="pr-day-item">
                  <strong>{h.title}</strong> · {TRACK_LABEL[h.track]} · due {fmt(h.dueAt)}
                  {note ? <span className="ac-muted"> · {note}</span> : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="ac-card">
        <h2 className="ac-h2">Checklist items still open</h2>
        {checklist.length === 0 ? (
          <p className="pr-empty">Every checklist item is done. Open your workspace to add the next step.</p>
        ) : (
          <ul className="pr-hw-list">
            {checklist.slice(0, 8).map((c) => (
              <li key={c.id} className="pr-day-item">
                {c.label} <span className="ac-muted">· {c.workspace}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="pr-actions">
        <Link to="/academy/desk" className="btn">Open Workspaces</Link>
      </div>
    </section>
  );
}

function WeekPanel() {
  const hw = useHomework();
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  return (
    <section className="pr-panel" aria-label="This week">
      <div className="pr-week">
        {days.map((d) => {
          const items = hw.items.filter((h) => sameDay(Date.parse(h.dueAt), d.getTime()));
          const isToday = sameDay(d.getTime(), now.getTime());
          return (
            <div key={d.toISOString()} className={`pr-day${isToday ? " pr-day--today" : ""}`}>
              <h3>{d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}</h3>
              {items.length === 0 ? (
                <p className="pr-empty">Nothing due</p>
              ) : (
                items.map((h) => {
                  const g = gradeOf(h, now.getTime());
                  return (
                    <div key={h.id} className="pr-day-item">
                      {h.title}
                      <span className="ac-muted"> · {STATUS_LABEL[g.status]}</span>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ word match

function WordMatch() {
  const content = useAcademyContent();
  const [track, setTrack] = useState<GlossaryTrack | "all">("all");

  const pool = useMemo(
    () => content.terms.filter((e) => e.short && (track === "all" || CATEGORY_TRACK[e.category] === track)),
    [content.terms, track],
  );
  const kind = `match-${track}`;

  const [pairs, setPairs] = useState<TermEntry[]>([]);
  const [rightOrder, setRightOrder] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [wrong, setWrong] = useState<{ left: string; right: string } | null>(null);
  const [mistakes, setMistakes] = useState(0);

  const startRound = (items: TermEntry[], message: string) => {
    setPairs(items);
    setRightOrder(shuffle(items.map((p) => p.term)));
    setDone([]);
    setPicked(null);
    setMistakes(0);
    setNote(message);
  };

  // The day's six terms. The same set all day; a new set the next day.
  useEffect(() => {
    startRound(dailyPick(kind, pool, (t) => t.term, 6).items, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, pool]);

  const anotherRound = () => {
    const r = freshPick(kind, pool, (t) => t.term, 6);
    startRound(r.items, r.reset ? "You have seen every term in this section once, so the list starts again." : "");
  };

  const choose = (right: string) => {
    if (!picked) return;
    if (picked === right) {
      setDone((d) => [...d, right]);
      setPicked(null);
    } else {
      setMistakes((m) => m + 1);
      setWrong({ left: picked, right });
      window.setTimeout(() => setWrong(null), 450);
    }
  };

  const finished = pairs.length > 0 && done.length === pairs.length;
  const defOf = (term: string) => pairs.find((p) => p.term === term)?.short ?? "";

  return (
    <section className="pr-panel pr-match" aria-label="Word match">
      <div className="pr-form" style={{ padding: 14 }}>
        <div className="pr-actions">
          <select className="ac-input" aria-label="Choose a section" value={track} onChange={(e) => setTrack(e.target.value as GlossaryTrack | "all")}>
            <option value="all">All sections</option>
            {GLOSSARY_TRACKS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <button type="button" className="btn" onClick={anotherRound}>Another round</button>
        </div>
        <p className="ac-small ac-muted" style={{ margin: "6px 0 0" }}>
          {note || "Today's six terms. A new set appears tomorrow."}
        </p>
        <p className="pr-score">
          <span>Matched {done.length} of {pairs.length}</span>
          <span>Mistakes {mistakes}</span>
        </p>
      </div>

      {pairs.length === 0 ? (
        <p className="ac-empty">No terms available for this section yet.</p>
      ) : finished ? (
        <div className="ac-card" style={{ textAlign: "center" }}>
          <h2 className="ac-h2">Round complete</h2>
          <p className="ac-muted">{mistakes === 0 ? "No mistakes. Excellent." : `${mistakes} mistake${mistakes === 1 ? "" : "s"}. Review the terms you missed.`}</p>
          <button type="button" className="btn btn-primary" onClick={anotherRound}>Another round</button>
        </div>
      ) : (
        <div className="pr-match-cols">
          <div className="pr-match-col">
            <p className="ac-small ac-muted" style={{ margin: 0 }}>Terms</p>
            {pairs.map((p) => {
              const isDone = done.includes(p.term);
              return (
                <button
                  key={p.term}
                  type="button"
                  className={`pr-pair${isDone ? " pr-pair--done" : ""}${picked === p.term ? " pr-pair--picked" : ""}`}
                  disabled={isDone}
                  onClick={() => setPicked(p.term)}
                >
                  {p.term}
                </button>
              );
            })}
          </div>
          <div className="pr-match-col">
            <p className="ac-small ac-muted" style={{ margin: 0 }}>Definitions</p>
            {rightOrder.map((term) => {
              const isDone = done.includes(term);
              const isWrong = wrong?.right === term;
              return (
                <button
                  key={term}
                  type="button"
                  className={`pr-pair${isDone ? " pr-pair--done" : ""}${isWrong ? " pr-pair--wrong" : ""}`}
                  disabled={isDone || !picked}
                  onClick={() => choose(term)}
                >
                  {defOf(term)}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {!picked && pairs.length > 0 && !finished ? <p className="ac-small ac-muted">Choose a term, then its definition.</p> : null}
    </section>
  );
}

// ------------------------------------------------------------------ puzzle

const NEIGHBOURS = (i: number) => {
  const r = Math.floor(i / 3);
  const c = i % 3;
  const out: number[] = [];
  if (r > 0) out.push(i - 3);
  if (r < 2) out.push(i + 3);
  if (c > 0) out.push(i - 1);
  if (c < 2) out.push(i + 1);
  return out;
};

function scrambled(): number[] {
  const board = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  let blank = 8;
  let prev = -1;
  for (let k = 0; k < 160; k++) {
    const options = NEIGHBOURS(blank).filter((n) => n !== prev);
    const n = options[Math.floor(Math.random() * options.length)]!;
    board[blank] = board[n]!;
    board[n] = 0;
    prev = blank;
    blank = n;
  }
  return board;
}

/** The day's picture. A new picture each day, not one shown before until the library is used up. */
function PicturePuzzle() {
  const content = useAcademyContent();
  const pictures = content.pictures;
  const [picture, setPicture] = useState<PictureEntry | null>(null);
  const [note, setNote] = useState("");
  const [board, setBoard] = useState<number[]>(() => scrambled());
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    setPicture(dailyPick("puzzle", pictures, (p) => p.src, 1).items[0] ?? null);
    setNote("");
    setBoard(scrambled());
    setMoves(0);
  }, [pictures]);

  const solved = board.every((v, i) => v === (i + 1) % 9);

  const move = (index: number) => {
    if (solved) return;
    const blank = board.indexOf(0);
    if (!NEIGHBOURS(blank).includes(index)) return;
    const next = [...board];
    next[blank] = next[index]!;
    next[index] = 0;
    setBoard(next);
    setMoves((m) => m + 1);
  };

  const anotherPicture = () => {
    const r = freshPick("puzzle", pictures, (p) => p.src, 1);
    setPicture(r.items[0] ?? null);
    setNote(r.reset ? "You have seen every picture once, so the library starts again." : "");
    setBoard(scrambled());
    setMoves(0);
  };

  if (!picture) return <p className="ac-empty">No pictures available yet.</p>;

  return (
    <section className="pr-panel pr-puzzle" aria-label="Picture puzzle">
      <p className="pr-score">
        <span>{picture.label}</span>
        <span>Moves {moves}</span>
      </p>
      <img className="pr-ref" src={picture.src} alt={`Target picture: ${picture.label}`} loading="lazy" />
      <div className="pr-board" role="grid" aria-label="Sliding puzzle">
        {board.map((v, i) =>
          v === 0 ? (
            <div key={i} className="pr-tile pr-tile--blank" aria-hidden="true" />
          ) : (
            <button
              key={i}
              type="button"
              className={`pr-tile${solved ? " pr-tile--solved" : ""}`}
              aria-label={`Tile ${v}`}
              onClick={() => move(i)}
              style={{
                backgroundImage: `url("${picture.src}")`,
                backgroundSize: "300% 300%",
                backgroundPosition: `${((v - 1) % 3) * 50}% ${Math.floor((v - 1) / 3) * 50}%`,
              }}
            />
          ),
        )}
      </div>
      <p className="pr-caption">
        {solved ? `Solved in ${moves} moves.` : "Slide the tiles into order. The picture is the target."}
      </p>
      {note ? <p className="ac-small ac-muted">{note}</p> : null}
      <div className="pr-actions">
        <button type="button" className="btn btn-primary" onClick={anotherPicture}>Another picture</button>
        <button type="button" className="btn" onClick={() => { setBoard(scrambled()); setMoves(0); }}>Reshuffle this picture</button>
      </div>
      <p className="pr-caption">{picture.credit}</p>
    </section>
  );
}
