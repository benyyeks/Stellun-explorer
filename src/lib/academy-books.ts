/**
 * System book catalogue for the Academy shelf.
 * Primary source: public.academy_books in Supabase.
 * Fallback: local CATALOG so the shelf never goes empty offline.
 * User-uploaded files are NOT here — they live in IndexedDB (book-library.ts).
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CATALOG, type CatalogBook } from "@/lib/book-catalog";

export type AcademyBookRow = {
  id: string;
  title: string;
  authors: string;
  isbn13: string;
  topic: string;
  note: string;
  free_url: string | null;
  free_label: string | null;
  cover_url: string | null;
};

/** Map a Supabase row into the richer CatalogBook shape used by the UI. */
export function rowToCatalog(row: AcademyBookRow): CatalogBook {
  const track = (row.topic || "stem") as CatalogBook["tracks"][number];
  return {
    id: row.id,
    title: row.title,
    authors: row.authors || "",
    tracks: [track],
    level: "intermediate",
    audience: "technical",
    summary: row.note || "",
    covers: [],
    whoFor: "",
    studyTips: [],
    isbn13: row.isbn13 || undefined,
    free:
      row.free_url && row.free_label
        ? { url: row.free_url, label: row.free_label }
        : undefined,
    related: [],
  };
}

export function coverFromRow(row: AcademyBookRow | CatalogBook): string | null {
  if ("cover_url" in row && row.cover_url) return row.cover_url;
  const isbn = "isbn13" in row ? row.isbn13 : undefined;
  if (isbn) {
    return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
  }
  return null;
}

/**
 * Loads the catalogue from Supabase.
 * If the table is empty or the request fails, falls back to the local CATALOG.
 */
export async function fetchAcademyBooks(): Promise<CatalogBook[]> {
  try {
    const { data, error } = await supabase
      .from("academy_books")
      .select(
        "id, title, authors, isbn13, topic, note, free_url, free_label, cover_url",
      )
      .order("title", { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return CATALOG;

    return (data as AcademyBookRow[]).map(rowToCatalog);
  } catch (err) {
    console.warn("academy_books: using local catalogue", err);
    return CATALOG;
  }
}

/** React hook for shelf / recommendations. */
export function useAcademyBooks() {
  const [books, setBooks] = useState<CatalogBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await fetchAcademyBooks();
        if (alive) {
          setBooks(list);
          setError(null);
        }
      } catch (e) {
        if (alive) {
          setBooks(CATALOG);
          setError(e instanceof Error ? e.message : "Could not load books");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { books, loading, error };
  }
