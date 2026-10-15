import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./admin.functions.ts", import.meta.url), "utf8");
const start = source.indexOf("const ADMIN_EMAILS =");
const end = source.indexOf("/**\n * Manual full-cycle", start);
const compiled = new Bun.Transpiler({ loader: "ts" }).transformSync(source.slice(start, end));
const assertAdmin = new Function(`${compiled}; return assertAdmin;`)();

function context(email, role, metadataEmail) {
  return {
    userId: "test-user",
    claims: { email, user_metadata: { email: metadataEmail } },
    supabase: {
      rpc: async () => ({ data: role }),
      auth: { getUser: async () => ({ data: { user: { email } } }) },
    },
  };
}

describe("STELLUN admin access", () => {
  test("allows benyyeks@gmail.com with admin role", async () => {
    await expect(assertAdmin(context("benyyeks@gmail.com", true))).resolves.toBeUndefined();
  });
  test("denies every other email even with admin role", async () => {
    await expect(assertAdmin(context("other@example.com", true))).rejects.toThrow("Forbidden");
  });
  test("denies benyyeks@gmail.com without admin role", async () => {
    await expect(assertAdmin(context("benyyeks@gmail.com", false))).rejects.toThrow("Forbidden");
  });
  test("never trusts user-editable metadata email", async () => {
    await expect(assertAdmin(context(undefined, true, "benyyeks@gmail.com"))).rejects.toThrow("Forbidden");
  });
});