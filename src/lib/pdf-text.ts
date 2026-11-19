/**
 * PDF support for the workspace reader, built on pdf.js.
 *
 * - Text view: selectable text for each page, so passages can be highlighted
 *   and sent to Stellun. Works for normal, text-based PDFs.
 * - Pages view: each page drawn as an image. Works for scanned PDFs too.
 *
 * This module is loaded only when a PDF is opened, so it does not add weight
 * to other pages.
 */

import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export type PdfDoc = {
  pageCount: number;
  pages: string[];
  hasText: boolean;
  render: (pageNo: number, canvas: HTMLCanvasElement, cssWidth: number) => Promise<void>;
  destroy: () => void;
};

type TextItem = { str?: unknown; hasEOL?: unknown };

export async function openPdf(file: File): Promise<PdfDoc> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;

  const pages: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    let text = "";
    for (const item of content.items as TextItem[]) {
      if (typeof item.str !== "string") continue;
      text += item.str;
      text += item.hasEOL ? "\n" : " ";
    }
    pages.push(text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim());
  }

  return {
    pageCount: doc.numPages,
    pages,
    hasText: pages.some((p) => p.replace(/\s/g, "").length > 20),

    async render(pageNo, canvas, cssWidth) {
      const page = await doc.getPage(pageNo);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const base = page.getViewport({ scale: 1 });
      const scale = cssWidth / base.width;
      const viewport = page.getViewport({ scale: scale * dpr });

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("This browser cannot draw the page.");
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    },

    destroy() {
      void doc.destroy();
    },
  };
}
