# Motion recipes

Each recipe needs a symbol part from the contract (`scada-assets`) and a binding (`scada-hmi-basics`). Tuning is by CSS variables on the symbol or a parent, so screens never edit the stylesheet.

| Recipe | Part | Binding | Variable |
|---|---|---|---|
| Rotor turns while running | `rotor` | `run` | `--rotor-period` (default 1.2 s per turn) |
| Rotor turns with speed | `rotor`, symbol marked `data-rotor="speed"` | `rotorBySpeed(symbol, hub, speedTopic, nominal)` | its `periodAtNominal` argument |
| Flow along a pipe | `[data-pipe]` path | `flow` | `--flow-period` (0.8 s per dash pattern), `--pipe-width` |
| Valve travel | `stem` | `position` | none |
| Vessel level | `fill-level` | `level` with `min`, `max` | none; 400 ms transition in `hmi.css` |
| Alarm blink | `alarm-ring`, and the badge | alarms via `AlarmFeed` | `--hmi-blink` (1 s) |

## Rotors

A rotor turns about the centre of its own bounding box. If a blade shape is lopsided, the rotor wobbles: wrap it with an invisible square centred on the shaft (`<rect … fill="none"/>` inside the rotor group).

Starting and stopping turn at a third of the speed, so an operator sees the transition.

## Flow

The dash pattern (10 on, 6 off) sums to 16 units, and one keyframe moves the dashes by 16, so the loop has no seam. If you change the dash pattern, change the keyframe distance to its sum. Thicker lines read better with a longer pattern: at `--pipe-width: 6`, use `stroke-dasharray: 14 8` and a 22-unit keyframe in a screen-level stylesheet.

Faster flow is a shorter `--flow-period`; set it from a flow value only when operators asked for it, because speed on a pipe is easily read as a measurement it is not.

## A Motion sequence

For a guided sequence, such as highlighting the steps of a batch phase in order, use Motion (`npm i motion`), and keep it out of the live data path:

```ts
import { animate } from "motion";

export function showPhase(steps: Element[]) {
  return animate(
    steps.map((el, i) => [el, { opacity: [0.35, 1] }, { duration: 0.3, at: i * 0.4 }] as const),
  );
}
```

It returns controls (`.stop()`, `.finished`); stop it when the screen unmounts. Under reduced motion, show the final state at once instead.

## Performance

Keep a screen at 60 fps on the site's slowest panel. CSS animations of `transform`, `opacity` and `stroke-dashoffset` run in the compositor; a few hundred at once is fine. If frame time climbs, first stop animating what is off screen or covered, then see `scada-pid`'s scale-out notes.
