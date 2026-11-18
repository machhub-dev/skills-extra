---
name: scada-pid
description: "P&ID-style process graphics on MACHHUB: equipment placed on one SVG drawing, process lines that snap to symbol ports and show live flow, ISA-5.1 instrument bubbles, and drill-down between display levels. Use for a P&ID screen, a process mimic, a piping or flow diagram with live data, or laying out a whole unit or plant."
license: MPL-2.0
metadata:
  related_skills: "scada-hmi-basics, scada-animation, scada-assets"
---

# P&ID screens

A P&ID screen is one `<svg>` drawing on a fixed sheet (say 960 × 420 units) that scales to any panel. Equipment sits at sheet coordinates, process lines run between symbol **ports**, and everything is bound through the same HMI core as `scada-hmi-basics`. Set that skill up first: this one adds the drawing.

Copy [`templates/svelte/`](templates/svelte/) into `src/lib/hmi/` beside the basics templates: `pid.ts` (ports and routing), `PidSymbol.svelte`, `Pipe.svelte`, `Instrument.svelte`, and the reference screen `PidUnit.svelte` with `pid.bindings.ts`.

## 1. Sketch the drawing

Work from the plant's P&ID, simplified for operating: keep the main process lines, the equipment an operator acts on, and the instruments they read; drop line numbers, spec breaks, drains and vents. Put flow left to right and top to bottom, and one unit per screen (ISA-101 level 2). More than about 40 objects is two screens.

Symbols follow ISA-5.1 for instruments and ISO 10628 for equipment. [`references/symbols.md`](references/symbols.md) maps common equipment to the fetched sets and gives the instrument letters.

## 2. Place equipment

```ts
const at = { tank: { x: 60, y: 40, w: 180 }, pump: { x: 340, y: 230, w: 110 } } satisfies Record<string, Placement>;
```

```svelte
<PidSymbol id="P-101" label="P-101" svg={pump} at={at.pump} binding={pidBindings["P-101"]} onselect={select} bind:current={states["P-101"]} />
```

`w` is the width on the sheet; height follows the symbol's `viewBox`. Every symbol needs its ports (`scada-assets`, `--strict`).

## 3. Draw the lines

```ts
const pumpIn = portAt(pump, "in", at.pump);
const tankOut = portAt(tank, "out", at.tank);
const suction = route(tankOut, pumpIn, [[tankOut[0], pumpIn[1]]]);
```

```svelte
<Pipe id="suction" d={suction} binding={{ flow: "PlantA/Area1/Unit1/P101/Running", source: "datasources:plc1" }} />
```

`portAt` reads the port from the symbol's SVG, so a line ends exactly on it, and throws on a misspelt port. `route` draws orthogonal legs through corner points. Draw pipes before symbols, so symbols cover line ends. A line's `flow` binding sets `data-flow` (forward, reverse, none); the motion is in `scada-animation`. [`references/pipes-and-flow.md`](references/pipes-and-flow.md) covers line weights, crossings, flow that depends on several tags, and signal lines.

## 4. Add instruments

```svelte
<Instrument id="LT-101" letters="LT" loop="101" location="dcs" x={362} y={70} unit="%" binding={pidBindings["LT-101"]} onselect={select} />
```

The bubble's location line follows ISA-5.1 (none: field, line: panel, circle in a square: DCS or shared display). Join it to its process point with a `signal` pipe.

## 5. Navigation between levels

Selecting an object opens its faceplate (`scada-hmi-basics`). For drill-down, give a unit's L1 tile an `href` to its P&ID, and the P&ID a link to each equipment's L3 detail page; keep one action back up. Use the app's router; the HMI core holds no navigation state.

## 6. Verify

Copy [`templates/tests/pid.spec.ts`](templates/tests/pid.spec.ts) beside `hmi.spec.ts`. It checks that every pipe end sits on a port (within 1.5 px on screen), that flow follows the plant, that motion stops on untrusted data, and that instruments show values.

Done when those pass for the screen, every object on it opens its faceplate, and a screenshot at the site's smallest panel size shows no overlapping labels or lines.

## Big screens

SVG holds a unit comfortably. A plant overview with more than about 2,000 elements changing every second, or particle-style flow, can move to canvas. [`references/scale-out.md`](references/scale-out.md) says when and how, and why HTML-in-Canvas is not the answer yet.
