// One-time copy of saved browser data from the old product name's keys.
export function migrateLegacyStorage() {
  if (typeof window === "undefined") return;
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      const old: string[] = [];
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (k && k.startsWith("orbitex")) old.push(k);
      }
      for (const k of old) {
        const nk = "stellun" + k.slice(7);
        const v = store.getItem(k);
        if (v !== null && store.getItem(nk) === null) store.setItem(nk, v);
        store.removeItem(k);
      }
    } catch {
      /* storage unavailable */
    }
  }
}
