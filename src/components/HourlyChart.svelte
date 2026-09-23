<script lang="ts">
  import {
    POLLENS,
    levelFor,
    localHour,
    niceTicks,
    seriesFor,
    type Forecast,
    type Level,
    type PollenKey,
  } from '../lib/pollen';
  import { i18n } from '../lib/i18n.svelte';
  import LevelBadge from './LevelBadge.svelte';

  let {
    forecast,
    allergen,
    selectedDay = $bindable(0),
  }: { forecast: Forecast; allergen: PollenKey; selectedDay?: number } = $props();

  const H = 240;
  const M = { top: 12, right: 12, bottom: 30, left: 40 };

  let width = $state(640);
  let hover = $state<number | null>(null);
  let showTable = $state(false);

  const points = $derived(seriesFor(forecast, allergen));
  const info = $derived(POLLENS[allergen]);
  const name = $derived(i18n.t.pollens[allergen]);

  const pw = $derived(Math.max(10, width - M.left - M.right));
  const ph = H - M.top - M.bottom;
  const ticks = $derived(
    niceTicks(Math.max(info.thresholds[0] * 1.2, ...points.map((p) => p.value ?? 0))),
  );
  const yMax = $derived(ticks[ticks.length - 1]);

  const x = (i: number) => M.left + (points.length > 1 ? (i / (points.length - 1)) * pw : 0);
  const y = (v: number) => M.top + ph - (Math.min(v, yMax) / yMax) * ph;

  const linePath = $derived(
    points
      .map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value ?? 0).toFixed(1)}`)
      .join(''),
  );
  const areaPath = $derived(
    points.length
      ? `${linePath}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z`
      : '',
  );

  // Horizontal risk bands (low → very high) clipped to the visible axis.
  const bands = $derived(
    ([1, 2, 3, 4] as Level[])
      .map((level) => {
        const lo = level === 1 ? 1 : info.thresholds[level - 2];
        const hi = level === 4 ? Infinity : info.thresholds[level - 1];
        return { level, lo, hi: Math.min(hi, yMax) };
      })
      .filter((b) => b.lo < yMax),
  );

  // One segment per forecast day: [first index, last index].
  const daySpans = $derived(
    forecast.days.map((d, di) => {
      const first = points.findIndex((p) => p.time.startsWith(d.date));
      let last = first;
      while (last + 1 < points.length && points[last + 1].time.startsWith(d.date)) last++;
      return { date: d.date, index: di, first, last };
    }).filter((s) => s.first >= 0),
  );

  const nowIndex = $derived(points.findIndex((p) => p.time === localHour(forecast.timezone)));

  const hovered = $derived(hover != null ? points[hover] : null);
  const hoveredDay = $derived(
    hovered ? daySpans.find((s) => hovered.time.startsWith(s.date)) : undefined,
  );

  function indexAt(clientX: number, svg: SVGSVGElement) {
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * width;
    const i = Math.round(((px - M.left) / pw) * (points.length - 1));
    return Math.max(0, Math.min(points.length - 1, i));
  }

  function onkeydown(e: KeyboardEvent) {
    const cur = hover ?? (nowIndex >= 0 ? nowIndex : 0);
    if (e.key === 'ArrowRight') hover = Math.min(points.length - 1, cur + 1);
    else if (e.key === 'ArrowLeft') hover = Math.max(0, cur - 1);
    else if (e.key === 'Enter' && hoveredDay) selectedDay = hoveredDay.index;
    else if (e.key === 'Escape') hover = null;
    else return;
    e.preventDefault();
  }

  const tableRows = $derived(
    daySpans[selectedDay]
      ? points.slice(daySpans[selectedDay].first, daySpans[selectedDay].last + 1)
      : [],
  );
</script>

<section class="card" aria-labelledby="hourly-title">
  <div class="card-head">
    <h2 id="hourly-title">{i18n.t.hourlyTitle(name)}</h2>
    <button type="button" class="link-btn" onclick={() => (showTable = !showTable)}>
      {showTable ? i18n.t.showChart : i18n.t.showTable}
    </button>
  </div>

  {#if showTable}
    <div class="table-wrap">
      <table>
        <caption class="visually-hidden">{i18n.t.hourlyTitle(name)}</caption>
        <thead>
          <tr>
            <th scope="col">{i18n.t.time}</th>
            <th scope="col" class="num">{i18n.t.concentration}</th>
            <th scope="col">{i18n.t.level}</th>
          </tr>
        </thead>
        <tbody>
          {#each tableRows as p (p.time)}
            <tr>
              <td>{p.time.slice(11, 16)}</td>
              <td class="num">{p.value == null ? '—' : i18n.number(p.value)}</td>
              <td><LevelBadge level={levelFor(allergen, p.value)} size="sm" /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <div class="chart" bind:clientWidth={width}>
      <!-- Focusable so keyboard users can scrub hours with ←/→ (the table view is the full alternative). -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
      <svg
        viewBox="0 0 {width} {H}"
        width={width}
        height={H}
        role="img"
        aria-label="{i18n.t.hourlyTitle(name)}. {i18n.t.hourlyCaption}"
        tabindex="0"
        onpointermove={(e) => (hover = indexAt(e.clientX, e.currentTarget))}
        onpointerleave={() => (hover = null)}
        onclick={() => hoveredDay && (selectedDay = hoveredDay.index)}
        {onkeydown}
        onblur={() => (hover = null)}
      >
        <!-- selected day wash -->
        {#each daySpans as s (s.date)}
          {#if s.index === selectedDay}
            <rect
              x={x(s.first)}
              y={M.top}
              width={Math.max(0, x(s.last) - x(s.first))}
              height={ph}
              fill="var(--accent-wash)"
            />
          {/if}
        {/each}

        <!-- risk bands -->
        {#each bands as b (b.level)}
          <rect
            x={M.left}
            y={y(b.hi)}
            width={pw}
            height={Math.max(0, y(b.lo) - y(b.hi))}
            fill="var(--lvl-{b.level})"
            style:fill-opacity="var(--band-alpha)"
          />
          {#if y(b.lo) - y(b.hi) >= 14}
            <text class="band-label" x={M.left + pw - 4} y={y(b.hi) + 11} text-anchor="end">
              {i18n.t.levels[b.level]}
            </text>
          {/if}
        {/each}

        <!-- gridlines + y ticks -->
        {#each ticks as t (t)}
          <line class="grid" x1={M.left} x2={M.left + pw} y1={y(t)} y2={y(t)} />
          <text class="tick" x={M.left - 8} y={y(t) + 4} text-anchor="end">{i18n.number(t)}</text>
        {/each}

        <!-- day separators + labels -->
        {#each daySpans as s (s.date)}
          {#if s.first > 0}
            <line class="sep" x1={x(s.first)} x2={x(s.first)} y1={M.top} y2={M.top + ph} />
          {/if}
          <text
            class="day"
            class:active={s.index === selectedDay}
            x={(x(s.first) + x(s.last)) / 2}
            y={H - 8}
            text-anchor="middle"
          >
            {i18n.dayLabel(s.date, s.index)}
          </text>
        {/each}

        <line class="baseline" x1={M.left} x2={M.left + pw} y1={y(0)} y2={y(0)} />

        <!-- data -->
        <path d={areaPath} fill="var(--accent)" opacity="0.1" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--accent)"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />

        <!-- now marker -->
        {#if nowIndex >= 0}
          <line class="now" x1={x(nowIndex)} x2={x(nowIndex)} y1={M.top} y2={M.top + ph} />
          <circle
            cx={x(nowIndex)}
            cy={y(points[nowIndex].value ?? 0)}
            r="4"
            fill="var(--ink)"
            stroke="var(--surface)"
            stroke-width="2"
          />
        {/if}

        <!-- crosshair -->
        {#if hovered && hover != null}
          <line class="cross" x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + ph} />
          <circle
            cx={x(hover)}
            cy={y(hovered.value ?? 0)}
            r="5"
            fill="var(--accent)"
            stroke="var(--surface)"
            stroke-width="2"
          />
        {/if}
      </svg>

      {#if hovered && hover != null}
        {@const left = x(hover)}
        <div
          class="tooltip"
          style:left="{left}px"
          style:transform="translateX({left > width - 150 ? 'calc(-100% - 12px)' : '12px'})"
          role="status"
        >
          <strong class="tip-value">
            {hovered.value == null ? '—' : i18n.number(hovered.value)}
            <span class="tip-unit">{i18n.t.unit}</span>
          </strong>
          <span class="tip-time">
            {hoveredDay ? i18n.dayLabel(hoveredDay.date, hoveredDay.index) : ''} · {hovered.time.slice(11, 16)}
          </span>
          <LevelBadge level={levelFor(allergen, hovered.value)} size="sm" />
        </div>
      {/if}
    </div>
  {/if}
  <p class="subtle caption">{i18n.t.hourlyCaption}</p>
</section>

<style>
  .chart {
    position: relative;
    width: 100%;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
    touch-action: pan-y;
    cursor: crosshair;
    border-radius: 6px;
  }
  .grid {
    stroke: var(--grid);
    stroke-width: 1;
  }
  .baseline {
    stroke: var(--axis);
    stroke-width: 1;
  }
  .sep {
    stroke: var(--axis);
    stroke-width: 1;
  }
  .now {
    stroke: var(--ink-2);
    stroke-width: 1;
  }
  .cross {
    stroke: var(--ink-2);
    stroke-width: 1;
  }
  .tick,
  .band-label {
    fill: var(--muted);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
  .day {
    fill: var(--muted);
    font-size: 12px;
    text-transform: capitalize;
  }
  .day.active {
    fill: var(--ink);
    font-weight: 650;
  }
  .tooltip {
    position: absolute;
    top: 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    min-width: 128px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
    pointer-events: none;
    white-space: nowrap;
  }
  .tip-value {
    font-size: 1.125rem;
  }
  .tip-unit {
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--ink-2);
  }
  .tip-time {
    font-size: 0.8125rem;
    color: var(--ink-2);
    text-transform: capitalize;
  }
  .caption {
    margin-top: 10px;
    font-size: 0.8125rem;
  }
  .table-wrap {
    max-height: 340px;
    overflow: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }
  th,
  td {
    padding: 6px 8px;
    border-bottom: 1px solid var(--grid);
    text-align: left;
  }
  th {
    position: sticky;
    top: 0;
    background: var(--surface);
    color: var(--ink-2);
    font-weight: 600;
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
</style>
