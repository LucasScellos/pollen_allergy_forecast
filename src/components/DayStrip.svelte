<script lang="ts">
  import type { DayForecast } from '../lib/pollen';
  import { i18n } from '../lib/i18n.svelte';
  import LevelBadge from './LevelBadge.svelte';

  let { days, selected = $bindable(0) }: { days: DayForecast[]; selected?: number } = $props();
</script>

<section class="card" aria-labelledby="outlook-title">
  <div class="card-head">
    <h2 id="outlook-title">{i18n.t.outlook}</h2>
  </div>
  <div class="strip" role="group" aria-labelledby="outlook-title">
    {#each days as day, i (day.date)}
      <button
        type="button"
        class="day"
        class:selected={i === selected}
        aria-pressed={i === selected}
        style:--c="var(--lvl-{day.level})"
        onclick={() => (selected = i)}
      >
        <span class="label">{i18n.dayLabel(day.date, i)}</span>
        <LevelBadge level={day.level} size="sm" />
        <span class="dominant">
          {day.dominant ? i18n.t.pollens[day.dominant] : '—'}
        </span>
      </button>
    {/each}
  </div>
</section>

<style>
  .strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }
  .day {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 12px;
    min-width: 0;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--surface);
    text-align: left;
    cursor: pointer;
    position: relative;
    transition:
      background 120ms ease,
      border-color 120ms ease;
  }
  .day::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
    background: var(--c);
  }
  .day:hover {
    background: var(--surface-2);
  }
  .day.selected {
    border-color: var(--accent);
    background: var(--accent-wash);
  }
  .label {
    font-weight: 650;
    font-size: 0.9375rem;
    text-transform: capitalize;
  }
  .dominant {
    font-size: 0.8125rem;
    color: var(--ink-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
  @media (max-width: 520px) {
    .strip {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
