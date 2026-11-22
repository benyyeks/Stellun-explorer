/**
 * Academy content: books, pictures, and terminology.
 *
 * Reads each list from its Supabase table (see supabase/academy/001_academy_content.sql).
 * If a table is missing, empty, or unreachable, the bundled data is used, so the
 * Academy always works. To add books or pictures later, insert rows in Supabase.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BOOKS, bookCoverUrl, type Book } from "@/lib/books";
import { GLOSSARY, type GlossaryCategory, type GlossaryEntry } from "@/lib/glossary";
import { ACADEMY_ART, type ArtPiece } from "@/lib/academy-art";

export type ShelfBook = Book & { cover: string };
export type AcademyContent = { books: ShelfBook[]; pictures: ArtPiece[]; terms: GlossaryEntry[] };

const BUNDLED: AcademyContent = {
  books: BOOKS.map((b) => ({ ...b, cover: bookCoverUrl(b.isbn13) })),
  pictures: ACADEMY_ART,
  terms: GLOSSARY,
};

type Row = Record<string, unknown>;
type Db = { from: (table: string) => { select: (cols: string) => Promise<{ data: Row[] | null; error: unknown }> } };

async function fetchRows(table: string): Promise<Row[] | null> {
  try {
    const db = supabase as unknown as Db;
    const { data, error } = await db.from(table).select("*");
    if (error || !data || data.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

const text = (v: unknown) => (typeof v === "string" ? v : "");
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function mapBook(r: Row): ShelfBook {
  const isbn = text(r["isbn13"]);
  return {
    id: text(r["id"]),
    title: text(r["title"]),
    authors: text(r["authors"]),
    isbn13: isbn,
    topic: text(r["topic"]) as Book["topic"],
    note: text(r["note"]),
    freeUrl: text(r["free_url"]) || undefined,
    freeLabel: text(r["free_label"]) || undefined,
    cover: text(r["cover_url"]) || bookCoverUrl(isbn),
  } as ShelfBook;
}

function mapPicture(r: Row): ArtPiece {
  return {
    slug: text(r["slug"]),
    label: text(r["title"]),
    src: text(r["url"]),
    credit: text(r["credit"]),
    tags: list(r["tags"]),
  };
}

function mapTerm(r: Row): GlossaryEntry {
  const entry: GlossaryEntry = {
    term: text(r["term"]),
    category: text(r["category"]) as GlossaryCategory,
    short: text(r["short"]),
    detail: text(r["detail"]),
  };
  if (text(r["symbol"])) entry.symbol = text(r["symbol"]);
  if (text(r["units"])) entry.units = text(r["units"]);
  const aka = list(r["aka"]);
  if (aka.length) entry.aka = aka;
  return entry;
}

/** The Academy's books, pictures, and terms. Starts with bundled data, then switches to Supabase when it loads. */
export function useAcademyContent(): AcademyContent & { ready: boolean } {
  const [state, setState] = useState<AcademyContent & { ready: boolean }>({ ...BUNDLED, ready: false });

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [books, pictures, terms] = await Promise.all([
        fetchRows("academy_books"),
        fetchRows("academy_pictures"),
        fetchRows("academy_terms"),
      ]);
      if (!alive) return;
      setState({
        books: books ? books.map(mapBook) : BUNDLED.books,
        pictures: pictures ? pictures.map(mapPicture) : BUNDLED.pictures,
        terms: terms ? terms.map(mapTerm) : BUNDLED.terms,
        ready: true,
      });
    })();
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
