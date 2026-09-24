[![CI & Deploy](https://github.com/LucasScellos/pollen_allergy_forecast/actions/workflows/deploy.yml/badge.svg)](https://github.com/LucasScellos/pollen_allergy_forecast/actions/workflows/deploy.yml)

# 🌿 Pollen Allergy Forecast

**4-day, hourly pollen forecast for anywhere in Europe, powered by Copernicus CAMS.**

🔗 **Live app: https://lucasscellos.github.io/pollen_allergy_forecast/**

- **Today's risk at a glance**: overall level, main allergen, and what to do about it
- **6 allergens**: alder, birch, olive, grasses, mugwort, ragweed, each with its own risk thresholds
- **4-day outlook** and an interactive **hourly chart** (crosshair tooltip, keyboard navigation, table view)
- **Find a place** by searching a city, using your location, or clicking on the map
- **FR / EN**, **light / dark** themes, mobile-first, **installable** (PWA) and usable offline with the last loaded data
- **Shareable links**: the URL carries the location (`?lat=…&lon=…&name=…`)

## Architecture

```
Browser ──► Open-Meteo Air Quality API  (CAMS European ensemble, hourly, no API key)
        ──► Open-Meteo Geocoding API    (city search)
        ──► Nominatim                   (place name for "my location" / map clicks)

GitHub Actions ──► type-check · unit tests · build ──► GitHub Pages (free static hosting + CDN)
```

The app is a static site with **no backend**. The forecast is the same
[CAMS European air-quality ensemble](https://atmosphere.copernicus.eu/) the v1
Python app downloaded with `cdsapi`. Open-Meteo already serves it as JSON,
updated daily, for any point in Europe. As a result:

| | v1 (Streamlit / FastAPI) | v2 (this) |
|---|---|---|
| Data refresh | Downloaded **during a user request** (minutes in the ADS queue) | Always fresh; nothing to download |
| Coverage | France bounding box | All of Europe |
| Allergens | 5 | 6 (adds ragweed) |
| Risk levels | One threshold for all pollens | Per-allergen thresholds |
| Hosting | Needs a Python server, API key, and disk | Static files on a CDN, €0 |
| First load | Seconds (server wake-up) | ~30 KB of gzipped JS |

## Tech stack

- [Svelte 5](https://svelte.dev) + TypeScript + [Vite](https://vite.dev)
- Hand-built SVG charts (no chart library)
- [Leaflet](https://leafletjs.com) for the map, **loaded only when the map is opened**
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app) (Workbox) for offline mode and install
- [Vitest](https://vitest.dev) for the domain logic

## Getting started

Requires Node.js ≥ 20.19.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run check      # type-check
npm run build      # production build in dist/
npm run preview    # serve the production build
```

## Deployment (free)

### GitHub Pages (configured)

1. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main`. [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) checks, tests, builds and deploys.

Other branches and pull requests only run the checks.

### Alternatives

Any static host works. Build command `npm run build`, output directory `dist`:

- **Cloudflare Pages**: unlimited bandwidth and preview URLs for every PR
- **Netlify** / **Vercel**: import the repo; both detect Vite automatically

On these hosts the site is served at the domain root, so `BASE_PATH` is not needed.

## Project structure

```
src/
├── App.svelte                 # page layout, state, URL sync
├── app.css                    # design tokens (light/dark) and base styles
├── lib/
│   ├── pollen.ts              # allergens, thresholds, daily aggregation (pure, tested)
│   ├── pollen.test.ts
│   ├── api.ts                 # Open-Meteo + Nominatim clients, in-memory cache
│   ├── i18n.svelte.ts         # FR/EN dictionaries and date formatting
│   └── storage.ts             # safe localStorage helpers
└── components/
    ├── RiskHero.svelte        # today's risk
    ├── DayStrip.svelte        # 4-day outlook
    ├── HourlyChart.svelte     # interactive hourly chart + table view
    ├── AllergenList.svelte    # per-allergen levels with sparklines
    ├── Advice.svelte          # recommendations by level
    ├── SearchBox.svelte       # accessible city search (combobox)
    ├── MapPicker.svelte       # lazy-loaded Leaflet map
    └── LevelBadge.svelte      # 4-bar risk meter + label
```

## Risk levels

Levels are computed from the **daily mean** concentration (grains/m³):

| Allergen | Moderate | High | Very high | Source |
|---|---|---|---|---|
| Alder | 10 | 70 | 250 | MeteoSwiss |
| Birch | 10 | 70 | 300 | MeteoSwiss |
| Grasses | 20 | 50 | 150 | MeteoSwiss |
| Olive | 50 | 200 | 400 | REA (Spain) |
| Mugwort | 10 | 30 | 70 | RNSA guidance |
| Ragweed | 5 | 20 | 50 | RNSA guidance |

Anything from 1 grain/m³ up to the "Moderate" value is *Low*. These thresholds
are indicative and are **not medical advice**.

## Data & credits

- Forecasts: [Copernicus Atmosphere Monitoring Service](https://atmosphere.copernicus.eu/), served by [Open-Meteo](https://open-meteo.com/) (CC BY 4.0)
- Geocoding: [Open-Meteo](https://open-meteo.com/en/docs/geocoding-api) and [Nominatim](https://nominatim.org/) / © OpenStreetMap contributors
- Map tiles: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors

The Open-Meteo free tier is for non-commercial use (up to 10,000 calls a day).
For commercial use, get an Open-Meteo API key.

---

A personal project by [Lucas Scellos](https://lucasscellos.github.io). ⭐ Star the repo if you find it useful!
