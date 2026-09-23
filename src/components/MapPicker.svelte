<script lang="ts">
  // Loaded on demand: Leaflet only ships to users who open the map.
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  import { onMount } from 'svelte';
  import { i18n } from '../lib/i18n.svelte';

  let {
    center,
    onpick,
  }: {
    center: { latitude: number; longitude: number } | null;
    onpick: (lat: number, lon: number) => void;
  } = $props();

  let el: HTMLDivElement;

  onMount(() => {
    const dark =
      document.documentElement.dataset.theme === 'dark' ||
      (!document.documentElement.dataset.theme &&
        matchMedia('(prefers-color-scheme: dark)').matches);

    const start: L.LatLngExpression = center ? [center.latitude, center.longitude] : [48.5, 8];
    const map = L.map(el, { zoomControl: true, attributionControl: true }).setView(
      start,
      center ? 7 : 4,
    );

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      className: dark ? 'tiles-dark' : '',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const style = { radius: 8, color: '#ffffff', weight: 2, fillColor: '#2a78d6', fillOpacity: 1 };
    let marker = center
      ? L.circleMarker([center.latitude, center.longitude], style).addTo(map)
      : null;

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng.wrap();
      marker ??= L.circleMarker(e.latlng, style).addTo(map);
      marker.setLatLng(e.latlng);
      onpick(lat, lng);
    });

    return () => map.remove();
  });
</script>

<div class="map-wrap">
  <p class="subtle">{i18n.t.mapHint}</p>
  <div class="map" bind:this={el}></div>
</div>

<style>
  .map-wrap {
    display: grid;
    gap: 8px;
  }
  .map {
    height: min(60vh, 420px);
    border-radius: var(--radius-sm);
    overflow: hidden;
    border: 1px solid var(--border);
    z-index: 0;
  }
  /* OSM has no dark style: invert the light tiles and restore hues. */
  .map :global(.tiles-dark) {
    filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9);
  }
</style>
