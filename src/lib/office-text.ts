/**
 * Text from Word (.docx) and PowerPoint (.pptx) files, read in the browser.
 *
 * Both formats are zip archives of XML. We read the central directory, decompress
 * only the entries we need (built-in DecompressionStream), and collect text nodes.
 * Output is plain text. Nothing from the file is executed, rendered as HTML,
 * or evaluated.
 */

export type OfficeSource = { label: string; text: string };
export type OfficeText = { text: string; sources: OfficeSource[] };

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_ENTRY_BYTES = 20 * 1024 * 1024;

type Entry = { name: string; method: number; compSize: number; localOffset: number; size: number };

function readCentralDirectory(bytes: Uint8Array): Entry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // The end-of-central-directory record sits within the last 64 KB of the file.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("This file is not a valid Office document.");

  const count = view.getUint16(eocd + 10, true);
  const dirOffset = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder("utf-8");
  const entries: Entry[] = [];
  let p = dirOffset;
  for (let n = 0; n < count; n++) {
    if (p + 46 > bytes.length || view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const size = view.getUint32(p + 24, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    entries.push({ name, method, compSize, localOffset, size });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot open Office files yet. Try a current version of Chrome, Edge, Safari, or Firefox.");
  }
  const stream = new Blob([data.slice()]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readEntry(bytes: Uint8Array, entry: Entry): Promise<Uint8Array> {
  if (entry.size > MAX_ENTRY_BYTES) throw new Error("This file contains a part that is too large to read.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const lp = entry.localOffset;
  if (view.getUint32(lp, true) !== 0x04034b50) throw new Error("This file is damaged and cannot be read.");
  const nameLen = view.getUint16(lp + 26, true);
  const extraLen = view.getUint16(lp + 28, true);
  const start = lp + 30 + nameLen + extraLen;
  const raw = bytes.subarray(start, start + entry.compSize);
  if (entry.method === 0) return raw;
  if (entry.method === 8) return inflateRaw(raw);
  throw new Error("This file uses a compression method that cannot be read.");
}

async function openArchive(buffer: ArrayBuffer): Promise<{ entries: Entry[]; bytes: Uint8Array }> {
  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new Error("That file is larger than 25 MB. Export a smaller part of it and try again.");
  }
  const bytes = new Uint8Array(buffer);
  return { entries: readCentralDirectory(bytes), bytes };
}

async function readText(bytes: Uint8Array, entries: Entry[], name: string): Promise<string | null> {
  const entry = entries.find((e) => e.name === name);
  if (!entry) return null;
  const data = await readEntry(bytes, entry);
  return new TextDecoder("utf-8").decode(data);
}

/** Paragraphs of an XML part, using the given paragraph and text tag names. */
function paragraphsOf(xml: string, paragraphTag: string, textTag: string): string[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("This file contains text that could not be read.");
  }
  const out: string[] = [];
  for (const para of Array.from(doc.getElementsByTagName(paragraphTag))) {
    const pieces: string[] = [];
    for (const node of Array.from(para.getElementsByTagName(textTag))) {
      pieces.push(node.textContent ?? "");
    }
    const line = pieces.join("").replace(/\s+/g, " ").trim();
    if (line) out.push(line);
  }
  return out;
}

/** Text of a Word document, one paragraph per line. */
export async function readDocx(buffer: ArrayBuffer): Promise<OfficeText> {
  const { entries, bytes } = await openArchive(buffer);
  const xml = await readText(bytes, entries, "word/document.xml");
  if (!xml) throw new Error("This Word file could not be read. Save it again as .docx and try once more.");
  const paragraphs = paragraphsOf(xml, "w:p", "w:t");
  const text = paragraphs.join("\n");
  return { text, sources: [{ label: "Document", text }] };
}

/** Text of a PowerPoint deck, one section per slide. */
export async function readPptx(buffer: ArrayBuffer): Promise<OfficeText> {
  const { entries, bytes } = await openArchive(buffer);
  const slides = entries
    .map((e) => ({ e, m: /^ppt\/slides\/slide(\d+)\.xml$/.exec(e.name) }))
    .filter((x): x is { e: Entry; m: RegExpExecArray } => x.m !== null)
    .sort((a, b) => Number(a.m[1]) - Number(b.m[1]));
  if (slides.length === 0) throw new Error("No slides were found in this file. Save it again as .pptx and try once more.");

  const sources: OfficeSource[] = [];
  for (const { e, m } of slides) {
    const xml = new TextDecoder("utf-8").decode(await readEntry(bytes, e));
    const lines = paragraphsOf(xml, "a:p", "a:t");
    const body = lines.join("\n");
    if (body) sources.push({ label: `Slide ${m[1]}`, text: body });
  }
  const text = sources.map((s) => `Slide ${s.label.replace("Slide ", "")}\n${s.text}`).join("\n\n");
  return { text, sources };
}
