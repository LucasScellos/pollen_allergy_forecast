<script lang="ts">
  import type { Level } from '../lib/pollen';
  import { i18n } from '../lib/i18n.svelte';

  let { level }: { level: Level } = $props();
</script>

<section class="card" aria-labelledby="advice-title" style:--c="var(--lvl-{level})">
  <div class="card-head">
    <h2 id="advice-title">{i18n.t.adviceTitle}</h2>
  </div>
  <ul>
    {#each i18n.t.advice[level] as tip (tip)}
      <li>{tip}</li>
    {/each}
  </ul>
</section>

<style>
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 10px;
  }
  li {
    position: relative;
    padding-left: 20px;
    color: var(--ink);
  }
  li::before {
    content: '';
    position: absolute;
    left: 2px;
    top: 0.55em;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--c);
  }
</style>
