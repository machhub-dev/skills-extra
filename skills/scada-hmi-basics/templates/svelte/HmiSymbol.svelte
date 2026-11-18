<!--
  One plant object on a screen: a contract SVG plus its tag, value and state.
  The binding drives data-* attributes on the root, which hmi.css and
  hmi-motion.css turn into colour, alarm and motion. Click or Enter selects it
  (opens the faceplate); it never writes to the plant itself.
-->
<script lang="ts">
  import { applySymbolState, observeSymbol, type SymbolBinding, type SymbolState } from "./core";
  import { useHmi } from "./hmi.svelte";

  interface Props {
    /** Unique on the screen; the faceplate and tests find the symbol by it. */
    id: string;
    binding: SymbolBinding;
    /** The symbol's SVG text, e.g. import pump from "$lib/symbols/pump.svg?raw". */
    svg: string;
    /** The plant tag, e.g. "P-101". */
    label: string;
    unit?: string;
    /** Width in px; height follows the SVG's viewBox. */
    size?: number;
    selected?: boolean;
    onselect?: (id: string) => void;
    /** Bind to read the symbol's live state (the faceplate uses it). */
    current?: SymbolState;
  }

  let { id, binding, svg, label, unit = "", size = 64, selected = false, onselect, current = $bindable() }: Props = $props();
  const hmi = useHmi();
  let el: HTMLElement;

  $effect(() => {
    if (!hmi.hub) return;
    return observeSymbol(binding, hmi.hub, hmi.alarms, (s) => {
      applySymbolState(el, s);
      current = s;
    });
  });

  const describe = (s?: SymbolState) =>
    [label, s?.run, s?.position, s?.value && `${s.value} ${unit}`.trim(), s?.alarm.priority !== "none" && `${s?.alarm.priority} alarm`, s?.quality !== "good" && s?.quality]
      .filter(Boolean)
      .join(", ");
</script>

<button
  bind:this={el}
  type="button"
  class="hmi-symbol"
  class:selected
  data-symbol={id}
  style:width="{size}px"
  aria-label={describe(current)}
  aria-pressed={selected}
  onclick={() => onselect?.(id)}
>
  {@html svg}
  <span class="tag" data-part="label">{label}</span>
  {#if binding.value}
    <span class="reading"><span data-part="value">–</span>{#if unit}<span class="unit">{unit}</span>{/if}</span>
  {/if}
</button>

<style>
  .hmi-symbol {
    display: grid;
    justify-items: center;
    gap: 2px;
    padding: 4px;
    border: 1px solid transparent;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  .hmi-symbol:focus-visible,
  .hmi-symbol.selected {
    border-color: var(--hmi-fg);
    outline: none;
  }
  .tag {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .reading {
    font-size: 13px;
    white-space: nowrap;
  }
  .unit {
    margin-left: 3px;
    color: var(--hmi-muted);
    font-size: 11px;
  }
</style>
