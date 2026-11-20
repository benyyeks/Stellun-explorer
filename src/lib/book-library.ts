/**
 * On-device book library for the workspace reader.
 *
 * Each book file is stored in IndexedDB, not in memory, so it survives a
 * refresh, a new file being opened, or a visit to another page. Each record
 * also keeps the last page and zoom, so reading resumes where it stopped.
 * Files stay on this device. Cross-device sync needs Supabase Storage, which
 * is planned separately.
 */

import { useCallback, useEffect, useState } from "react";

export type BookKind = "pdf" | "text";

export type LibraryBook = {
  id: string;
  workspaceId: string;
  name: string;
  kind: BookKind;
  size: number;
  addedAt: number;
  lastOpenedAt: number;
  lastPage: number;
  zoom: number;
  blob: Blob;
};

const DB_NAME = "stellun-academy";
const STORE = "books";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("This browser cannot keep books on the device."));
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("workspaceId", "workspaceId", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error ?? new Error("Could not open the book library."));
      };
    });
  }
  return dbPromise;
}

/** Runs one request in its own transaction and resolves with its result. */
function run<T>(mode: IDBTransactionMode, make: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = make(tx.objectStore(STORE));
        let value: T | undefined;
        req.onsuccess = () => {
          value = req.result;
        };
        tx.oncomplete = () => resolve(value as T);
        tx.onerror = () => reject(tx.error ?? new Error("Book library error."));
        tx.onabort = () => reject(tx.error ?? new Error("Book library was interrupted."));
      }),
  );
}

export async function listBooks(workspaceId: string): Promise<LibraryBook[]> {
  const rows = await run<LibraryBook[]>("readonly", (store) =>
    store.index("workspaceId").getAll(IDBKeyRange.only(workspaceId)),
  );
  return [...(rows ?? [])].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
}

export async function getBook(id: string): Promise<LibraryBook | undefined> {
  return run<LibraryBook | undefined>("readonly", (store) => store.get(id));
}

async function putBook(book: LibraryBook): Promise<void> {
  await run("readwrite", (store) => store.put(book));
}

export async function deleteBook(id: string): Promise<void> {
  await run("readwrite", (store) => store.delete(id));
}

function makeId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

/** Hook used by the workspace reader. Loads the books for one workspace. */
export function useBookLibrary(workspaceId: string) {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setBooks(await listBooks(workspaceId));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your books.");
    } finally {
      setReady(true);
    }
  }, [workspaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = useCallback(
    async (file: File, kind: BookKind): Promise<LibraryBook> => {
      // Ask the browser to keep this data if storage runs low.
      void navigator.storage?.persist?.().catch(() => undefined);
      const now = Date.now();
      const record: LibraryBook = {
        id: makeId(),
        workspaceId,
        name: file.name,
        kind,
        size: file.size,
        addedAt: now,
        lastOpenedAt: now,
        lastPage: 1,
        zoom: 1,
        blob: file,
      };
      await putBook(record);
      await refresh();
      return record;
    },
    [workspaceId, refresh],
  );

  const savePosition = useCallback(async (id: string, lastPage: number, zoom: number) => {
    const current = await getBook(id);
    if (!current) return;
    await putBook({ ...current, lastPage, zoom, lastOpenedAt: Date.now() });
  }, []);

  const remove = useCallback(
    async (id: string) => {
      await deleteBook(id);
      await refresh();
    },
    [refresh],
  );

  return { books, ready, error, add, savePosition, remove, refresh };
}
