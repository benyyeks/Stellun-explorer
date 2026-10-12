// Local-only study book uploads metadata (no full PDF storage in cloud).
// Users name the book; optional notes/file name help Orbitex AI context.
// File content stays in the browser as a blob URL for reading reference only.

export type UploadedBook = {
  id: string;
  title: string;
  authors: string;
  topicId: string;
  /** Original filename if any */
  fileName?: string;
  /** blob: URL — session only; lost on full cache clear */
  objectUrl?: string;
  addedAt: number;
  notes: string;
};

const KEY = "orbitex:study-uploads";
export const MAX_UPLOADS = 20;
export const MAX_TITLE = 200;

function read(): UploadedBook[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((b) => b && typeof b.id === "string" && typeof b.title === "string");
  } catch {
    return [];
  }
}

function write(list: UploadedBook[]) {
  try {
    // Do not persist objectUrl (invalid after reload)
    const safe = list.map(({ objectUrl: _o, ...rest }) => rest);
    localStorage.setItem(KEY, JSON.stringify(safe.slice(0, MAX_UPLOADS)));
  } catch {
    /* ignore */
  }
}

export function listUploadedBooks(): UploadedBook[] {
  return read();
}

export function addUploadedBook(input: {
  title: string;
  authors?: string;
  topicId: string;
  fileName?: string;
  objectUrl?: string;
}): UploadedBook | null {
  const title = input.title.trim().slice(0, MAX_TITLE);
  if (title.length < 2) return null;
  const list = read();
  if (list.length >= MAX_UPLOADS) return null;
  const book: UploadedBook = {
    id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    authors: (input.authors ?? "").trim().slice(0, 120),
    topicId: input.topicId,
    ...(input.fileName !== undefined ? { fileName: input.fileName } : {}),
    ...(input.objectUrl !== undefined ? { objectUrl: input.objectUrl } : {}),
    addedAt: Date.now(),
    notes: "",
  };
  write([book, ...list]);
  return book;
}

export function removeUploadedBook(id: string) {
  write(read().filter((b) => b.id !== id));
}

export function updateUploadedNotes(id: string, notes: string) {
  write(read().map((b) => (b.id === id ? { ...b, notes: notes.slice(0, 4000) } : b)));
}
