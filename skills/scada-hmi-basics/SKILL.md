---
name: scada-hmi-basics
description: "Build SCADA and HMI screens on MACHHUB: live equipment status, alarms, data quality, trends and operator control (start, stop, setpoints) in a hosted SDK app, or a read-only mimic in a v2 HTML Artifact. Use for an operator screen, an HMI or SCADA app, a faceplate, an alarm banner, a live trend, or writing to the plant from a MACHHUB app."
license: MPL-2.0
metadata:
  related_skills: "scada-pid, scada-animation, scada-assets, machhub-sdk-initialization, machhub-sdk-realtime, machhub-sdk-advanced, machhub-sveltekit-svelte, machhub-permission-json"
---

# SCADA screens on MACHHUB

A SCADA screen here is a hosted MACHHUB app (a client-only SPA on `@machhub-dev/sdk-ts`) that shows the plant from the Unified Namespace and lets operators act on it safely. This skill gives you a framework-free **HMI core** that does the hard parts once (tag fan-out, alarms, data quality, confirmed writes, a simulator) and Svelte 5 components on top. It is the interim way to build SCADA on MACHHUB until MACHHUB Screens ships.

Four skills work together: this one (screens, data, alarms, control), `scada-pid` (P&ID drawings and pipes), `scada-animation` (motion), `scada-assets` (symbols).

## 1. Choose the surface

| Need | Surface |
|---|---|
| Charts, live values and alarm tables, no custom graphics | MACHHUB's built-in dashboards. Stop here. |
| A read-only mimic on a dashboard | A v2 HTML Artifact. See [`references/surfaces.md`](references/surfaces.md). |
| Equipment graphics, P&ID, faceplates, operator control | A hosted SDK app: the rest of this skill. |

v1 boxes run one app per Workspace (`default`); v2 runs several (`?app=` on upload). Everything below works on both unless marked **v2**.

## 2. Set up the app

1. Initialise the SDK as `machhub-sdk-initialization` says (`await sdk.Initialize()` with no arguments), and follow `machhub-sveltekit-svelte` for the Svelte project. Other frameworks: use the core alone (step 4's `bindScreen`) and that framework's skill.
2. Copy [`templates/core/`](templates/core/) to `src/lib/hmi/core/` and the Svelte files in [`templates/svelte/`](templates/svelte/) to `src/lib/hmi/`. Import `core/hmi.css` once at the root, and `hmi-motion.css` from `scada-animation`.
3. In the root layout: `provideHmi(getSdk, { sim: unitSim })`. It builds one `TagHub` (the only code that touches `sdk.tag`), one `AlarmFeed` and the operate permission, and swaps in the simulator when the URL has `?sim`.

The core uses SDK features newer than `2.0.0-next.0`: `sdk.alarms`, `sdk.tag.onConnectionChange`, and the value-quality argument to `subscribe`. On an older SDK it still runs, but without alarms, and it assumes the link is up and every value is good.

## 3. Plan the screens

Lay screens out by ISA-101 display level, and keep the ISA-101 look: grey, colour only for abnormal states. [`references/isa101.md`](references/isa101.md) has the levels, the colour and text rules, and the navigation.

## 4. Bind the plant

One **binding map** per screen names every topic it reads; it is the only file that knows topic names (`templates/svelte/unit.bindings.ts`):

```ts
export const bindings = {
  "P-101": {
    run: "PlantA/Area1/Unit1/P101/Running",
    value: { topic: "PlantA/Area1/Unit1/P101/Speed", format: (v) => Number(v).toFixed(0) },
    mode: "PlantA/Area1/Unit1/P101/Mode",
    source: "datasources:plc1",
  },
} satisfies BindingMap;
```

- Topics are exact UNS paths, copied from the Namespace page or the namespace JSON (`machhub-namespace-json`); the hub refuses wildcards.
- `source` is the data source that reads the point. It is how a symbol learns that its PLC link is down.
- Value mappers (`map`, `format`) belong in the binding map, never in components.

Place each object with `<HmiSymbol id binding svg label unit onselect bind:current>`. Without Svelte, mark elements `data-symbol="P-101"` and call `bindScreen(root, bindings, hub, alarms)`.

## 5. Alarms

MACHHUB's ISA-18.2 engine is the only alarm source: configure rules on MACHHUB's Alarms page, never as limits in screen code. `AlarmFeed` polls `sdk.alarms` once for the app; each symbol shows the worst alarm on its topics (or its `alarmRules`) as colour, shape and priority number, blinking until acknowledged. Put `<AlarmBanner/>` on every screen. Acknowledge from the faceplate (`alarms.ack(ruleIds, comment)`). Reading alarms needs the dashboard feature; acknowledging and shelving need it at read-write.

## 6. Data quality

A value an operator cannot trust must look untrustworthy. The symbol's `data-quality` is the worst of:

| State | From | Shows |
|---|---|---|
| `comms-lost` | The app's MQTT link is down, or the binding's `source` is stopped or disconnected | Symbol greyed, value struck through, no motion, control disabled |
| `bad` | The adapter marked the value bad, or its source lists the point as failing | Dashed body, value struck through, control disabled |
| `stale` | Opt-in `staleAfterMs` with no new value | As bad |
| `uncertain` | The adapter marked it uncertain (OPC UA) | Value in italics with `?` |

Details, and why `staleAfterMs` is off by default, are in [`references/data-quality.md`](references/data-quality.md).

## 7. Operator control

Every write to the plant goes through the faceplate and follows the safe write pattern: permission first, select then execute with a confirmation, no optimistic UI, writes refused on bad data, interlocks left in the PLC. [`references/controls.md`](references/controls.md) holds the rules and the permission setup; read it before adding any control.

## 8. Trends

`<Trend pens={[{ topic, label, unit, range: [0, 100] }]} history={…}/>` loads the last minutes from the historian, then appends live values, on uPlot (canvas, MIT): `npm i uplot`. Give each pen its engineering `range`; operators read a fixed scale faster. Tags need historization on. Use SVG for everything else on a screen and canvas only for trends: `scada-pid` says when a screen is big enough to change that.

## 9. Verify

Copy [`templates/tests/hmi.spec.ts`](templates/tests/hmi.spec.ts) and adapt it to your screen. It drives tags, alarms, source health and the link through the simulator (`window.__hmiSim`) and asserts the contract attributes, so it needs no runtime:

```bash
npx playwright test --trace off
```

Done when, for every symbol on the screen, a test drives each state its binding can show (each value, an alarm raised and acknowledged, bad data, comms lost) and every control's confirm, success and refusal; and all tests pass. Then watch the screen against a dev runtime fed by [`scripts/simulate.mjs`](scripts/simulate.mjs), which publishes scripted values to a topic prefix you keep for simulation; it is a dry run unless given `--apply`.

## Hand-off

- P&ID drawings, pipes and instrument bubbles: `scada-pid`.
- What moves and how: `scada-animation`.
- A symbol you do not have: `scada-assets`.
- Uploading the build: `machhub-sdk-initialization` (Designer upload, Application Type SPA).
