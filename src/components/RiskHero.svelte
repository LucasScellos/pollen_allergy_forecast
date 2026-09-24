<script lang="ts">
  import type { Place } from '../lib/api';
  import type { DayForecast } from '../lib/pollen';
  import { i18n } from '../lib/i18n.svelte';
  import LevelBadge from './LevelBadge.svelte';

  let { place, day }: { place: Place; day: DayForecast } = $props();

  const main = $derived(day.allergens.find((a) => a.key === day.dominant));
</script>

<section class="card hero" style:--c="var(--lvl-{day.level})" aria-labelledby="hero-title">
  <div class="where">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      />
      <circle cx="12" cy="9" r="2.5" fill="currentColor" />
    </svg>
    <div>
      <p class="place">{place.name}</p>
      {#if place.detail}<p class="subtle">{place.detail}</p>{/if}
    </div>
  </div>

  <div class="risk">
    <p class="eyebrow" id="hero-title">{i18n.t.todayRisk}</p>
    <div class="level-row">
      <LevelBadge level={day.level} size="lg" showLabel={false} />
      <p class="level">{i18n.t.levels[day.level]}</p>
    </div>
    {#if main}
      <p class="main">
        {i18n.t.mainAllergen} <strong>{i18n.t.pollens[main.key]}</strong>
        <span class="subtle">
          · {i18n.number(main.mean)} {i18n.t.unit}, {i18n.t.peak} {i18n.number(main.peak)}
          {i18n.t.at} {main.peakTime}
        </span>
      </p>
    {:else}
      <p class="main">{i18n.t.nothingSignificant}</p>
    {/if}
  </div>
</section>

<style>
  .hero {
    display: grid;
    gap: 20px;
    position: relative;
    overflow: hidden;
    border-top: 4px solid var(--c);
  }
  .where {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .where svg {
    width: 22px;
    height: 22px;
    margin-top: 3px;
    color: var(--accent);
    flex: none;
  }
  .place {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1.3;
  }
  .eyebrow {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--ink-2);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .level-row {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 6px 0 8px;
  }
  .level {
    font-size: clamp(2.5rem, 9vw, 3.5rem);
    font-weight: 750;
    letter-spacing: -0.03em;
    line-height: 1.05;
  }
  .main {
    color: var(--ink);
  }
</style>
