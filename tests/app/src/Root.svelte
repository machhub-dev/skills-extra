<script lang="ts">
  import { provideHmi } from "$lib/hmi/hmi.svelte";
  import UnitScreen from "$lib/hmi/UnitScreen.svelte";
  import PidUnit from "$lib/hmi/PidUnit.svelte";
  import { unitSim } from "$lib/hmi/unit.sim";

  // No runtime here: every screen runs on the simulator (?sim).
  provideHmi(() => Promise.reject(new Error("no runtime in the template tests")), { sim: unitSim });
  const screen = new URLSearchParams(location.search).get("screen");
</script>

{#if screen === "pid"}<PidUnit />{:else}<UnitScreen />{/if}
