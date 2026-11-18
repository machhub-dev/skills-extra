<!--
  A plant object placed on a P&ID drawing (inside one <svg>). Same binding and
  contract as HmiSymbol, but SVG-native: it sits at drawing coordinates, so
  pipes from pid.ts meet its ports exactly. SVG has no ::after, so the alarm
  and mode badges are drawn here from the live state.
-->
<script lang="ts">
  import { applySymbolState, observeSymbol, type SymbolBinding, type SymbolState } from "./core";
  import { useHmi } from "./hmi.svelte";
  import { heightOf, type Placement } from "./pid";

  interface Props {
    id: string;
    binding: SymbolBinding;
    svg: string;
    label: string;
    unit?: string;
    at: Placement;
    /** Where the tag and value sit. */
    labelSide?: "below" | "right";
    selected?: boolean;
    onselect?: (id: string) => void;
    current?: SymbolState;
  }

  let { id, binding, svg, label, unit = "", at, labelSide = "below", selected = false, onselect, current = $bindable() }: Props = $props();
  const hmi = useHmi();
  let el: SVGGElement;
  const h = $derived(heightOf(svg, at.w));
  // The symbol's own <svg> gets a size, so it nests at the placement.
  const inner = $derived(svg.replace(/<svg\b/, `<svg width="${at.w}" height="${heightOf(svg, at.w)}"`));

  $effect(() => {
    if (!hmi.hub) return;
    return observeSymbol(binding, hmi.hub, hmi.alarms, (s) => {
      applySymbolState(el, s);
      current = s;
    });
  });

  const PRIORITY = { critical: "1", high: "2", medium: "3", low: "4" } as const;
  const tx = $derived(labelSide === "below" ? at.w / 2 : at.w + 6);
  const ty = $derived(labelSide === "below" ? h + 13 : h / 2 - 2);
  const anchor = $derived(labelSide === "below" ? "middle" : "start");

  function key(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onselect?.(id);
    }
  }
</script>

<g
  bind:this={el}
  class="pid-symbol"
  class:selected
  data-symbol={id}
  transform="translate({at.x} {at.y})"
  role="button"
  tabindex="0"
  aria-label="{label}{current?.value ? `, ${current.value} ${unit}` : ''}{current && current.alarm.priority !== 'none' ? `, ${current.alarm.priority} alarm` : ''}"
  onclick={() => onselect?.(id)}
  onkeydown={key}
>
  {#if selected}<rect class="focus" x="-4" y="-4" width={at.w + 8} height={h + 8} />{/if}
  {@html inner}
  <text class="tag" x={tx} y={ty} text-anchor={anchor} data-part="label">{label}</text>
  {#if binding.value}
    <text class="reading" x={tx} y={ty + 14} text-anchor={anchor}><tspan data-part="value">–</tspan>{#if unit}<tspan class="unit"> {unit}</tspan>{/if}</text>
  {/if}
  {#if current && current.alarm.priority !== "none"}
    <g class="badge" class:blink={!current.alarm.acked} class:returned={!current.alarm.active} transform="translate({at.w - 4} -10)" data-alarm-badge>
      {#if current.alarm.priority === "critical"}<path d="M7 0 L14 7 L7 14 L0 7 Z" />
      {:else if current.alarm.priority === "high"}<path d="M7 0 L14 14 L0 14 Z" />
      {:else if current.alarm.priority === "medium"}<rect width="14" height="14" />
      {:else}<circle cx="7" cy="7" r="7" />{/if}
      <text x="7" y="11" text-anchor="middle">{PRIORITY[current.alarm.priority]}</text>
    </g>
  {/if}
  {#if current?.mode === "manual" || current?.mode === "maintenance"}
    <g class="mode" transform="translate(-10 -10)"><rect width={current.mode === "manual" ? 12 : 26} height="12" /><text x="3" y="9.5">{current.mode === "manual" ? "M" : "MNT"}</text></g>
  {/if}
</g>

<style>
  .pid-symbol { cursor: pointer; outline: none; }
  .pid-symbol:focus-visible .tag { text-decoration: underline; }
  .focus { fill: none; stroke: var(--hmi-fg); stroke-width: 1; }
  .tag { font: 600 11px var(--hmi-font); fill: var(--hmi-fg); }
  .reading { font: 13px var(--hmi-font); fill: var(--hmi-fg); }
  .unit { fill: var(--hmi-muted); font-size: 11px; }
  .badge path, .badge rect, .badge circle { fill: var(--sym-alarm); stroke: none; }
  .badge text { font: 700 10px var(--hmi-font); fill: var(--hmi-alarm-ink); }
  .badge.returned path, .badge.returned rect, .badge.returned circle { fill: var(--hmi-panel); stroke: var(--sym-alarm); stroke-width: 2; }
  .badge.blink { animation: hmi-blink var(--hmi-blink) steps(1, end) infinite; }
  .mode rect { fill: var(--hmi-panel); stroke: var(--hmi-fg); }
  .mode text { font: 600 9px var(--hmi-font); fill: var(--hmi-fg); }
</style>
