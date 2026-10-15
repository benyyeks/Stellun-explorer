// Client-side table export. Serialises the rows a page is already showing into
// CSV or JSON and triggers a download, so an offline copy carries the same
// figures the screen carries plus where they came from and when.

export type ExportColumn<T> = {
  key: string;
  label: string;
  value: (row: T) => string | number | null | undefined;
};

export type ExportMeta = {
  // Human readable dataset name, used for the file name.
  dataset: string;
  // The named upstream source, so an exported file stays traceable.
  source: string;
  // When the figures were retrieved, ISO string.
  retrievedAt?: string | undefined;
};

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function download(filename: string, mime: string, body: string) {
  const blob = new Blob([body], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function stamp(meta: ExportMeta): string {
  const iso = meta.retrievedAt ?? new Date().toISOString();
  return iso.slice(0, 19).replace(/[:T]/g, "-");
}

export function exportCsv<T>(rows: T[], columns: ExportColumn<T>[], meta: ExportMeta) {
  const header = [
    `# ${meta.dataset}`,
    `# Source: ${meta.source}`,
    `# Retrieved: ${meta.retrievedAt ?? new Date().toISOString()}`,
    `# Exported from STELLUN`,
  ].join("\n");
  const body = [
    columns.map((c) => csvCell(c.label)).join(","),
    ...rows.map((row) => columns.map((c) => csvCell(c.value(row))).join(",")),
  ].join("\n");
  download(`${slug(meta.dataset)}-${stamp(meta)}.csv`, "text/csv", `${header}\n${body}\n`);
}

export function exportJson<T>(rows: T[], columns: ExportColumn<T>[], meta: ExportMeta) {
  const payload = {
    dataset: meta.dataset,
    source: meta.source,
    retrievedAt: meta.retrievedAt ?? new Date().toISOString(),
    exportedFrom: "STELLUN",
    rowCount: rows.length,
    rows: rows.map((row) =>
      Object.fromEntries(columns.map((c) => [c.key, c.value(row) ?? null]))
    ),
  };
  download(
    `${slug(meta.dataset)}-${stamp(meta)}.json`,
    "application/json",
    JSON.stringify(payload, null, 2)
  );
}
