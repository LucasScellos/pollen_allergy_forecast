import { buildForecast, POLLEN_KEYS, type Forecast, type RawAirQualityResponse } from './pollen';

const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

export interface Place {
  name: string;
  /** Region / country line shown under the name. */
  detail: string;
  latitude: number;
  longitude: number;
}

/** Thrown when the location is outside the CAMS Europe domain. */
export class OutOfCoverageError extends Error {
  constructor() {
    super('Location outside the CAMS Europe coverage');
    this.name = 'OutOfCoverageError';
  }
}

// Small in-memory cache so switching back and forth between places is instant.
const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { at: number; data: Forecast }>();

export async function fetchForecast(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<Forecast> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: POLLEN_KEYS.join(','),
    domains: 'cams_europe',
    timezone: 'auto',
    forecast_days: '4',
  });
  const res = await fetch(`${AIR_QUALITY_URL}?${params}`, { signal });
  const body = await res.json().catch(() => null);

  if (!res.ok || body?.error) {
    if (typeof body?.reason === 'string' && /no data/i.test(body.reason)) {
      throw new OutOfCoverageError();
    }
    throw new Error(body?.reason ?? `HTTP ${res.status}`);
  }

  const data = buildForecast(body as RawAirQualityResponse);
  if (data.days.length === 0) throw new OutOfCoverageError();
  cache.set(key, { at: Date.now(), data });
  return data;
}

interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

export async function searchPlaces(
  query: string,
  language: string,
  signal?: AbortSignal,
): Promise<Place[]> {
  const params = new URLSearchParams({ name: query, count: '6', language, format: 'json' });
  const res = await fetch(`${GEOCODING_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body: { results?: GeocodingResult[] } = await res.json();
  return (body.results ?? []).map((r) => ({
    name: r.name,
    detail: [r.admin1, r.country].filter(Boolean).join(', '),
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

/** Best-effort place name for coordinates (geolocation / map click). */
export async function reverseGeocode(
  lat: number,
  lon: number,
  language: string,
): Promise<Pick<Place, 'name' | 'detail'> | null> {
  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(lat),
      lon: String(lon),
      zoom: '10',
      'accept-language': language,
    });
    const res = await fetch(`${REVERSE_URL}?${params}`);
    if (!res.ok) return null;
    const body = await res.json();
    const a = body.address ?? {};
    const name = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? body.name;
    if (!name) return null;
    return { name, detail: [a.state, a.country].filter(Boolean).join(', ') };
  } catch {
    return null;
  }
}

export function currentPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('unsupported'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      reject,
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60 * 1000 },
    );
  });
}
