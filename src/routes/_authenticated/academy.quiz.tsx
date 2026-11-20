import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { pickQuizSet, type QuizQuestion } from "@/lib/academy-daily";

/**
 * Quick quiz
 * ----------
 * Three questions drawn from the quiz bank. Each answer shows a short
 * explanation, so the check teaches as well as grades.
 * The score is kept for this session only.
 */

export const Route = createFileRoute("/_authenticated/academy/quiz")({
  head: () => ({
    meta: [
      { title: "Quick quiz · STELLUN Academy" },
      {
        name: "description",
        content: "Short aerospace, astronomy, and aviation checks to reinforce your study.",
      },
    ],
  }),
  component: AcademyQuizPage,
});

type Step = "intro" | "run" | "done";

const TRACK_LABEL: Record<QuizQuestion["track"], string> = {
  aerospace: "Aerospace",
  astronomy: "Astronomy",
  aviation: "Aviation",
  general: "General",
};

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
    <div className="ac-page">
      <header className="ac-hero">
        <div className="ac-hero-copy">
          <span className="ac-kicker">Academy</span>
          <h1 className="ac-title">Quick quiz</h1>
          <p className="ac-hero-sub">
            Three checks across aerospace, astronomy, and aviation. Every answer comes with an explanation.
          </p>
          <div className="ac-hero-actions">
            <Link to="/academy" className="ac-btn ac-btn--ghost">
              Back to dashboard
            </Link>
          </div>
        </div>
        {step !== "intro" && (
          <div className="ac-quiz-dots" aria-label={`Question ${Math.min(index + 1, questions.length)} of ${questions.length}`}>
            {questions.map((q, i) => (
              <span
                key={q.id}
                className={`ac-quiz-dot${i < index || (i === index && step === "done") ? " is-done" : ""}${i === index && step === "run" ? " is-current" : ""}`}
              />
            ))}
          </div>
        )}
      </header>

      {step === "intro" && (
        <section className="ac-card ac-quiz-card">
          <h2 className="ac-h2">Ready when you are</h2>
          <p className="ac-muted">
            Answer each question, then read the short explanation. Your score is kept for this session only.
          </p>
          <div>
            <button type="button" className="ac-btn ac-btn--primary" onClick={() => setStep("run")}>
              Start · {questions.length} questions
            </button>
          </div>
        </section>
      )}

      {step === "run" && current && (
        <section className="ac-card ac-quiz-card">
          <p className="ac-small ac-muted">
            Question {index + 1} of {questions.length} · {TRACK_LABEL[current.track]}
          </p>
          <h2 className="ac-quiz-prompt">{current.prompt}</h2>
          <ul className="ac-quiz-choices">
            {current.choices.map((c, i) => {
              let state = "";
              if (revealed && i === current.answer) state = "is-correct";
              else if (revealed && i === picked && i !== current.answer) state = "is-wrong";
              return (
                <li key={c}>
                  <button
                    type="button"
                    className={`ac-quiz-choice ${state}`}
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
            <div className="ac-quiz-explain">
              <p>{current.explain}</p>
              <button type="button" className="ac-btn ac-btn--primary" onClick={onNext}>
                {index + 1 >= questions.length ? "See score" : "Next question"}
              </button>
            </div>
          )}
        </section>
      )}

      {step === "done" && (
        <section className="ac-card ac-quiz-card ac-quiz-done">
          <p className="ac-kicker">Session score</p>
          <p className="ac-score">
            {score}
            <span>/{questions.length}</span>
          </p>
          <p className="ac-muted">
            {score === questions.length
              ? "Clean pass. Return to your workspaces or try again tomorrow."
              : "Review the explanations once, then continue the checklist in Workspaces."}
          </p>
          <div className="ac-hero-actions">
            <button type="button" className="ac-btn ac-btn--primary" onClick={restart}>
              Try again
            </button>
            <Link to="/academy/desk" className="ac-btn ac-btn--ghost">
              Workspaces
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
