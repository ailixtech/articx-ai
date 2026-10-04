// localStorage / sessionStorage that never throws (private windows, blocked storage).
export function store(kind, key, value) {
  try {
    const s = kind === "session" ? sessionStorage : localStorage;
    if (value === undefined) return s.getItem(key);
    if (value === null) s.removeItem(key); else s.setItem(key, value);
  } catch { /* storage unavailable */ }
  return null;
}
