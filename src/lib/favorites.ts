// Bookmarked satellites. Signed out, the list lives in the browser so it
// survives reloads without an account. Signed in, it is kept in the user's
// account and follows them across devices; anything saved before signing in
// is merged up on the first authenticated load. The list can also be
// exported to a small JSON file and imported again later.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { runWrite } from "@/lib/supabase-write";


export type FavoriteSat = { noradId: string; name: string; addedAt: number };
export type FavoriteInput = { noradId: string; name: string };

const KEY = "stellun:favorites";
const MAX_FAVORITES = 30;

// Payload shape of an exported list. The app tag lets us recognize our own
// files on import; a bare array of { noradId, name } entries is accepted too.
export const FAVORITES_FILE_APP = "stellun-saved-satellites";

function isFavoriteEntry(v: unknown): v is FavoriteSat {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as FavoriteSat).noradId === "string" &&
    typeof (v as FavoriteSat).name === "string"
  );
}

function read(): FavoriteSat[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isFavoriteEntry);
  } catch {
    return [];
  }
}

function write(next: FavoriteSat[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

export function serializeFavorites(list: FavoriteSat[]): string {
  return JSON.stringify(
    {
      app: FAVORITES_FILE_APP,
      version: 1,
      exportedAt: new Date().toISOString(),
      satellites: list,
    },
    null,
    2
  );
}

// Validates an imported file: accepts our own export shape or a bare array,
// keeps only well-formed NORAD catalog numbers, and deduplicates entries.
export function parseFavoritesFile(text: string): FavoriteInput[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  const list: unknown = Array.isArray(parsed)
    ? parsed
    : (parsed as { satellites?: unknown })?.satellites;
  if (!Array.isArray(list)) {
    throw new Error("That file does not contain a saved objects list.");
  }
  const seen = new Set<string>();
  const out: FavoriteInput[] = [];
  for (const item of list) {
    const noradId = String((item as { noradId?: unknown })?.noradId ?? "").trim();
    const nameRaw = (item as { name?: unknown })?.name;
    const name = typeof nameRaw === "string" ? nameRaw.trim().slice(0, 80) : "";
    if (!/^\d{1,6}$/.test(noradId) || !name || seen.has(noradId)) continue;
    seen.add(noradId);
    out.push({ noradId, name });
  }
  if (out.length === 0) {
    throw new Error("No recognizable satellite entries were found in that file.");
  }
  return out;
}

export function useFavorites() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [favorites, setFavorites] = useState<FavoriteSat[]>([]);
  const mergedFor = useRef<string | null>(null);

  // Signed out: browser storage. Signed in: the account copy, with any
  // locally saved entries merged up once per session.
  useEffect(() => {
    if (!userId) {
      mergedFor.current = null;
      setFavorites(read());
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("tracker_favorites")
        .select("norad_id, name, added_at")
        .order("added_at", { ascending: false });
      if (!active) return;
      const cloud: FavoriteSat[] = (data ?? []).map((r) => ({
        noradId: r.norad_id,
        name: r.name,
        addedAt: new Date(r.added_at).getTime(),
      }));
      const local = read();
      const pending = local.filter(
        (l) => !cloud.some((c) => c.noradId === l.noradId)
      );
      if (mergedFor.current !== userId && pending.length > 0) {
        mergedFor.current = userId;
        await supabase.from("tracker_favorites").upsert(
          pending.map((p) => ({ user_id: userId, norad_id: p.noradId, name: p.name })),
          { onConflict: "user_id,norad_id" }
        );
      } else {
        mergedFor.current = userId;
      }
      if (!active) return;
      setFavorites([...cloud, ...pending].slice(0, MAX_FAVORITES));
    })().catch(() => {
      if (active) setFavorites(read());
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const toggle = useCallback(
    (sat: FavoriteInput) => {
      setFavorites((prev) => {
        const exists = prev.some((f) => f.noradId === sat.noradId);
        const next = exists
          ? prev.filter((f) => f.noradId !== sat.noradId)
          : [{ ...sat, addedAt: Date.now() }, ...prev].slice(0, MAX_FAVORITES);
        if (userId) {
          runWrite(
            exists
              ? supabase
                  .from("tracker_favorites")
                  .delete()
                  .eq("user_id", userId)
                  .eq("norad_id", sat.noradId)
              : supabase.from("tracker_favorites").upsert(
                  { user_id: userId, norad_id: sat.noradId, name: sat.name },
                  { onConflict: "user_id,norad_id" }
                ),
            "Tracked object"
          );
        } else {
          write(next);
        }
        return next;
      });
    },
    [userId]
  );

  // Merge an imported list into the saved set. Returns how many new objects
  // were actually added; entries already saved are left untouched.
  const importMany = useCallback(
    (sats: FavoriteInput[]): number => {
      let added = 0;
      setFavorites((prev) => {
        const existing = new Set(prev.map((f) => f.noradId));
        const fresh = sats
          .filter((s) => !existing.has(s.noradId))
          .map((s) => ({ ...s, addedAt: Date.now() }));
        const next = [...prev, ...fresh].slice(0, MAX_FAVORITES);
        added = next.length - prev.length;
        if (userId) {
          if (fresh.length > 0) {
            runWrite(
              supabase.from("tracker_favorites").upsert(
                fresh.map((f) => ({ user_id: userId, norad_id: f.noradId, name: f.name })),
                { onConflict: "user_id,norad_id" }
              ),
              "Tracked objects"
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

  const isFavorite = useCallback(
    (noradId: string) => favorites.some((f) => f.noradId === noradId),
    [favorites]
  );

  return { favorites, toggle, importMany, isFavorite, synced: !!userId };
}

