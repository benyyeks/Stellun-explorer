import { shuffleWith } from "./rhythm";
import { distractorsFor, type ItemContext } from "./validate";
import { TRACK_IDS, type ExplainItem, type FlashcardItem, type HomeworkItem, type NewTermItem, type PackTerm, type PairItem, type PlanContext, type QuizItem, type TrackId } from "./types";

/**
 * Built without AI from the knowledge base. Used when the model is unavailable,
 * its reply is not usable, or a type was not asked for. Each item is checked the same way.
 */

const mentionsIn = (text: string, term: string) => text.toLowerCase().includes(term.toLowerCase());

export function builtQuiz(
  pack: PackTerm[],
  ctx: ItemContext,
  want: number,
  distract: (t: PackTerm) => string[] | null,
  rand: () => number,
): QuizItem[] {
  const out: QuizItem[] = [];
  for (const term of pack) {
    if (out.length === want) break;
    if (ctx.taken.has(term.id) || mentionsIn(term.short, term.term)) continue;
    const others = distract(term);
    if (!others) continue;
    const choices = shuffleWith(rand, [term.term, ...others]);
    out.push({
      id: `q${out.length + 1}`,
      term_id: term.id,
      term: term.term,
      track: term.track,
      category: term.category,
      style: "definition",
      prompt: `Which term matches this description: "${term.short}"?`,
      choices,
      answer: choices.indexOf(term.term),
      explain: term.detail || term.short,
    });
    ctx.taken.add(term.id);
  }
  return out;
}

export function builtFlashcards(pack: PackTerm[], ctx: ItemContext, want: number): FlashcardItem[] {
  const out: FlashcardItem[] = [];
  for (const term of pack) {
    if (out.length === want) break;
    if (ctx.taken.has(term.id)) continue;
    out.push({ id: `f-${term.id}`, term_id: term.id, term: term.term, track: term.track, front: `What is ${term.term}?`, back: term.short, detail: term.detail });
    ctx.taken.add(term.id);
  }
  return out;
}

export function builtWordMatch(pack: PackTerm[], ctx: ItemContext, want: number): PairItem[] {
  const out: PairItem[] = [];
  for (const term of pack) {
    if (out.length === want) break;
    if (ctx.taken.has(term.id)) continue;
    out.push({ term_id: term.id, term: term.term, track: term.track, short: term.short });
    ctx.taken.add(term.id);
  }
  return out;
}

export function builtNewTerms(pack: PackTerm[], ctx: ItemContext, want: number, labelOf: (t: TrackId) => string): NewTermItem[] {
  const out: NewTermItem[] = [];
  for (const term of pack) {
    if (out.length === want) break;
    if (ctx.taken.has(term.id)) continue;
    out.push({ term_id: term.id, term: term.term, track: term.track, short: term.short, detail: term.detail, why: `Part of ${labelOf(term.track)}. A useful term to learn next.` });
    ctx.taken.add(term.id);
  }
  return out;
}

/** A short assignment from the learner's open checklist items, or from terms when there are none. */
export function builtHomework(ctx: PlanContext, pack: PackTerm[], date: string): HomeworkItem {
  const ws = ctx.workspaces[0];
  const track = pack[0]?.track ?? ctx.profile.tracks[0] ?? TRACK_IDS[2]!;
  const fromChecklist = ws ? ws.openItems.slice(0, 3).map((item) => `Explain in your own words: ${item}`) : [];
  const fromTerms = pack.slice(0, 2).map((t) => `Explain ${t.term} and give one example of where it is used.`);
  const parts = (fromChecklist.length >= 2 ? fromChecklist : [...fromChecklist, ...fromTerms]).slice(0, 3);
  return {
    title: ws ? `Practice: ${ws.title}` : `Practice for ${date}`,
    track,
    instructions: "Answer each part in two or three sentences, in your own words.",
    parts: parts.length >= 2 ? parts : ["Explain one key idea from this week's work.", "Give one example that uses it."],
    model_answer: "Key points: " + pack.slice(0, 3).map((t) => `${t.term}: ${t.short}`).join(" "),
  };
}

/** Explanation of one answer, built from the knowledge base. Used when the model gives none. */
export function builtExplanation(it: ExplainItem): string {
  const answer = `${it.term}: ${it.correctShort} ${it.correctDetail}`.trim();
  if (it.correct) return `Correct. ${answer}`;
  if (!it.chosen) return `This question was not answered. The answer is ${answer}`;
  const chosen = it.chosenShort ? `${it.chosen}: ${it.chosenShort}` : it.chosen;
  return `You chose ${chosen}, which does not match this description. The answer is ${answer}`;
}

export { distractorsFor };
