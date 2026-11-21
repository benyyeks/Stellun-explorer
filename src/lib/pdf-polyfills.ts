/**
 * Small fallbacks for newer JavaScript methods that pdf.js 5 relies on.
 * Some browsers do not have them yet. Each one is only added when missing.
 * Imported by the PDF reader and by the PDF worker before pdf.js runs.
 */

function define(target: object, name: string, value: unknown) {
  if (typeof (target as Record<string, unknown>)[name] === "function") return;
  Object.defineProperty(target, name, { configurable: true, writable: true, value });
}

// Uint8Array#toHex
define(Uint8Array.prototype, "toHex", function toHex(this: Uint8Array): string {
  let out = "";
  for (const byte of this) out += byte.toString(16).padStart(2, "0");
  return out;
});

// Map and WeakMap upsert helpers (getOrInsert, getOrInsertComputed)
for (const proto of [Map.prototype, WeakMap.prototype] as Array<Map<unknown, unknown> | WeakMap<object, unknown>>) {
  define(proto, "getOrInsert", function getOrInsert(this: Map<unknown, unknown>, key: unknown, value: unknown) {
    if (this.has(key)) return this.get(key);
    this.set(key, value);
    return value;
  });
  define(proto, "getOrInsertComputed", function getOrInsertComputed(
    this: Map<unknown, unknown>,
    key: unknown,
    callback: (k: unknown) => unknown,
  ) {
    if (this.has(key)) return this.get(key);
    const value = callback(key);
    this.set(key, value);
    return value;
  });
}

export {};
