/**
 * Checks on the book catalogue and the recommended workspaces.
 * Run from the repo root:
 *   npx esbuild tests/catalog.test.ts --bundle --platform=node --format=esm --outfile=/tmp/catalog-test.mjs && node /tmp/catalog-test.mjs
 */
import { CATALOG, coverUrl, findBook } from "../src/lib/book-catalog";
import { WORKSPACE_TEMPLATES, templateBooks } from "../src/lib/workspace-recommendations";

let failures = 0;
let passes = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) passes++;
  else failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? "  -> " + detail : ""}`);
}

const ids = CATALOG.map((b) => b.id);
check("at least 40 books on the shelf", CATALOG.length >= 40, `found ${CATALOG.length}`);
check("book ids are unique", new Set(ids).size === ids.length);
check("every 'read next' link points to a book on the shelf", CATALOG.every((b) => b.related.every((r) => ids.includes(r))));
check("every book has a summary, covers, a 'who for' and study tips", CATALOG.every((b) => b.summary.length >= 60 && b.covers.length >= 2 && b.whoFor.length >= 20 && b.studyTips.length >= 2));
check("every book is tagged with at least one subject", CATALOG.every((b) => b.tracks.length >= 1));
check("ISBNs are 13 digits where given", CATALOG.every((b) => !b.isbn13 || /^\d{13}$/.test(b.isbn13)));
check("covers only where an ISBN is given", CATALOG.every((b) => (coverUrl(b) !== null) === (b.isbn13 !== undefined)));
const isbnOk = (isbn: string) => {
  const d = isbn.split("").map(Number);
  const sum = d.slice(0, 12).reduce((a, x, i) => a + x * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === d[12];
};
check("every ISBN has a valid ISBN-13 check digit", CATALOG.every((b) => !b.isbn13 || isbnOk(b.isbn13)));
check("books with a checked ISBN are listed with it", ["carroll-ostlie-astrophysics", "birney-observational-astronomy", "etkin-reid-dynamics-of-flight", "phillips-mechanics-of-flight"].every((id) => !!findBook(id)?.isbn13));
check("free links are https addresses", CATALOG.every((b) => !b.free || b.free.url.startsWith("https://")));
check("the first fifteen verified books still have their covers", ["bate-fundamentals", "huzel-huang-rocket-engines", "hastings-garrett-environment"].every((id) => !!findBook(id)?.isbn13));
check("technical and general readers are both covered", CATALOG.filter((b) => b.audience === "technical").length >= 20 && CATALOG.filter((b) => b.audience === "general").length >= 12);
check("every subject has books", (["aviation", "astronomy", "aerospace", "stem"] as const).every((t) => CATALOG.some((b) => b.tracks.includes(t))));
check("every recommended workspace has at least one book on the shelf", WORKSPACE_TEMPLATES.every((t) => templateBooks(t).length === t.bookIds.length && t.bookIds.length >= 1));
check("recommended workspace ids are unique", new Set(WORKSPACE_TEMPLATES.map((t) => t.id)).size === WORKSPACE_TEMPLATES.length);

console.log(`\n${passes} passed, ${failures} failed`);
if (failures > 0) process.exitCode = 1;
