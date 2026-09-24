/**
 * Pollen domain model: allergen metadata, risk thresholds and aggregation.
 * Pure functions only — no DOM, no fetch — so everything here is unit tested.
 */

export const POLLEN_KEYS = [
  'alder_pollen',
  'birch_pollen',
  'grass_pollen',
  'mugwort_pollen',
  'olive_pollen',
  'ragweed_pollen',
] as const;

export type PollenKey = (typeof POLLEN_KEYS)[number];
export type PollenFamily = 'tree' | 'grass' | 'weed';

/** 0 = none, 1 = low, 2 = moderate, 3 = high, 4 = very high */
export type Level = 0 | 1 | 2 | 3 | 4;

export interface PollenInfo {
  key: PollenKey;
  family: PollenFamily;
  /**
   * Daily-mean concentrations (grains/m³) at which the risk becomes
   * moderate, high and very high. Anything from 1 grain/m³ up to the first
   * threshold is "low"; below 1 is "none".
   *
   * Tree and grass values follow MeteoSwiss' published scale; olive follows
   * the Spanish Aerobiology Network (REA), and ragweed/mugwort follow RNSA
   * guidance, where a few grains already trigger symptoms. They are
   * indicative, not medical thresholds.
   */
  thresholds: readonly [number, number, number];
}

export const POLLENS: Record<PollenKey, PollenInfo> = {
  alder_pollen: { key: 'alder_pollen', family: 'tree', thresholds: [10, 70, 250] },
  birch_pollen: { key: 'birch_pollen', family: 'tree', thresholds: [10, 70, 300] },
  grass_pollen: { key: 'grass_pollen', family: 'grass', thresholds: [20, 50, 150] },
  mugwort_pollen: { key: 'mugwort_pollen', family: 'weed', thresholds: [10, 30, 70] },
  olive_pollen: { key: 'olive_pollen', family: 'tree', thresholds: [50, 200, 400] },
  ragweed_pollen: { key: 'ragweed_pollen', family: 'weed', thresholds: [5, 20, 50] },
};

export function levelFor(key: PollenKey, value: number | null | undefined): Level {
  if (value == null || !Number.isFinite(value) || value < 1) return 0;
  const [moderate, high, veryHigh] = POLLENS[key].thresholds;
  if (value >= veryHigh) return 4;
  if (value >= high) return 3;
  if (value >= moderate) return 2;
  return 1;
}

export interface HourlyPoint {
  /** Local wall-clock time as returned by the API, e.g. "2026-04-02T14:00". */
  time: string;
  value: number | null;
}

export interface AllergenDay {
  key: PollenKey;
  mean: number;
  peak: number;
  /** Local hour ("HH:00") of the peak. */
  peakTime: string;
  level: Level;
}

export interface DayForecast {
  /** ISO date "YYYY-MM-DD" in the location's timezone. */
  date: string;
  allergens: AllergenDay[];
  /** Highest allergen level of the day. */
  level: Level;
  /** Allergen driving the day's level (highest level, then highest ratio to its threshold). */
  dominant: PollenKey | null;
}

export interface Forecast {
  latitude: number;
  longitude: number;
  timezone: string;
  /** Hourly series per allergen, same length as `times`. */
  hourly: Record<PollenKey, (number | null)[]>;
  times: string[];
  days: DayForecast[];
}

export interface RawAirQualityResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: { time: string[] } & Partial<Record<PollenKey, (number | null)[]>>;
}

/** Minimum number of hourly values a day needs to be shown (drops the truncated tail). */
const MIN_HOURS_PER_DAY = 18;

const round1 = (n: number) => Math.round(n * 10) / 10;

export function buildForecast(raw: RawAirQualityResponse): Forecast {
  const times = raw.hourly.time;
  const hourly = Object.fromEntries(
    POLLEN_KEYS.map((k) => [k, raw.hourly[k] ?? times.map(() => null)]),
  ) as Record<PollenKey, (number | null)[]>;

  const byDate = new Map<string, number[]>();
  times.forEach((t, i) => {
    const date = t.slice(0, 10);
    const bucket = byDate.get(date) ?? [];
    bucket.push(i);
    byDate.set(date, bucket);
  });

  const days: DayForecast[] = [];
  for (const [date, indices] of byDate) {
    const allergens: AllergenDay[] = [];
    let complete = true;

    for (const key of POLLEN_KEYS) {
      const pts = indices
        .map((i) => ({ time: times[i], value: hourly[key][i] }))
        .filter((p): p is { time: string; value: number } => p.value != null);
      if (pts.length < MIN_HOURS_PER_DAY) {
        complete = false;
        break;
      }
      const mean = pts.reduce((s, p) => s + p.value, 0) / pts.length;
      const peakPt = pts.reduce((a, b) => (b.value > a.value ? b : a));
      allergens.push({
        key,
        mean: round1(mean),
        peak: round1(peakPt.value),
        peakTime: peakPt.time.slice(11, 16),
        level: levelFor(key, mean),
      });
    }
    if (!complete) continue;

    const ranked = [...allergens].sort(compareSeverity);
    const top = ranked[0];
    days.push({
      date,
      allergens: ranked,
      level: top.level,
      dominant: top.level > 0 ? top.key : null,
    });
  }

  return {
    latitude: raw.latitude,
    longitude: raw.longitude,
    timezone: raw.timezone,
    hourly,
    times,
    days,
  };
}

/** Most severe first: by level, then by how far the mean is into its scale. */
export function compareSeverity(a: AllergenDay, b: AllergenDay): number {
  if (b.level !== a.level) return b.level - a.level;
  const ratio = (x: AllergenDay) => x.mean / POLLENS[x.key].thresholds[0];
  return ratio(b) - ratio(a);
}

/** Hourly points of one allergen, optionally restricted to a single date. */
export function seriesFor(f: Forecast, key: PollenKey, date?: string): HourlyPoint[] {
  const out: HourlyPoint[] = [];
  f.times.forEach((time, i) => {
    if (date && !time.startsWith(date)) return;
    out.push({ time, value: f.hourly[key][i] });
  });
  // Drop the trailing hours where the model horizon ends.
  while (out.length && out[out.length - 1].value == null) out.pop();
  return out;
}

/** Round axis ticks from 0 to at least `max`, with a 1/2/5 × 10ⁿ step (3–5 ticks). */
export function niceTicks(max: number): number[] {
  if (!(max > 0)) max = 1;
  const raw = max / 4;
  const base = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * base).find((s) => s >= raw) ?? 10 * base;
  const top = Math.ceil(max / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

/** Current local wall-clock hour in `timeZone`, formatted like the API ("YYYY-MM-DDTHH:00"). */
export function localHour(timeZone: string, now = new Date()): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:00`;
}
