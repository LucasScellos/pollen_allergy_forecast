import { buildForecast, POLLEN_KEYS, type Forecast, type RawAirQualityResponse } from './pollen';

const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const PHOTON_URL = 'https://photon.komoot.io/api/';
const REVERSE_URL ='https://nominatim.openstreetmap.org/reverse';

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

/** Roughly the CAMS Europe domain, as minLon,minLat,maxLon,maxLat. */
const EUROPE_BBOX = '-25,30,45,72';
const PLACE_TAGS = ['city', 'town', 'village', 'municipality', 'suburb', 'quarter', 'hamlet'];
const MAX_RESULTS = 6;

export interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

/** Photon features → places: builds the detail line and drops duplicates. */
export function placesFromPhoton(features: PhotonFeature[]): Place[] {
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const { geometry, properties: p } of features) {
    if (!p.name) continue;
    const [longitude, latitude] = geometry.coordinates;
    const region = p.county ?? p.state;
    const detail = [p.city !== p.name ? p.city : undefined, region, p.country]
      .filter((part, i, all) => part && all.indexOf(part) === i)
      .join(', ');
    const key = `${p.name}|${region ?? ''}|${p.country ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    places.push({ name: p.name, detail, latitude, longitude });
    if (places.length === MAX_RESULTS) break;
  }
  return places;
}

/**
 * City search. Photon (OpenStreetMap, typo-tolerant, built for autocomplete)
 * handles "saint philbert de grand lieu", "st philbert…" and typos; Open-Meteo
 * is the fallback if Photon is unavailable.
 */
export async function searchPlaces(
  query: string,
  language: string,
  signal?: AbortSignal,
  near?: { latitude: number; longitude: number } | null,
): Promise<Place[]> {
  try {
    return await searchPhoton(query, language, signal, near);
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    return searchOpenMeteo(query, language, signal);
  }
}

async function searchPhoton(
  query: string,
  language: string,
  signal?: AbortSignal,
  near?: { latitude: number; longitude: number } | null,
): Promise<Place[]> {
  const params = new URLSearchParams({
    q: query,
    limit: '12',
    lang: language === 'fr' ? 'fr' : 'en',
    bbox: EUROPE_BBOX,
  });
  for (const tag of PLACE_TAGS) params.append('osm_tag', `place:${tag}`);
  if (near) {
    // Mild bias toward the current place, so "Nantes" means the nearby one.
    params.set('lat', near.latitude.toFixed(2));
    params.set('lon', near.longitude.toFixed(2));
    params.set('location_bias_scale', '0.2');
  }
  const res = await fetch(`${PHOTON_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body: { features?: PhotonFeature[] } = await res.json();
  return placesFromPhoton(body.features ?? []);
}

interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  admin2?: string;
}

/** Open-Meteo matches official names word by word, so also try the hyphenated form. */
async function searchOpenMeteo(
  query: string,
  language: string,
  signal?: AbortSignal,
): Promise<Place[]> {
  const variants = [...new Set([query, query.trim().replace(/\s+/g, '-')])];
  const responses = await Promise.all(
    variants.map(async (name) => {
      const params = new URLSearchParams({ name, count: '6', language, format: 'json' });
      const res = await fetch(`${GEOCODING_URL}?${params}`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body: { results?: GeocodingResult[] } = await res.json();
      return body.results ?? [];
    }),
  );
  const seen = new Set<string>();
  return responses
    .flat()
    .filter((r) => {
      const key = `${r.latitude.toFixed(3)},${r.longitude.toFixed(3)}`;
      return !seen.has(key) && !!seen.add(key);
    })
    .slice(0, MAX_RESULTS)
    .map((r) => ({
      name: r.name,
      detail: [r.admin2, r.admin1, r.country].filter(Boolean).join(', '),
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
