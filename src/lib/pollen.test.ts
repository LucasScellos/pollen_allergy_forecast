import { describe, expect, it } from 'vitest';
import {
  buildForecast,
  levelFor,
  localHour,
  niceTicks,
  POLLEN_KEYS,
  seriesFor,
  type RawAirQualityResponse,
} from './pollen';

function hours(days: string[]): string[] {
  return days.flatMap((d) => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`));
}

function raw(times: string[], values: Partial<Record<string, (number | null)[]>>): RawAirQualityResponse {
  const hourly: Record<string, unknown> = { time: times };
  for (const k of POLLEN_KEYS) hourly[k] = values[k] ?? times.map(() => 0);
  return { latitude: 48.9, longitude: 2.4, timezone: 'Europe/Paris', hourly } as RawAirQualityResponse;
}

describe('levelFor', () => {
  it('maps concentrations to per-allergen levels', () => {
    expect(levelFor('grass_pollen', 0.4)).toBe(0);
    expect(levelFor('grass_pollen', 5)).toBe(1);
    expect(levelFor('grass_pollen', 20)).toBe(2);
    expect(levelFor('grass_pollen', 60)).toBe(3);
    expect(levelFor('grass_pollen', 150)).toBe(4);
  });

  it('is stricter for ragweed than for olive', () => {
    expect(levelFor('ragweed_pollen', 25)).toBe(3);
    expect(levelFor('olive_pollen', 25)).toBe(1);
  });

  it('treats missing values as none', () => {
    expect(levelFor('birch_pollen', null)).toBe(0);
    expect(levelFor('birch_pollen', undefined)).toBe(0);
    expect(levelFor('birch_pollen', Number.NaN)).toBe(0);
  });
});

describe('buildForecast', () => {
  const times = hours(['2026-04-01', '2026-04-02']);

  it('aggregates daily mean, peak and dominant allergen', () => {
    const birch = times.map((t) => (t === '2026-04-01T14:00' ? 400 : t.startsWith('2026-04-01') ? 80 : 5));
    const f = buildForecast(raw(times, { birch_pollen: birch }));

    expect(f.days).toHaveLength(2);
    const d0 = f.days[0];
    expect(d0.date).toBe('2026-04-01');
    expect(d0.dominant).toBe('birch_pollen');
    expect(d0.level).toBe(3);
    const b = d0.allergens[0];
    expect(b.key).toBe('birch_pollen');
    expect(b.peak).toBe(400);
    expect(b.peakTime).toBe('14:00');
    expect(b.mean).toBeCloseTo((80 * 23 + 400) / 24, 1);

    expect(f.days[1].level).toBe(1);
  });

  it('reports no dominant allergen on a clean day', () => {
    const f = buildForecast(raw(times, {}));
    expect(f.days[0].level).toBe(0);
    expect(f.days[0].dominant).toBeNull();
  });

  it('drops a day truncated by the end of the model horizon', () => {
    const t = hours(['2026-04-01', '2026-04-02']);
    const grass = t.map((x) => (x >= '2026-04-02T03:00' ? null : 10));
    const f = buildForecast(raw(t, { grass_pollen: grass }));
    expect(f.days.map((d) => d.date)).toEqual(['2026-04-01']);
  });

  it('fills allergens absent from the response with nulls', () => {
    const r = raw(times, {});
    delete (r.hourly as Record<string, unknown>).olive_pollen;
    expect(buildForecast(r).days).toHaveLength(0);
  });
});

describe('seriesFor', () => {
  it('filters by date and trims the trailing null tail', () => {
    const t = hours(['2026-04-01']);
    const grass = t.map((_, i) => (i > 20 ? null : i));
    const f = buildForecast(raw(t, { grass_pollen: grass }));
    const s = seriesFor(f, 'grass_pollen', '2026-04-01');
    expect(s).toHaveLength(21);
    expect(s.at(-1)).toEqual({ time: '2026-04-01T20:00', value: 20 });
  });
});

describe('niceTicks', () => {
  it('produces round, evenly spaced ticks covering the max', () => {
    expect(niceTicks(240)).toEqual([0, 100, 200, 300]);
    expect(niceTicks(12)).toEqual([0, 5, 10, 15]);
    expect(niceTicks(20)).toEqual([0, 5, 10, 15, 20]);
    expect(niceTicks(0)).toEqual([0, 0.5, 1]);
  });
});

describe('localHour', () => {
  it('formats the wall-clock hour in the target timezone', () => {
    const now = new Date('2026-04-01T22:30:00Z');
    expect(localHour('Europe/Paris', now)).toBe('2026-04-02T00:00');
    expect(localHour('Europe/London', now)).toBe('2026-04-01T23:00');
  });
});
