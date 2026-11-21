/**
 * The PDF worker entry. Adds the compatibility fallbacks, then loads pdf.js's
 * own worker. Runs in its own browser context, so the fallbacks must live here too.
 */
import "./pdf-polyfills";
import "pdfjs-dist/build/pdf.worker.min.mjs";
