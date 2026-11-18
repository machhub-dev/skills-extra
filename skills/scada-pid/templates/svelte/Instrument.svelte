<!--
  An ISA-5.1 instrument bubble: function letters over the loop number, with
  the location line (none: field; solid: control room panel; the circle in a
  square: shared display or DCS). Its live value sits beside it.
-->
<script lang="ts">
  import { applySymbolState, observeSymbol, type SymbolBinding, type SymbolState } from "./core";
  import { useHmi } from "./hmi.svelte";

  interface Props {
    id: string;
    /** ISA-5.1 letters: first is the measured variable (L level, F flow, P pressure, T temperature), then readout or function (T transmitter, I indicator, C controller, A alarm). */
    letters: string;
    loop: string;
    location?: "field" | "panel" | "dcs";
    binding?: SymbolBinding;
    unit?: string;
    x: number;
    y: number;
    r?: number;
    onselect?: (id: string) => void;
    current?: SymbolState;
  }

  let { id, letters, loop, location = "field", binding, unit = "", x, y, r = 18, onselect, current = $bindable() }: Props = $props();
  const hmi = useHmi();
  let el: SVGGElement;

  $effect(() => {
    if (!hmi.hub || !binding) return;
    return observeSymbol(binding, hmi.hub, hmi.alarms, (s) => {
      applySymbolState(el, s);
      current = s;
    });
  });
</script>

<g
  bind:this={el}
  class="instrument"
  data-symbol={id}
  transform="translate({x} {y})"
  role="button"
  tabindex="0"
  aria-label="{letters}-{loop}{current?.value ? `, ${current.value} ${unit}` : ''}"
  onclick={() => onselect?.(id)}
  onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onselect?.(id)}
>
  <circle data-part="alarm-ring" r={r + 4} />
  {#if location === "dcs"}<rect x={-r} y={-r} width={r * 2} height={r * 2} class="frame" />{/if}
  <circle data-part="body" r={r} />
  {#if location === "panel" || location === "dcs"}<line x1={-r} x2={r} y1="0" y2="0" class="frame" />{/if}
  <text class="letters" y={-3} text-anchor="middle">{letters}</text>
  <text class="loop" y={11} text-anchor="middle">{loop}</text>
  {#if binding?.value}
    <text class="reading" x={r + 6} y="4"><tspan data-part="value">–</tspan>{#if unit}<tspan class="unit"> {unit}</tspan>{/if}</text>
  {/if}
</g>

<style>
  .instrument { cursor: pointer; outline: none; }
  .instrument [data-part="body"] { fill: var(--hmi-panel); stroke: var(--hmi-equip-stroke); stroke-width: 1.5; }
  .frame { fill: none; stroke: var(--hmi-equip-stroke); stroke-width: 1.5; }
  .letters { font: 600 10px var(--hmi-font); fill: var(--hmi-fg); }
  .loop { font: 10px var(--hmi-font); fill: var(--hmi-fg); }
  .reading { font: 13px var(--hmi-font); fill: var(--hmi-fg); }
  .unit { fill: var(--hmi-muted); font-size: 11px; }
  .instrument:focus-visible .letters { text-decoration: underline; }
</style>
