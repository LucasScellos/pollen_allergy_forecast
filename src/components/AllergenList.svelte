<script lang="ts">
  import { POLLENS, seriesFor, type DayForecast, type Forecast, type PollenKey } from '../lib/pollen';
  import { i18n } from '../lib/i18n.svelte';
  import LevelBadge from './LevelBadge.svelte';
  import Sparkline from './Sparkline.svelte';

  let {
    forecast,
    day,
    dayIndex,
    selected = $bindable(),
  }: {
    forecast: Forecast;
    day: DayForecast;
    dayIndex: number;
    selected: PollenKey;
  } = $props();
</script>

<section class="card" aria-labelledby="allergens-title">
  <div class="card-head">
    <h2 id="allergens-title">{i18n.t.allergens}</h2>
    <p class="subtle">{i18n.t.allergensFor(i18n.dayLabel(day.date, dayIndex, true).toLowerCase())}</p>
  </div>

  <ul class="list">
    {#each day.allergens as a (a.key)}
      <li>
        <button
          type="button"
          class="row"
          class:selected={a.key === selected}
          aria-pressed={a.key === selected}
          onclick={() => (selected = a.key)}
        >
          <span class="who">
            <span class="name">{i18n.t.pollens[a.key]}</span>
            <span class="family">{i18n.t.families[POLLENS[a.key].family]}</span>
          </span>
          <span class="spark">
            <Sparkline
              points={seriesFor(forecast, a.key, day.date)}
              floor={POLLENS[a.key].thresholds[0]}
            />
          </span>
          <span class="value">
            <strong>{i18n.number(a.mean)}</strong>
            <span class="peak">{i18n.t.peak} {i18n.number(a.peak)}</span>
          </span>
          <span class="level"><LevelBadge level={a.level} size="sm" /></span>
        </button>
      </li>
    {/each}
  </ul>
  <p class="subtle unit">{i18n.t.unit}</p>
</section>

<style>
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 2px;
  }
  .row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto 64px 112px;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 10px 12px;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    background: none;
    text-align: left;
    cursor: pointer;
  }
  .row:hover {
    background: var(--surface-2);
  }
  .row.selected {
    background: var(--accent-wash);
    border-color: var(--accent);
  }
  .who {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .name {
    font-weight: 650;
  }
  .family {
    font-size: 0.8125rem;
    color: var(--ink-2);
  }
  .value {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-variant-numeric: tabular-nums;
    line-height: 1.25;
  }
  .peak {
    font-size: 0.75rem;
    color: var(--muted);
    white-space: nowrap;
  }
  .unit {
    margin-top: 8px;
    text-align: right;
    font-size: 0.75rem;
  }
  @media (max-width: 520px) {
    .row {
      grid-template-columns: minmax(0, 1fr) 56px 104px;
      gap: 10px;
    }
    .spark {
      display: none;
    }
  }
</style>
