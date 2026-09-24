/**
 * Tiny localStorage wrapper. Storage can be unavailable (private mode,
 * blocked cookies) so every access is guarded and falls back silently.
 */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`pollen:${key}`);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(`pollen:${key}`, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
