<!--
  Reference screen: one process unit at ISA-101 level 2. Alarm banner on top,
  equipment in process order, the faceplate of the selected object beside it,
  and a trend below. Copy, then change unit.bindings.ts to your plant.
-->
<script lang="ts">
  import AlarmBanner from "./AlarmBanner.svelte";
  import Faceplate from "./Faceplate.svelte";
  import HmiSymbol from "./HmiSymbol.svelte";
  import Trend from "./Trend.svelte";
  import type { SymbolState } from "./core";
  import { bindings, controls } from "./unit.bindings";
  // Symbols that follow the contract (scada-assets). Vite's ?raw gives the SVG text.
  import pump from "$lib/symbols/pump-centrifugal.svg?raw";
  import tank from "$lib/symbols/tank-vertical.svg?raw";
  import valve from "$lib/symbols/valve-gate.svg?raw";

  type Id = keyof typeof bindings;
  let selected = $state<Id | null>(null);
  let states = $state<Partial<Record<Id, SymbolState>>>({});

  const equipment: { id: Id; svg: string; unit?: string }[] = [
    { id: "T-101", svg: tank, unit: "%" },
    { id: "P-101", svg: pump, unit: "rpm" },
    { id: "XV-101", svg: valve },
  ];
</script>

<div class="hmi-screen screen">
  <AlarmBanner />
  <main>
    <section class="process" aria-label="Unit 1 process">
      {#each equipment as e (e.id)}
        <HmiSymbol
          id={e.id}
          label={e.id}
          svg={e.svg}
          unit={e.unit}
          binding={bindings[e.id]}
          size={72}
          selected={selected === e.id}
          onselect={(id) => (selected = id as Id)}
          bind:current={states[e.id]}
        />
      {/each}
    </section>
    {#if selected}
      <aside>
        <Faceplate title={selected} current={states[selected]} controls={controls[selected]} onclose={() => (selected = null)} />
      </aside>
    {/if}
  </main>
  <section class="trends" aria-label="Trends">
    <Trend pens={[
      { topic: "PlantA/Area1/Unit1/T101/Level", label: "T-101 level", unit: "%", range: [0, 100] },
      { topic: "PlantA/Area1/Unit1/P101/Speed", label: "P-101 speed", unit: "rpm", range: [0, 1500] },
    ]} />
  </section>
</div>

<style>
  .screen { min-height: 100vh; display: grid; grid-template-rows: auto 1fr auto; }
  main { display: flex; gap: 24px; align-items: flex-start; padding: 24px; }
  .process { display: flex; gap: 40px; align-items: flex-end; flex: 1; }
  aside { flex: 0 0 auto; }
  .trends { padding: 0 24px 24px; }
</style>
