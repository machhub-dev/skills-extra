// One HMI per app: the tag hub, the alarm feed and the operate permission,
// shared through Svelte context. Copy to src/lib/hmi/hmi.svelte.ts.
import { getContext, setContext } from "svelte";
import { AlarmFeed, TagHub, canOperate, createSimSdk, type HmiSdk, type SimControls } from "./core";

export interface Hmi {
  hub: TagHub;
  alarms: AlarmFeed;
  /** Whether the user may operate; false until checked, and on any error. */
  readonly canOperate: boolean;
  readonly connected: boolean;
  /** Set when the app runs on the simulator (?sim). */
  sim?: SimControls;
}

const KEY = Symbol("hmi");

/**
 * Call once in the root layout. `getSdk` is the app's SDK singleton
 * (machhub-sdk-initialization). With ?sim in the URL and a `sim` scenario,
 * the simulator stands in and its controls are on window.__hmiSim for
 * Playwright. Keep the scenario out of production builds if it is large:
 * `sim: import.meta.env.DEV ? scenario : undefined`.
 */
export function provideHmi(
  getSdk: () => Promise<HmiSdk>,
  options: { operateFeature?: string; sim?: Parameters<typeof createSimSdk>[0] } = {},
): Hmi {
  const useSim = !!options.sim && typeof location !== "undefined" && new URLSearchParams(location.search).has("sim");
  // A test can adjust the scenario before load: page.addInitScript(() => (window.__hmiSimInit = { allowed: false })).
  const sim = useSim ? createSimSdk({ ...options.sim, ...(globalThis as any).__hmiSimInit }) : undefined;
  if (sim) (globalThis as any).__hmiSim = sim;

  let hub = $state<TagHub>(null!);
  let alarms = $state<AlarmFeed>(null!);
  let operate = $state(false);
  let connected = $state(true);

  const ready = (sdk: HmiSdk) => {
    hub = new TagHub(sdk);
    alarms = new AlarmFeed(sdk);
    hub.onConnection((up) => (connected = up));
    void canOperate(sdk, options.operateFeature).then((ok) => (operate = ok));
  };

  if (sim) ready(sim.sdk);
  else void getSdk().then(ready);

  const hmi: Hmi = {
    get hub() { return hub; },
    get alarms() { return alarms; },
    get canOperate() { return operate; },
    get connected() { return connected; },
    sim,
  };
  setContext(KEY, hmi);
  return hmi;
}

export function useHmi(): Hmi {
  const hmi = getContext<Hmi>(KEY);
  if (!hmi) throw new Error("useHmi: call provideHmi in the root layout first.");
  return hmi;
}
