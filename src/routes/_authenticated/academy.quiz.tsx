import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { pickQuizSet, type QuizQuestion } from "@/lib/academy-daily";

/**
 * Academy quiz shell (Stage 3)
 * ----------------------------
 * Short multiple-choice set drawn from QUIZ_BANK.
 * Scores stay in component state for this session only.
 */

export const Route = createFileRoute("/_authenticated/academy/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz · STELLUN Academy" },
      {
        name: "description",
        content: "Short aerospace, astronomy, and aviation checks to reinforce study desk work.",
      },
    ],
  }),
  component: AcademyQuizPage,
});

type Step = "intro" | "run" | "done";

function AcademyQuizPage() {
  const questions = useMemo(() => pickQuizSet(3), []);
  const [step, setStep] = useState<Step>("intro");
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const current: QuizQuestion | undefined = questions[index];

  const onChoose = (choiceIndex: number) => {
    if (revealed || !current) return;
    setPicked(choiceIndex);
    setRevealed(true);
    if (choiceIndex === current.answer) setScore((s) => s + 1);
  };

  const onNext = () => {
    if (index + 1 >= questions.length) {
      setStep("done");
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
    setRevealed(false);
  };

  const restart = () => {
    setStep("intro");
    setIndex(0);
    setPicked(null);
    setRevealed(false);
    setScore(0);
  };

  return (
    <div className="academy-quiz">
      <header className="academy-progress-hero glass glass-card">
        <span className="eyebrow">Academy</span>
        <h1 className="academy-progress-title">Quick quiz</h1>
        <p className="muted">
          Three questions from aerospace, astronomy, and aviation. Session score only — nothing is stored yet.
        </p>
        <p style={{ marginTop: 12 }}>
          <Link to="/academy" className="btn btn-ghost btn-sm">
            Back to dashboard
          </Link>
        </p>
      </header>

      {step === "intro" && (
        <section className="glass glass-card academy-quiz-panel">
          <p>
            Use this after a Study desk session. Answers show a short explanation so the check teaches, not only grades.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => setStep("run")}>
            Start · {questions.length} questions
          </button>
        </section>
      )}

      {step === "run" && current && (
        <section className="glass glass-card academy-quiz-panel">
          <p className="muted small">
            Question {index + 1} of {questions.length} · {current.track}
          </p>
          <h2 className="academy-quiz-prompt">{current.prompt}</h2>
          <ul className="academy-quiz-choices">
            {current.choices.map((c, i) => {
              let state = "";
              if (revealed && i === current.answer) state = "is-correct";
              else if (revealed && i === picked && i !== current.answer) state = "is-wrong";
              return (
                <li key={c}>
                  <button
                    type="button"
                    className={`academy-quiz-choice ${state}`}
                    onClick={() => onChoose(i)}
                    disabled={revealed}
                  >
                    {c}
                  </button>
                </li>
              );
            })}
          </ul>
          {revealed && (
            <div className="academy-quiz-explain">
              <p className="muted">{current.explain}</p>
              <button type="button" className="btn btn-primary" onClick={onNext}>
                {index + 1 >= questions.length ? "See score" : "Next"}
              </button>
            </div>
          )}
        </section>
      )}

      {step === "done" && (
        <section className="glass glass-card academy-quiz-panel">
          <h2 className="academy-sec">Session score</h2>
          <p className="academy-metric">
            {score}/{questions.length}
          </p>
          <p className="muted">
            {score === questions.length
              ? "Clean pass — return to the desk or try again tomorrow."
              : "Review the explanations once, then continue the checklist on Study desk."}
          </p>
          <div className="academy-quiz-actions">
            <button type="button" className="btn btn-primary" onClick={restart}>
              Try again
            </button>
            <Link to="/academy/desk" className="btn btn-ghost">
              Study desk
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
