// Export and import controls for the saved-objects list. Export writes a
// small JSON file the user can keep or move between devices; import reads
// such a file back and merges it into the saved set.
import { useRef, useState } from "react";
import {
  parseFavoritesFile,
  serializeFavorites,
  type FavoriteInput,
  type FavoriteSat,
} from "@/lib/favorites";

const MAX_FILE_BYTES = 1_000_000;

export function FavoritesTransfer({
  favorites,
  onImport,
}: {
  favorites: FavoriteSat[];
  onImport: (sats: FavoriteInput[]) => number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const exportFile = () => {
    const blob = new Blob([serializeFavorites(favorites)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stellun-saved-satellites-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    setStatus(`Saved ${favorites.length} ${favorites.length === 1 ? "object" : "objects"} to a file.`);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > MAX_FILE_BYTES) {
        throw new Error("That file is too large to be a saved objects list.");
      }
      const text = await file.text();
      const added = onImport(parseFavoritesFile(text));
      setStatus(
        added === 0
          ? "Every object in that file was already saved."
          : `Imported ${added} new ${added === 1 ? "object" : "objects"}.`
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "That file could not be read.");
    } finally {
      setBusy(false);
      // Reset so importing the same file twice still triggers a change event.
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="fav-transfer">
      <div className="fav-transfer-actions" role="group" aria-label="Export or import saved objects">
        <button
          type="button"
          className="btn btn-sm"
          onClick={exportFile}
          disabled={favorites.length === 0}
        >
          Export list
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {busy ? "Importing…" : "Import list"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </div>
      {status ? (
        <p className="detail-note fav-transfer-status" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
