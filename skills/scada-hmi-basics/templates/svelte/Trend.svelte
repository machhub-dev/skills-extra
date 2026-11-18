<!--
  A live trend: the last `minutes` from the historian, then live values
  appended from the tag hub. uPlot (MIT) draws on canvas, so thousands of
  points stay cheap. npm i uplot
  The tags must have historization on (MACHHUB Namespace page).
-->
<script lang="ts">
  import uPlot from "uplot";
  import "uplot/dist/uPlot.min.css";
  import { useHmi } from "./hmi.svelte";

  interface Props {
    /** Series to plot; each needs historization on. */
    /** `range` is the pen's engineering range; operators read a fixed scale faster than one that rescales. */
    pens: { topic: string; label: string; unit?: string; range?: [number, number] }[];
    /** Loads history; pass sdk.historian.getHistoricalData bound to the SDK, or omit (live only). */
    history?: (topic: string, from: Date) => Promise<{ timestamp: string; value: unknown }[]>;
    minutes?: number;
    height?: number;
  }

  let { pens, history, minutes = 15, height = 220 }: Props = $props();
  const hmi = useHmi();
  let box: HTMLDivElement;

  // ISA-101: pens are distinguished by dash and shade before hue.
  const STROKES = ["#1f1f1f", "#5a5a5a", "#2f6fa5", "#8a5a00"];
  const DASHES = [[], [6, 4], [2, 3], [10, 3, 2, 3]];

  $effect(() => {
    if (!hmi.hub) return;
    const span = minutes * 60;
    const xs: number[] = [];
    const ys: (number | null)[][] = pens.map(() => []);
    // One scale and axis per unit, so % and rpm never share a range.
    const units = [...new Set(pens.map((p) => p.unit ?? ""))];
    const plot = new uPlot(
      {
        width: box.clientWidth,
        height,
        scales: {
          x: { time: true },
          ...Object.fromEntries(pens.filter((p) => p.range).map((p) => [p.unit || "y", { auto: false, range: p.range }])),
        },
        legend: { live: false },
        series: [{}, ...pens.map((p, i) => ({ label: p.unit ? `${p.label} (${p.unit})` : p.label, scale: p.unit || "y", stroke: STROKES[i % 4], dash: DASHES[i % 4], width: 1.5, spanGaps: true }))],
        axes: [
          { stroke: "currentColor" },
          ...units.map((u, i) => ({ scale: u || "y", label: u || undefined, side: i % 2 ? 1 : 3, stroke: "currentColor", grid: { show: i === 0 } })),
        ],
      },
      [xs, ...ys],
      box,
    );

    const push = (i: number, t: number, v: unknown) => {
      const n = Number(v);
      xs.push(t);
      ys.forEach((col, j) => col.push(j === i && Number.isFinite(n) ? n : null));
      const cut = xs.findIndex((x) => x >= t - span);
      if (cut > 0) {
        xs.splice(0, cut);
        ys.forEach((col) => col.splice(0, cut));
      }
    };

    let frame = 0;
    const redraw = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => plot.setData([xs, ...ys]));
    };

    const stops: (() => void)[] = [];
    void (async () => {
      if (history) {
        const from = new Date(Date.now() - span * 1000);
        const loaded = await Promise.all(pens.map((p) => history(p.topic, from).catch(() => [])));
        const rows = loaded.flatMap((r, i) => r.map((h) => ({ i, t: Date.parse(h.timestamp) / 1000, v: h.value })));
        rows.sort((a, b) => a.t - b.t).forEach((r) => push(r.i, r.t, r.v));
        redraw();
      }
      pens.forEach((p, i) => stops.push(hmi.hub.watch(p.topic, (r) => {
        push(i, r.at / 1000, r.value);
        redraw();
      })));
    })();

    const resize = new ResizeObserver(() => plot.setSize({ width: box.clientWidth, height }));
    resize.observe(box);
    return () => {
      stops.forEach((s) => s());
      resize.disconnect();
      cancelAnimationFrame(frame);
      plot.destroy();
    };
  });
</script>

<div class="trend" bind:this={box} data-trend></div>

<style>
  .trend { width: 100%; color: var(--hmi-fg); }
</style>
