<!--
  Reference P&ID screen (ISA-101 level 2, process view): tank, pump and valve
  joined by process lines that snap to symbol ports, with ISA-5.1 instrument
  bubbles. One <svg> with a fixed drawing size scales to any panel.
-->
<script lang="ts">
  import AlarmBanner from "./AlarmBanner.svelte";
  import Faceplate from "./Faceplate.svelte";
  import Instrument from "./Instrument.svelte";
  import PidSymbol from "./PidSymbol.svelte";
  import Pipe from "./Pipe.svelte";
  import type { SymbolState } from "./core";
  import { portAt, route, type Placement } from "./pid";
  import { pidBindings, pipeBindings } from "./pid.bindings";
  import { controls } from "./unit.bindings";
  import pump from "$lib/symbols/pump-centrifugal.svg?raw";
  import tank from "$lib/symbols/tank-vertical.svg?raw";
  import valve from "$lib/symbols/valve-gate.svg?raw";

  // Drawing coordinates: a 960 x 420 sheet.
  const at = {
    tank: { x: 60, y: 40, w: 180 } satisfies Placement,
    pump: { x: 340, y: 230, w: 110 } satisfies Placement,
    valve: { x: 580, y: 196, w: 84 } satisfies Placement,
  };
  const tankOut = portAt(tank, "out", at.tank);
  const pumpIn = portAt(pump, "in", at.pump);
  const pumpOut = portAt(pump, "out", at.pump);
  const valveIn = portAt(valve, "in", at.valve);
  const valveOut = portAt(valve, "out", at.valve);

  const pipes = {
    suction: route(tankOut, pumpIn, [[tankOut[0], pumpIn[1]]]),
    discharge: route(pumpOut, valveIn, [[pumpOut[0], valveIn[1]]]),
    outlet: route(valveOut, [900, valveOut[1]]),
  };

  type Id = keyof typeof pidBindings;
  let selected = $state<Id | null>(null);
  let states = $state<Partial<Record<Id, SymbolState>>>({});
  const select = (id: string) => (selected = id as Id);
</script>

<div class="hmi-screen screen">
  <AlarmBanner />
  <main>
    <svg class="sheet" viewBox="0 0 960 420" role="group" aria-label="Unit 1 P&ID">
      {#each Object.entries(pipes) as [id, d] (id)}
        <Pipe {id} {d} binding={pipeBindings[id as keyof typeof pipeBindings]} />
      {/each}
      <Pipe id="lt101-signal" d={route([195, 70], [342, 70])} weight="signal" />

      <PidSymbol id="T-101" label="T-101" svg={tank} at={at.tank} labelSide="right" binding={pidBindings["T-101"]} selected={selected === "T-101"} onselect={select} bind:current={states["T-101"]} />
      <PidSymbol id="P-101" label="P-101" svg={pump} at={at.pump} binding={pidBindings["P-101"]} selected={selected === "P-101"} onselect={select} bind:current={states["P-101"]} />
      <PidSymbol id="XV-101" label="XV-101" svg={valve} at={at.valve} binding={pidBindings["XV-101"]} selected={selected === "XV-101"} onselect={select} bind:current={states["XV-101"]} />

      <Instrument id="LT-101" letters="LT" loop="101" location="dcs" x={362} y={70} unit="%" binding={pidBindings["LT-101"]} onselect={select} bind:current={states["LT-101"]} />
      <Instrument id="FT-102" letters="FT" loop="102" x={740} y={valveOut[1] - 46} unit="m³/h" binding={pidBindings["FT-102"]} onselect={select} bind:current={states["FT-102"]} />
      <Pipe id="ft102-tap" d={route([740, valveOut[1] - 28], [740, valveOut[1]])} weight="signal" />
    </svg>
    {#if selected}
      <aside>
        <Faceplate title={selected} current={states[selected]} controls={controls[selected as keyof typeof controls] ?? {}} onclose={() => (selected = null)} />
      </aside>
    {/if}
  </main>
</div>

<style>
  .screen { min-height: 100vh; display: grid; grid-template-rows: auto 1fr; }
  main { display: flex; gap: 16px; align-items: flex-start; padding: 16px; }
  .sheet { flex: 1; min-width: 0; max-height: calc(100vh - 80px); }
  aside { flex: 0 0 auto; }
</style>
