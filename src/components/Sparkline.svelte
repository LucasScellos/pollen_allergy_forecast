<script lang="ts">
  import type { HourlyPoint } from '../lib/pollen';

  /** `floor` is the minimum y-scale max, so tiny noise isn't blown up into a spike. */
  let { points, floor }: { points: HourlyPoint[]; floor: number } = $props();

  const W = 96;
  const H = 28;

  const path = $derived.by(() => {
    const vals = points.map((p) => p.value ?? 0);
    if (vals.length < 2) return { line: '', area: '' };
    const max = Math.max(floor, ...vals);
    const xy = vals.map(
      (v, i) => [(i / (vals.length - 1)) * W, H - 2 - (v / max) * (H - 4)] as const,
    );
    const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
    return { line, area: `${line}L${W},${H}L0,${H}Z` };
  });
</script>

<svg viewBox="0 0 {W} {H}" width={W} height={H} aria-hidden="true" preserveAspectRatio="none">
  <path d={path.area} fill="var(--accent)" opacity="0.1" />
  <path
    d={path.line}
    fill="none"
    stroke="var(--accent)"
    stroke-width="1.5"
    stroke-linejoin="round"
    stroke-linecap="round"
    vector-effect="non-scaling-stroke"
  />
</svg>

<style>
  svg {
    display: block;
    flex: none;
  }
</style>
