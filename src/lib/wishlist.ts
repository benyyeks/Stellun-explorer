// The personal reading list for the textbook shelf. Signed out, it is stored
// in the browser so it survives reloads without an account. Signed in, it is
// kept in the user's account and follows them across devices, with anything
// saved beforehand merged up on the first authenticated load. The list can
// also be shared as a link (book ids in the URL) or exported to a small JSON
// file and imported again later.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { runWrite } from "@/lib/supabase-write";


export type WishlistEntry = { id: string; addedAt: number; note?: string };

const KEY = "stellun:reading-list";
const MAX_BOOKS = 30;
export const MAX_NOTE = 1200;

// Payload shape of an exported list. The app tag lets us recognize our own
// files on import; a bare array of ids or { id } entries is accepted too.
export const WISHLIST_FILE_APP = "stellun-reading-list";

function isEntry(v: unknown): v is WishlistEntry {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as WishlistEntry).id === "string"
  );
}

function read(): WishlistEntry[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry);
  } catch {
    return [];
  }
}

function write(next: WishlistEntry[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

// Serializes the list for export. Titles and authors are looked up and
// included so the file reads as a plain reading list outside the app too.
export function serializeWishlist(
  entries: WishlistEntry[],
  lookup: (id: string) => { title: string; authors: string } | undefined
): string {
  const books = entries.map((e) => {
    const b = lookup(e.id);
    const note = e.note ? { note: e.note } : {};
    return b
      ? { id: e.id, title: b.title, authors: b.authors, ...note }
      : { id: e.id, ...note };
  });
  return JSON.stringify(
    {
      app: WISHLIST_FILE_APP,
      version: 1,
      exportedAt: new Date().toISOString(),
      books,
    },
    null,
    2
  );
}

// Validates an imported file against the known shelf ids. Returns the ids to
// merge; throws a plain-language error when the file is unusable.
export function parseWishlistFile(text: string, validIds: Set<string>): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  const list: unknown = Array.isArray(parsed)
    ? parsed
    : (parsed as { books?: unknown })?.books;
  if (!Array.isArray(list)) {
    throw new Error("That file does not contain a reading list.");
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const id =
      typeof item === "string"
        ? item.trim()
        : String((item as { id?: unknown })?.id ?? "").trim();
    if (!validIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  if (out.length === 0) {
    throw new Error("No recognizable books were found in that file.");
  }
  return out;
}

// Share links carry the short internal book ids, comma separated.
export function encodeShareParam(ids: string[]): string {
  return ids.join(",");
}

export function decodeShareParam(raw: string, validIds: Set<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (!validIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_BOOKS) break;
  }
  return out;
}

export function useWishlist() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [entries, setEntries] = useState<WishlistEntry[]>([]);
  const mergedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      mergedFor.current = null;
      setEntries(read());
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("reading_list")
        .select("book_id, added_at, note")
        .order("added_at", { ascending: false });
      if (!active) return;
      const cloud: WishlistEntry[] = (data ?? []).map((r) => ({
        id: r.book_id,
        addedAt: new Date(r.added_at).getTime(),
        ...(r.note ? { note: r.note } : {}),
      }));
      const local = read();
      const pending = local.filter((l) => !cloud.some((c) => c.id === l.id));
      if (mergedFor.current !== userId && pending.length > 0) {
        mergedFor.current = userId;
        await supabase.from("reading_list").upsert(
          pending.map((p) => ({
            user_id: userId,
            book_id: p.id,
            note: p.note ?? null,
          })),
          { onConflict: "user_id,book_id" }
        );
      } else {
        mergedFor.current = userId;
      }
      if (!active) return;
      setEntries([...cloud, ...pending].slice(0, MAX_BOOKS));
    })().catch(() => {
      if (active) setEntries(read());
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const toggle = useCallback(
    (id: string) => {
      setEntries((prev) => {
        const exists = prev.some((e) => e.id === id);
        const next = exists
          ? prev.filter((e) => e.id !== id)
          : [{ id, addedAt: Date.now() }, ...prev].slice(0, MAX_BOOKS);
        if (userId) {
          runWrite(
            exists
              ? supabase
                  .from("reading_list")
                  .delete()
                  .eq("user_id", userId)
                  .eq("book_id", id)
              : supabase
                  .from("reading_list")
                  .upsert({ user_id: userId, book_id: id }, { onConflict: "user_id,book_id" }),
            "Reading list"
          );
        } else {
          write(next);
        }
        return next;
      });
    },
    [userId]
  );

  // Merge imported or shared ids into the saved list. Returns how many books
  // were actually added; entries already saved are left untouched.
  const importMany = useCallback(
    (ids: string[]): number => {
      let added = 0;
      setEntries((prev) => {
        const existing = new Set(prev.map((e) => e.id));
        const fresh = ids
          .filter((id) => !existing.has(id))
          .map((id) => ({ id, addedAt: Date.now() }));
        const next = [...prev, ...fresh].slice(0, MAX_BOOKS);
        added = next.length - prev.length;
        if (userId) {
          if (fresh.length > 0) {
            runWrite(
              supabase.from("reading_list").upsert(
                fresh.map((f) => ({ user_id: userId, book_id: f.id })),
                { onConflict: "user_id,book_id" }
              ),
              "Reading list"
            );
          }
        } else {
          write(next);
        }
        return next;
      });
      return added;
    },
    [userId]
  );

  // Study notes for one saved book. Signed out they live in local storage;
  // signed in they are written to the account row and stay private unless the
  // owner explicitly shares notes along with the list.
  const setNote = useCallback(
    (id: string, note: string) => {
      const trimmed = note.slice(0, MAX_NOTE);
      setEntries((prev) => {
        const next: WishlistEntry[] = prev.map((e) => {
          if (e.id !== id) return e;
          const { note: _drop, ...rest } = e;
          return trimmed ? { ...rest, note: trimmed } : rest;
        });
        if (userId) {
          runWrite(
            supabase
              .from("reading_list")
              .upsert(
                { user_id: userId, book_id: id, note: trimmed || null },
                { onConflict: "user_id,book_id" }
              ),
            "Study note"
          );
        } else {
          write(next);
        }
        return next;
      });
    },
    [userId]
  );

  const isSaved = useCallback(
    (id: string) => entries.some((e) => e.id === id),
    [entries]
  );

  return { entries, toggle, importMany, isSaved, setNote, synced: !!userId };
}

