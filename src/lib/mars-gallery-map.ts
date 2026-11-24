// Maps NASA's Perseverance raw-image feed into the gallery payload the Mars page reads.
// Used by the GitHub ingest, so the stored copy has exactly the shape the page expects.

export type MarsFrame = {
  id: string;
  thumb: string;
  full: string;
  title: string;
  sol: number | null;
  earthDate: string | null;
  instrument: string | null;
  craft: string;
  link: string | null;
};

export type MarsGalleryPayload = {
  frames: MarsFrame[];
  totalImages: number | null;
  latestSol: number | null;
  service: "mars2020-raw" | "msl-raw" | "nasa-image-library";
  solRequested: number | null;
};

export function mapPerseveranceRaw(raw: any, sol: number | null): MarsGalleryPayload {
  const images: any[] = Array.isArray(raw?.images) ? raw.images : [];
  return {
    frames: images
      .map((i) => ({
        id: String(i.imageid ?? i.date_taken_utc ?? Math.random()),
        thumb: i.image_files?.medium ?? i.image_files?.small ?? i.image_files?.large ?? i.image_files?.full_res ?? "",
        full: i.image_files?.full_res ?? i.image_files?.large ?? i.image_files?.medium ?? "",
        title: i.title || i.caption || "Perseverance raw frame",
        sol: typeof i.sol === "number" ? i.sol : null,
        earthDate: typeof i.date_taken_utc === "string" ? i.date_taken_utc.slice(0, 10) : null,
        instrument: i.camera?.instrument ?? null,
        craft: "perseverance",
        link: i.link ?? null,
      }))
      .filter((f) => f.thumb),
    totalImages: typeof raw?.total_images === "number" ? raw.total_images : null,
    latestSol: images.length ? Number(images[0]?.sol ?? 0) : null,
    service: "mars2020-raw",
    solRequested: sol,
  };
}
