<script lang="ts">
  import type { Level } from '../lib/pollen';
  import { i18n } from '../lib/i18n.svelte';

  let { level, size = 'md', showLabel = true }: {
    level: Level;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
  } = $props();
</script>

<!-- The meter shape (filled bars) carries the level along with its colour. -->
<span class="badge {size}" style:--c="var(--lvl-{level})">
  <svg class="meter" viewBox="0 0 22 16" aria-hidden="true">
    {#each [1, 2, 3, 4] as bar (bar)}
      <rect
        x={(bar - 1) * 6}
        y={16 - bar * 4}
        width="4"
        height={bar * 4}
        rx="1.5"
        fill={bar <= level ? 'var(--c)' : 'var(--grid)'}
      />
    {/each}
  </svg>
  {#if showLabel}
    <span class="label">{i18n.t.levels[level]}</span>
  {:else}
    <span class="visually-hidden">{i18n.t.levels[level]}</span>
  {/if}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: var(--ink);
    white-space: nowrap;
  }
  .meter {
    width: 22px;
    height: 16px;
    flex: none;
  }
  .sm {
    font-size: 0.8125rem;
  }
  .sm .meter {
    width: 17px;
    height: 12px;
  }
  .md {
    font-size: 0.875rem;
  }
  .lg {
    font-size: 1rem;
  }
  .lg .meter {
    width: 33px;
    height: 24px;
  }
</style>
