/**
 * PDF support for the workspace reader (pdf.js).
 *
 * Each page is drawn to a canvas, so students read the real page. Alongside
 * it we keep every word with its position on the page. A highlight runs from
 * a start word to a finish word. Positions are fractions of the page (0 to 1),
 * so highlights stay in place at any zoom.
 *
 * Loaded only when a PDF is opened. Takes a Blob, so a stored book reopens
 * after a refresh.
 */

import "./pdf-polyfills";

let pdfWorker: Worker | null = null;

/** One PDF worker per page load. It loads the compatibility fallback before pdf.js. */
function getWorker(): Worker {
  if (!pdfWorker) {
    pdfWorker = new Worker(new URL("./pdf-worker-shim.ts", import.meta.url), { type: "module" });
  }
  return pdfWorker;
}

export type Box = { left: number; top: number; width: number; height: number };
/** A word on the page. `line` groups words that sit on the same printed line. */
export type PdfWord = Box & { text: string; line: number };

export type PdfDoc = {
  pageCount: number;
  pageWords: PdfWord[][];
  /** Plain text of each page, one printed line per row. */
  pageTexts: string[];
  hasText: boolean;
  render: (
    pageNo: number,
    canvas: HTMLCanvasElement,
    cssWidth: number,
  ) => Promise<{ cssWidth: number; cssHeight: number }>;
  destroy: () => void;
};

type RawItem = { str?: unknown; transform?: unknown; width?: unknown; height?: unknown };
type Fragment = { text: string; x: number; top: number; w: number; h: number };

/**
 * Splits a text fragment into words, placing each word inside the fragment's
 * box in proportion to its characters.
 */
function fragmentWords(f: Fragment, pageW: number, pageH: number, line: number): PdfWord[] {
  const out: PdfWord[] = [];
  const total = f.text.length || 1;
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(f.text)) !== null) {
    const startChar = m.index;
    const len = m[0].length;
    const x = f.x + (startChar / total) * f.w;
    const w = (len / total) * f.w;
    out.push({
      text: m[0],
      line,
      left: x / pageW,
      top: f.top / pageH,
      width: w / pageW,
      height: f.h / pageH,
    });
  }
  return out;
}

/** Groups text fragments into printed lines, then returns the words in reading order. */
function buildWords(fragments: Fragment[], pageW: number, pageH: number): PdfWord[] {
  const sorted = [...fragments].sort((a, b) => a.top - b.top || a.x - b.x);
  const rows: Fragment[][] = [];
  for (const f of sorted) {
    const cy = f.top + f.h / 2;
    const row = rows.find((r) => {
      const ref = r[0];
      if (!ref) return false;
      return Math.abs(ref.top + ref.h / 2 - cy) < Math.min(ref.h, f.h) * 0.6;
    });
    if (row) row.push(f);
    else rows.push([f]);
  }
  rows.sort((a, b) => (a[0]?.top ?? 0) - (b[0]?.top ?? 0));

  const words: PdfWord[] = [];
  rows.forEach((row, line) => {
    row.sort((a, b) => a.x - b.x);
    for (const f of row) words.push(...fragmentWords(f, pageW, pageH, line));
  });
  return words;
}

/** Words grouped by printed line, joined into plain text. */
function linesToText(words: PdfWord[]): string {
  const lines: string[] = [];
  let current = -1;
  let buf: string[] = [];
  for (const w of words) {
    if (w.line !== current) {
      if (buf.length) lines.push(buf.join(" "));
      buf = [];
      current = w.line;
    }
    buf.push(w.text);
  }
  if (buf.length) lines.push(buf.join(" "));
  return lines.join("\n");
}

export async function openPdf(file: Blob): Promise<PdfDoc> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerPort = getWorker();

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;

  const pageWords: PdfWord[][] = [];
  const pageTexts: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const fragments: Fragment[] = [];
    for (const raw of content.items as RawItem[]) {
      if (typeof raw.str !== "string" || !raw.str.trim()) continue;
      const t = raw.transform as number[];
      const [x, y] = base.convertToViewportPoint(t[4] ?? 0, t[5] ?? 0);
      const h = Math.abs(typeof raw.height === "number" && raw.height > 0 ? raw.height : Math.hypot(t[2] ?? 0, t[3] ?? 0)) || 10;
      const w = typeof raw.width === "number" ? raw.width : 0;
      fragments.push({ text: raw.str, x, top: y - h, w, h });
    }
    const words = buildWords(fragments, base.width, base.height);
    pageWords.push(words);
    pageTexts.push(linesToText(words));
  }

  const totalChars = pageWords.reduce((n, words) => n + words.reduce((m, w) => m + w.text.length, 0), 0);

  let task: { cancel: () => void } | null = null;

  return {
    pageCount: doc.numPages,
    pageWords,
    pageTexts,
    hasText: totalChars > 40,

    async render(pageNo, canvas, cssWidth) {
      task?.cancel();
      const page = await doc.getPage(pageNo);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const base = page.getViewport({ scale: 1 });
      const scale = cssWidth / base.width;
      const viewport = page.getViewport({ scale: scale * dpr });

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const outW = Math.floor(viewport.width / dpr);
      const outH = Math.floor(viewport.height / dpr);
      canvas.style.width = `${outW}px`;
      canvas.style.height = `${outH}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("This browser cannot draw the page.");

      const running = page.render({ canvasContext: ctx, viewport, canvas });
      task = running;
      try {
        await running.promise;
      } catch (err) {
        // A newer page or zoom replaced this one. That is expected, not an error.
        if ((err as { name?: string })?.name !== "RenderingCancelledException") throw err;
      }
      return { cssWidth: outW, cssHeight: outH };
    },

    destroy() {
      void doc.destroy();
    },
  };
}
