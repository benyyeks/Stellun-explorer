/**
 * Chooses the part of a book that is sent to Stellun with each question.
 *
 * - Specific questions ("explain Kepler's third law") get the passages whose
 *   words best match the question.
 * - Overview questions ("list the key terms", "summarise", "define") get
 *   passages spread across the whole book, so every chapter has a chance.
 *
 * The excerpt is limited in size. It is data for the answer, never instructions.
 */

export type BookSource = { label: string; text: string };

type Chunk = { label: string; text: string; terms: Set<string> };

const CHUNK_CHARS = 900;
export const EXCERPT_CHARS = 8000;

const STOP = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "any", "can", "had", "her", "was", "one", "our",
  "out", "his", "has", "its", "who", "how", "why", "what", "when", "where", "which", "with", "from", "this",
  "that", "they", "them", "then", "than", "into", "about", "also", "does", "did", "have", "been", "were",
  "will", "would", "could", "should", "there", "their", "these", "those", "your", "book", "passage", "text",
  "explain", "define", "describe", "list", "tell", "give", "show", "make", "please", "help", "need", "want",
  "mean", "means", "meaning", "term", "terms", "sure", "just", "like", "more", "most", "some", "such",
]);

const OVERVIEW = /\b(key terms?|terms?|define|definitions?|glossary|summar(?:y|ise|ize|ies)|overview|main (?:points?|ideas?)|list|outline|topics|chapters?|what is (?:this|the) (?:book|document|file|text)|what (?:is|does) (?:the|this) (?:book|document|text) (?:about|cover))\b/i;

function termsOf(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/** Splits each source into chunks of about CHUNK_CHARS, breaking at spaces. */
function chunksOf(sources: BookSource[]): Chunk[] {
  const out: Chunk[] = [];
  for (const src of sources) {
    const clean = src.text.replace(/[ \t]+/g, " ").trim();
    if (!clean) continue;
    let rest = clean;
    while (rest.length > 0) {
      let cut = rest.length;
      if (rest.length > CHUNK_CHARS) {
        const space = rest.lastIndexOf(" ", CHUNK_CHARS);
        cut = space > CHUNK_CHARS * 0.6 ? space : CHUNK_CHARS;
      }
      const text = rest.slice(0, cut).trim();
      rest = rest.slice(cut).trim();
      if (text) out.push({ label: src.label, text, terms: new Set(termsOf(text)) });
    }
  }
  return out;
}

export type BookIndex = { chunks: Chunk[] };

export function indexBook(sources: BookSource[]): BookIndex {
  return { chunks: chunksOf(sources) };
}

/** The excerpt to send with a question. Empty when the book has no readable text. */
export function buildExcerpt(question: string, index: BookIndex, maxChars = EXCERPT_CHARS): string {
  const chunks = index.chunks;
  if (chunks.length === 0) return "";

  let picked: Chunk[] = [];
  if (!OVERVIEW.test(question)) {
    const wanted = new Set(termsOf(question));
    if (wanted.size > 0) {
      const scored = chunks
        .map((c, i) => {
          let hits = 0;
          wanted.forEach((t) => {
            if (c.terms.has(t)) hits += 1;
          });
          return { c, i, hits };
        })
        .filter((s) => s.hits > 0)
        .sort((a, b) => b.hits - a.hits || a.i - b.i);

      let total = 0;
      for (const s of scored) {
        if (total + s.c.text.length > maxChars) break;
        picked.push(s.c);
        total += s.c.text.length;
        if (picked.length >= 10) break;
      }
    }
  }

  if (picked.length === 0) {
    // Overview question, or no matching words: spread the excerpt across the book.
    const slots = Math.max(1, Math.floor(maxChars / CHUNK_CHARS));
    const step = Math.max(1, Math.ceil(chunks.length / slots));
    for (let i = 0; i < chunks.length; i += step) picked.push(chunks[i]!);
  }

  // Keep the excerpt in reading order, within the size limit.
  const order = new Map(chunks.map((c, i) => [c, i] as const));
  picked = Array.from(new Set(picked)).sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  let out = "";
  for (const c of picked) {
    const block = `[${c.label}]\n${c.text}\n\n`;
    if (out.length + block.length > maxChars) break;
    out += block;
  }
  return out.trim();
}
