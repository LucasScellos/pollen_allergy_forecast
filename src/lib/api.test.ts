import { afterEach, describe, expect, it, vi } from 'vitest';
import { placesFromPhoton, searchPlaces, type PhotonFeature } from './api';

const feature = (
  name: string,
  props: Partial<PhotonFeature['properties']> = {},
  coords: [number, number] = [-1.64, 47.04],
): PhotonFeature => ({ geometry: { coordinates: coords }, properties: { name, ...props } });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('placesFromPhoton', () => {
  it('maps coordinates and builds the detail line', () => {
    const [p] = placesFromPhoton([
      feature('Saint-Philbert-de-Grand-Lieu', { county: 'Loire-Atlantique', state: 'Pays de la Loire', country: 'France' }),
    ]);
    expect(p).toEqual({
      name: 'Saint-Philbert-de-Grand-Lieu',
      detail: 'Loire-Atlantique, France',
      latitude: 47.04,
      longitude: -1.64,
    });
  });

  it('mentions the parent city for districts', () => {
    const [p] = placesFromPhoton([
      feature('10e Arrondissement', { city: 'Paris', state: 'Île-de-France', country: 'France' }),
    ]);
    expect(p.detail).toBe('Paris, Île-de-France, France');
  });

  it('drops duplicates and nameless features', () => {
    const places = placesFromPhoton([
      feature('Nantes', { county: 'Loire-Atlantique', country: 'France' }),
      feature('Nantes', { county: 'Loire-Atlantique', country: 'France' }, [-1.55, 47.22]),
      { geometry: { coordinates: [0, 0] }, properties: {} },
      feature('Nantes', { county: 'Loir-et-Cher', country: 'France' }),
    ]);
    expect(places.map((p) => p.detail)).toEqual(['Loire-Atlantique, France', 'Loir-et-Cher, France']);
  });
});

describe('searchPlaces', () => {
  it('queries Photon restricted to places in Europe, biased to the current place', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ features: [feature('Saint-Philbert-de-Grand-Lieu')] }));
    vi.stubGlobal('fetch', fetch);

    const places = await searchPlaces('st philbert de grand lieu', 'fr', undefined, {
      latitude: 47.2,
      longitude: -1.55,
    });

    expect(places[0].name).toBe('Saint-Philbert-de-Grand-Lieu');
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.hostname).toBe('photon.komoot.io');
    expect(url.searchParams.get('q')).toBe('st philbert de grand lieu');
    expect(url.searchParams.get('bbox')).toBe('-25,30,45,72');
    expect(url.searchParams.getAll('osm_tag')).toContain('place:town');
    expect(url.searchParams.get('lat')).toBe('47.20');
  });

  it('falls back to Open-Meteo, also trying the hyphenated name', async () => {
    const fetch = vi.fn(async (input: string) => {
      const url = new URL(input);
      if (url.hostname === 'photon.komoot.io') return json({ message: 'down' }, 503);
      // Open-Meteo only matches the official, hyphenated spelling.
      const hit = url.searchParams.get('name') === 'saint-philbert-de-grand-lieu';
      return json(
        hit
          ? { results: [{ name: 'Saint-Philbert-de-Grand-Lieu', latitude: 47.04, longitude: -1.64, admin2: 'Loire-Atlantique', country: 'France' }] }
          : {},
      );
    });
    vi.stubGlobal('fetch', fetch);

    const places = await searchPlaces('saint philbert de grand lieu', 'fr');
    expect(places).toEqual([
      { name: 'Saint-Philbert-de-Grand-Lieu', detail: 'Loire-Atlantique, France', latitude: 47.04, longitude: -1.64 },
    ]);
  });

  it('does not fall back when the request was aborted', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const fetch = vi.fn().mockRejectedValue(abort);
    vi.stubGlobal('fetch', fetch);

    await expect(searchPlaces('nantes', 'fr')).rejects.toThrow('aborted');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
