import { afterEach, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { launchStreamUrl } from "./launch-live";
import { addUploadedBook, listUploadedBooks } from "./study-uploads";

const now = Date.parse("2026-10-12T01:00:00Z");
const videos = [{ url: "https://www.youtube.com/watch?v=abc123", priority: 1 }];
test("launch stream is available at exactly T-60 minutes", () => {
  expect(launchStreamUrl(videos, "2026-10-12T02:00:00Z", now)).toBe(videos[0]?.url ?? null);
});
test("launch stream stays hidden before T-60 minutes", () => {
  expect(launchStreamUrl(videos, "2026-10-12T02:00:01Z", now)).toBeNull();
});
test("ended launches do not show live links unless the feed reports a live webcast", () => {
  expect(launchStreamUrl(videos, "2026-10-12T00:00:00Z", now)).toBeNull();
  expect(launchStreamUrl(videos, "2026-10-12T00:00:00Z", now, true)).toBe(videos[0]?.url ?? null);
});
test("launch links reject unsafe protocols", () => {
  expect(launchStreamUrl([{ url: "javascript:alert(1)" }], "2026-10-12T02:00:00Z", now)).toBeNull();
});

const originalStorage = globalThis.localStorage;
afterEach(() => { Object.defineProperty(globalThis, "localStorage", { configurable: true, value: originalStorage }); });
function installStorage() {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v) } });
}
test("uploaded books require a nonempty title", () => {
  installStorage();
  expect(addUploadedBook({ title: "  ", topicId: "propulsion" })).toBeNull();
  expect(listUploadedBooks()).toHaveLength(0);
  expect(addUploadedBook({ title: "Rocket Propulsion", topicId: "propulsion" })?.title).toBe("Rocket Propulsion");
});
test("session-only file links are not persisted", () => {
  installStorage();
  expect(addUploadedBook({ title: "Orbital Mechanics", topicId: "orbital-mechanics", objectUrl: "blob:local-test" })?.objectUrl).toBe("blob:local-test");
  expect(listUploadedBooks()[0]?.objectUrl).toBeUndefined();
});

test("tracker comparison adds more than two satellites without replacing earlier choices", () => {
  const source = readFileSync(new URL("../routes/_authenticated/tracker.index.tsx", import.meta.url), "utf8");
  const start = source.indexOf("  const toggleCompare =");
  const end = source.indexOf("  const handlePick =", start);
  const compiled = new Bun.Transpiler({ loader: "tsx" }).transformSync(source.slice(start, end));
  let ids: string[] = [];
  const toggle = new Function("setCompareIds", "setCompareNote", `${compiled}; return toggleCompare;`)((update: (prev: string[]) => string[]) => { ids = update(ids); }, () => {});
  for (const id of ["25544", "48274", "49044"]) toggle({ noradId: id, name: id });
  expect(ids).toEqual(["25544", "48274", "49044"]);
  toggle({ noradId: "48274", name: "Tiangong" });
  expect(ids).toEqual(["25544", "49044"]);
});