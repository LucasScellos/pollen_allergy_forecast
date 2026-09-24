<script lang="ts">
  import { searchPlaces, type Place } from '../lib/api';
  import { i18n } from '../lib/i18n.svelte';

  let {
    onselect,
    near = null,
  }: {
    onselect: (place: Place) => void;
    /** Current place, used to rank nearby results first. */
    near?: Pick<Place, 'latitude' | 'longitude'> | null;
  } = $props();

  let query = $state('');
  let results = $state<Place[]>([]);
  let open = $state(false);
  let active = $state(-1);
  let searching = $state(false);
  /** The list shows results for an older query: dimmed and not selectable. */
  let stale = $state(false);
  /** Enter was pressed while stale: pick the first fresh result when it arrives. */
  let enterPending = false;
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const listId = 'place-results';

  function oninput() {
    clearTimeout(timer);
    controller?.abort();
    enterPending = false;
    const q = query.trim();
    if (q.length < 2) {
      results = [];
      open = false;
      stale = false;
      return;
    }
    stale = true;
    timer = setTimeout(async () => {
      const current = (controller = new AbortController());
      searching = true;
      try {
        results = await searchPlaces(q, i18n.lang, current.signal, near);
        active = results.length ? 0 : -1;
        open = true;
        stale = false;
        if (enterPending && results.length) choose(results[0]);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          results = [];
          stale = false;
        }
      } finally {
        if (controller === current) searching = false;
        enterPending = false;
      }
    }, 250);
  }

  function choose(place: Place) {
    onselect(place);
    query = '';
    results = [];
    open = false;
    active = -1;
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && stale) {
      e.preventDefault();
      enterPending = true;
      return;
    }
    if (!open || !results.length) {
      if (e.key === 'Escape') query = '';
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      active = (active + 1) % results.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active - 1 + results.length) % results.length;
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      open = false;
    }
  }
</script>

<div class="search">
  <label class="visually-hidden" for="place-input">{i18n.t.searchLabel}</label>
  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
    <path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  </svg>
  <input
    id="place-input"
    type="search"
    role="combobox"
    autocomplete="off"
    spellcheck="false"
    placeholder={i18n.t.searchPlaceholder}
    aria-expanded={open}
    aria-controls={listId}
    aria-autocomplete="list"
    aria-activedescendant={open && active >= 0 ? `place-opt-${active}` : undefined}
    bind:value={query}
    {oninput}
    {onkeydown}
    onfocus={() => (open = results.length > 0)}
    onblur={() => setTimeout(() => (open = false), 150)}
  />
  {#if stale || searching}<span class="spinner" aria-hidden="true"></span>{/if}

  {#if open}
    <ul class="results" class:stale id={listId} role="listbox" aria-busy={stale}>
      {#each results as place, i (`${place.latitude},${place.longitude}`)}
        <li
          id="place-opt-{i}"
          role="option"
          aria-selected={i === active}
          class:active={i === active}
          onpointerdown={(e) => {
            e.preventDefault();
            choose(place);
          }}
          onpointerenter={() => (active = i)}
        >
          <span class="name">{place.name}</span>
          <span class="detail">{place.detail}</span>
        </li>
      {:else}
        <li class="empty" role="option" aria-selected="false" aria-disabled="true">
          {i18n.t.noResults}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .search {
    position: relative;
    flex: 1 1 280px;
    min-width: 0;
  }
  .icon {
    position: absolute;
    left: 14px;
    top: 50%;
    width: 18px;
    height: 18px;
    transform: translateY(-50%);
    color: var(--muted);
    pointer-events: none;
  }
  input {
    width: 100%;
    height: 48px;
    padding: 0 44px 0 42px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    font-size: 1rem;
    box-shadow: var(--shadow);
    appearance: none;
  }
  input::placeholder {
    color: var(--muted);
  }
  input:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 1px;
  }
  .spinner {
    position: absolute;
    right: 16px;
    top: 50%;
    width: 16px;
    height: 16px;
    margin-top: -8px;
    border: 2px solid var(--grid);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 700ms linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .results {
    position: absolute;
    z-index: 20;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    margin: 0;
    padding: 6px;
    list-style: none;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.14);
  }
  .results.stale {
    opacity: 0.5;
    pointer-events: none;
  }
  li {
    display: flex;
    flex-direction: column;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
  }
  li.active {
    background: var(--accent-wash);
  }
  .name {
    font-weight: 600;
  }
  .detail {
    font-size: 0.8125rem;
    color: var(--ink-2);
  }
  .empty {
    color: var(--ink-2);
    cursor: default;
  }
</style>
