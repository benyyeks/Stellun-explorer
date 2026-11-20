/**
 * PDF support for the workspace reader (pdf.js).
 *
 * Each page is drawn to a canvas, so the student reads the real page.
 * Alongside it we keep every text line with its exact position on the page.
 * That lets a student tap a line on the page to highlight it, without the
 * phone's native text-selection menu appearing. Positions are stored as
 * fractions of the page (0 to 1), so highlights scale with the zoom level.
 *
 * This module is loaded only when a PDF is opened.
 */

import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export type Box = { left: number; top: number; width: number; height: number };
export type PdfLine = Box & { text: string };

export type PdfDoc = {
  pageCount: number;
  pageLines: PdfLine[][];
  hasText: boolean;
  render: (
    pageNo: number,
    canvas: HTMLCanvasElement,
    cssWidth: number,
  ) => Promise<{ cssWidth: number; cssHeight: number }>;
  destroy: () => void;
};

type RawItem = { str?: unknown; transform?: unknown; width?: unknown; height?: unknown };
type Word = { text: string; x: number; top: number; w: number; h: number };

/** Groups positioned words into lines, in reading order. */
function groupIntoLines(words: Word[], pageW: number, pageH: number): PdfLine[] {
  const sorted = [...words].sort((a, b) => a.top - b.top || a.x - b.x);
  const rows: Word[][] = [];
  for (const word of sorted) {
    const cy = word.top + word.h / 2;
    const row = rows.find((r) => {
      const ref = r[0];
      if (!ref) return false;
      const refCy = ref.top + ref.h / 2;
      return Math.abs(refCy - cy) < Math.min(ref.h, word.h) * 0.6;
    });
    if (row) row.push(word);
    else rows.push([word]);
  }

  const lines: PdfLine[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    let text = "";
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    let prevRight = 0;
    row.forEach((word, i) => {
      const gap = i === 0 ? 0 : word.x - prevRight;
      text += i > 0 && gap > word.h * 0.15 ? ` ${word.text}` : word.text;
      left = Math.min(left, word.x);
      top = Math.min(top, word.top);
      right = Math.max(right, word.x + word.w);
      bottom = Math.max(bottom, word.top + word.h);
      prevRight = word.x + word.w;
    });
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) continue;
    lines.push({
      text: clean,
      left: left / pageW,
      top: top / pageH,
      width: (right - left) / pageW,
      height: (bottom - top) / pageH,
    });
  }
  return lines.sort((a, b) => a.top - b.top || a.left - b.left);
}

export async function openPdf(file: File): Promise<PdfDoc> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;

  const pageLines: PdfLine[][] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const words: Word[] = [];
    for (const raw of content.items as RawItem[]) {
      if (typeof raw.str !== "string" || !raw.str.trim()) continue;
      const t = raw.transform as number[];
      const [x, y] = base.convertToViewportPoint(t[4] ?? 0, t[5] ?? 0);
      const h = Math.abs(typeof raw.height === "number" && raw.height > 0 ? raw.height : Math.hypot(t[2] ?? 0, t[3] ?? 0)) || 10;
      const w = typeof raw.width === "number" ? raw.width : 0;
      words.push({ text: raw.str, x, top: y - h, w, h });
    }
    pageLines.push(groupIntoLines(words, base.width, base.height));
  }

  const totalChars = pageLines.reduce(
    (n, lines) => n + lines.reduce((m, l) => m + l.text.length, 0),
    0,
  );

  let task: { cancel: () => void } | null = null;

  return {
    pageCount: doc.numPages,
    pageLines,
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
