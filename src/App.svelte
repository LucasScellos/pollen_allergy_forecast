<script lang="ts">
  import { onMount } from 'svelte';
  import {
    currentPosition,
    fetchForecast,
    OutOfCoverageError,
    reverseGeocode,
    type Place,
  } from './lib/api';
  import { i18n, type Lang } from './lib/i18n.svelte';
  import type { Forecast, PollenKey } from './lib/pollen';
  import { load, save } from './lib/storage';
  import Advice from './components/Advice.svelte';
  import AllergenList from './components/AllergenList.svelte';
  import DayStrip from './components/DayStrip.svelte';
  import HourlyChart from './components/HourlyChart.svelte';
  import RiskHero from './components/RiskHero.svelte';
  import SearchBox from './components/SearchBox.svelte';

  type Status = 'idle' | 'loading' | 'ready' | 'error' | 'outside';

  const SUGGESTIONS: Place[] = [
    { name: 'Paris', detail: 'Île-de-France, France', latitude: 48.8566, longitude: 2.3522 },
    { name: 'Lyon', detail: 'Auvergne-Rhône-Alpes, France', latitude: 45.764, longitude: 4.8357 },
    { name: 'Marseille', detail: "Provence-Alpes-Côte d'Azur, France", latitude: 43.2965, longitude: 5.3698 },
    { name: 'Bruxelles', detail: 'Belgique', latitude: 50.8503, longitude: 4.3517 },
    { name: 'Berlin', detail: 'Deutschland', latitude: 52.52, longitude: 13.405 },
    { name: 'Madrid', detail: 'España', latitude: 40.4168, longitude: -3.7038 },
  ];

  let status = $state<Status>('idle');
  let place = $state<Place | null>(null);
  let forecast = $state<Forecast | null>(null);
  let selectedDay = $state(0);
  let allergen = $state<PollenKey>('grass_pollen');
  let recents = $state<Place[]>(load('recents', []));
  let locating = $state(false);
  let geoError = $state(false);
  let mapOpen = $state(false);
  let online = $state(navigator.onLine);
  let theme = $state<'light' | 'dark' | null>(load('theme', null));
  let controller: AbortController | undefined;

  const day = $derived(forecast?.days[selectedDay] ?? null);

  async function show(p: Place) {
    place = p;
    geoError = false;
    status = 'loading';
    controller?.abort();
    controller = new AbortController();
    syncUrl(p);
    save('place', p);
    recents = [p, ...recents.filter((r) => r.name !== p.name || r.detail !== p.detail)].slice(0, 5);
    save('recents', $state.snapshot(recents));

    try {
      const f = await fetchForecast(p.latitude, p.longitude, controller.signal);
      forecast = f;
      selectedDay = 0;
      allergen = f.days[0]?.dominant ?? f.days[0]?.allergens[0]?.key ?? 'grass_pollen';
      status = 'ready';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      forecast = null;
      status = e instanceof OutOfCoverageError ? 'outside' : 'error';
    }
  }

  async function showCoords(lat: number, lon: number, fallbackName: string) {
    const named = await reverseGeocode(lat, lon, i18n.lang);
    await show({
      name: named?.name ?? fallbackName,
      detail: named?.detail ?? `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      latitude: lat,
      longitude: lon,
    });
  }

  async function locate() {
    locating = true;
    geoError = false;
    try {
      const { latitude, longitude } = await currentPosition();
      await showCoords(latitude, longitude, i18n.t.myLocation);
    } catch {
      geoError = true;
    } finally {
      locating = false;
    }
  }

  function syncUrl(p: Place) {
    const url = new URL(location.href);
    url.searchParams.set('lat', p.latitude.toFixed(4));
    url.searchParams.set('lon', p.longitude.toFixed(4));
    url.searchParams.set('name', p.name);
    if (p.detail) url.searchParams.set('detail', p.detail);
    else url.searchParams.delete('detail');
    history.replaceState(null, '', url);
  }

  function placeFromUrl(): Place | null {
    const q = new URLSearchParams(location.search);
    const lat = Number(q.get('lat'));
    const lon = Number(q.get('lon'));
    if (!q.has('lat') || !q.has('lon') || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { name: q.get('name') ?? i18n.t.selectedPoint, detail: q.get('detail') ?? '', latitude: lat, longitude: lon };
  }

  function setTheme() {
    const isDark =
      theme === 'dark' || (theme === null && matchMedia('(prefers-color-scheme: dark)').matches);
    theme = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    save('theme', theme);
  }

  function setLang(lang: Lang) {
    i18n.set(lang);
  }

  onMount(() => {
    document.documentElement.lang = i18n.lang;
    const initial = placeFromUrl() ?? load<Place | null>('place', null);
    if (initial) show(initial);

    const on = () => (online = true);
    const off = () => (online = false);
    addEventListener('online', on);
    addEventListener('offline', off);
    return () => {
      removeEventListener('online', on);
      removeEventListener('offline', off);
    };
  });

  $effect(() => {
    document.title = place ? `${place.name} · ${i18n.t.appName}` : `${i18n.t.appName} · ${i18n.t.tagline}`;
  });
</script>

<header class="top">
  <div class="brand">
    <svg viewBox="0 0 32 32" aria-hidden="true"><use href="#logo" /></svg>
    <span>{i18n.t.appName}</span>
  </div>
  <div class="tools">
    <div class="lang" role="group" aria-label={i18n.t.language}>
      {#each ['fr', 'en'] as const as l (l)}
        <button type="button" aria-pressed={i18n.lang === l} onclick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      {/each}
    </div>
    <button type="button" class="icon-btn" aria-label={i18n.t.toggleTheme} onclick={setTheme}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</header>

<main>
  <section class="finder" aria-label={i18n.t.searchLabel}>
    <div class="finder-row">
      <SearchBox onselect={show} near={place} />
      <button type="button" class="btn" onclick={locate} disabled={locating}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        {locating ? i18n.t.locating : i18n.t.useMyLocation}
      </button>
      <button type="button" class="btn" aria-expanded={mapOpen} onclick={() => (mapOpen = !mapOpen)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        </svg>
        {mapOpen ? i18n.t.closeMap : i18n.t.pickOnMap}
      </button>
    </div>

    {#if geoError}<p class="notice" role="alert">{i18n.t.geoError}</p>{/if}
    {#if !online}<p class="notice" role="status">{i18n.t.offline}</p>{/if}

    {#if recents.length}
      <div class="chips">
        <span class="subtle">{i18n.t.recent}</span>
        {#each recents as r (`${r.name}|${r.detail}`)}
          <button type="button" class="chip" onclick={() => show(r)}>{r.name}</button>
        {/each}
      </div>
    {/if}

    {#if mapOpen}
      <div class="card map-card">
        {#await import('./components/MapPicker.svelte') then { default: MapPicker }}
          <MapPicker
            center={place}
            onpick={(lat, lon) => showCoords(lat, lon, i18n.t.selectedPoint)}
          />
        {/await}
      </div>
    {/if}
  </section>

  {#if status === 'idle'}
    <section class="card empty">
      <h1>{i18n.t.welcomeTitle}</h1>
      <p class="subtle">{i18n.t.welcomeBody}</p>
      <div class="chips center">
        {#each SUGGESTIONS as s (s.name)}
          <button type="button" class="chip" onclick={() => show(s)}>{s.name}</button>
        {/each}
      </div>
    </section>
  {:else if status === 'loading' && !forecast}
    <section class="card empty" aria-busy="true">
      <span class="loader" aria-hidden="true"></span>
      <p class="subtle">{i18n.t.loading}</p>
    </section>
  {:else if status === 'error'}
    <section class="card empty" role="alert">
      <h1>{i18n.t.errorTitle}</h1>
      <p class="subtle">{i18n.t.errorBody}</p>
      <button type="button" class="btn" onclick={() => place && show(place)}>{i18n.t.retry}</button>
    </section>
  {:else if status === 'outside'}
    <section class="card empty" role="alert">
      <h1>{i18n.t.outOfCoverageTitle}</h1>
      <p class="subtle">{i18n.t.outOfCoverageBody}</p>
    </section>
  {:else if forecast && day && place}
    <!-- While refetching, keep the previous render dimmed (no layout jump). -->
    <div class="grid" class:stale={status === 'loading'} aria-busy={status === 'loading'}>
      <div class="col-main">
        <RiskHero {place} day={forecast.days[0]} />
        <DayStrip days={forecast.days} bind:selected={selectedDay} />
        <HourlyChart {forecast} {allergen} bind:selectedDay />
      </div>
      <div class="col-side">
        <AllergenList {forecast} {day} dayIndex={selectedDay} bind:selected={allergen} />
        <Advice level={day.level} />
      </div>
    </div>
  {/if}
</main>

<footer>
  <p>
    {i18n.t.footerData}
    <a href="https://atmosphere.copernicus.eu/" rel="noopener" target="_blank">CAMS</a> ·
    <a href="https://open-meteo.com/" rel="noopener" target="_blank">Open-Meteo</a> (CC BY 4.0)
  </p>
  <p>{i18n.t.footerDisclaimer}</p>
  <p>
    {i18n.t.footerBy}
    <a href="https://lucasscellos.github.io" rel="noopener" target="_blank">Lucas Scellos</a> ·
    <a href="https://github.com/LucasScellos/pollen_allergy_forecast" rel="noopener" target="_blank">GitHub</a>
  </p>
</footer>

<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="logo" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="15" fill="var(--accent)" />
    <g fill="#fff">
      <circle cx="16" cy="16" r="3.2" />
      <circle cx="16" cy="8.5" r="2.4" />
      <circle cx="16" cy="23.5" r="2.4" />
      <circle cx="8.5" cy="16" r="2.4" />
      <circle cx="23.5" cy="16" r="2.4" />
      <circle cx="10.7" cy="10.7" r="1.7" />
      <circle cx="21.3" cy="21.3" r="1.7" />
      <circle cx="21.3" cy="10.7" r="1.7" />
      <circle cx="10.7" cy="21.3" r="1.7" />
    </g>
  </symbol>
</svg>

<style>
  .top {
    position: sticky;
    top: 0;
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px max(16px, calc((100vw - 1120px) / 2));
    background: color-mix(in srgb, var(--page) 82%, transparent);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 700;
    font-size: 1.0625rem;
    letter-spacing: -0.01em;
  }
  .brand svg {
    width: 28px;
    height: 28px;
  }
  .tools {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .lang {
    display: inline-flex;
    padding: 3px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface);
  }
  .lang button {
    border: 0;
    background: none;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--ink-2);
    cursor: pointer;
  }
  .lang button[aria-pressed='true'] {
    background: var(--ink);
    color: var(--surface);
  }
  .icon-btn {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--surface);
    cursor: pointer;
  }
  .icon-btn svg {
    width: 18px;
    height: 18px;
  }

  main {
    max-width: 1120px;
    margin: 0 auto;
    padding: 20px 16px 32px;
    display: grid;
    gap: 16px;
  }
  .finder {
    display: grid;
    gap: 10px;
  }
  .finder-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .notice {
    font-size: 0.875rem;
    color: var(--ink-2);
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    background: var(--surface-2);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .chips.center {
    justify-content: center;
    margin-top: 8px;
  }
  .chip {
    border: 1px solid var(--border);
    background: var(--surface);
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 0.8125rem;
    font-weight: 550;
    cursor: pointer;
  }
  .chip:hover {
    background: var(--surface-2);
  }
  .map-card {
    padding: 12px;
  }

  .empty {
    display: grid;
    justify-items: center;
    gap: 10px;
    text-align: center;
    padding: 48px 20px;
  }
  .empty h1 {
    font-size: 1.5rem;
    letter-spacing: -0.02em;
  }
  .loader {
    width: 28px;
    height: 28px;
    border: 3px solid var(--grid);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 700ms linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
    gap: 16px;
    align-items: start;
    transition: opacity 150ms ease;
  }
  .grid.stale {
    opacity: 0.55;
  }
  .col-main,
  .col-side {
    display: grid;
    gap: 16px;
    min-width: 0;
  }
  @media (max-width: 880px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  footer {
    max-width: 1120px;
    margin: 0 auto;
    padding: 8px 16px 40px;
    display: grid;
    gap: 4px;
    font-size: 0.8125rem;
    color: var(--muted);
  }
</style>
