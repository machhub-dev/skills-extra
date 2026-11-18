<!--
  A process line on a P&ID drawing. `d` comes from pid.ts route(), between
  symbol ports. With a flow binding the line shows direction and motion
  (hmi-motion.css); without one it is a static line. Draw pipes before
  symbols, so symbols sit on top of line ends.
-->
<script lang="ts">
  import { applySymbolState, observeSymbol, type SymbolBinding } from "./core";
  import { useHmi } from "./hmi.svelte";

  interface Props {
    id: string;
    d: string;
    /** Only `flow` (and `source`) matter for a pipe. */
    binding?: Pick<SymbolBinding, "flow" | "source">;
    /** Line class: main process lines are heavier than utility lines. */
    weight?: "main" | "utility" | "signal";
  }

  let { id, d, binding, weight = "main" }: Props = $props();
  const hmi = useHmi();
  let el: SVGPathElement;

  $effect(() => {
    if (!hmi.hub || !binding?.flow) return;
    return observeSymbol(binding, hmi.hub, undefined, (s) => applySymbolState(el, s));
  });
</script>

<path bind:this={el} {d} data-pipe={id} class={weight} />

<style>
  path.main { --pipe-width: 4; }
  path.utility { --pipe-width: 2; }
  /* ISA-5.1 electrical signal: dashed, thin, never animated. */
  path.signal { --pipe-width: 1; stroke-dasharray: 6 3; animation: none; }
</style>
