# Pipes and flow

## Line weights

| `weight` | Use | Width |
|---|---|---|
| `main` | Main process lines | 4 |
| `utility` | Utilities, minor and return lines | 2 |
| `signal` | Instrument signals, dashed; never animated | 1 |

Set `--pipe-width` on a pipe's style to override one line. Line colour is `--hmi-pipe` for every process line: colour does not encode the fluid on an ISA-101 screen; label the line instead when the fluid matters.

## Routing

- `route(a, b, via)` draws horizontal-then-vertical legs through each `via` point. Add a corner point wherever the line must turn somewhere other than its end's row or column.
- Lines that cross do not join: where two cross, break the lower one with a 6-unit gap (two pipes meeting the crossing), the common P&ID convention.
- A tee is two pipes meeting a third at a point on it; give the junction a 3-unit dot (`<circle r="3">`) so it reads as connected.
- Off-sheet lines end in an arrow at the sheet edge with the destination screen's name, linked to that screen.

## Flow

A pipe's `flow` binding sets `data-flow`; `hmi-motion.css` animates `forward` and `reverse` and leaves `none` still. Bind flow to what the plant reports, in this order of preference:

1. A flow measurement: `{ topic: ".../FT102/Flow", map: (v) => (Number(v) > 0.5 ? "forward" : "none") }`, with a threshold above the meter's noise.
2. The equipment that drives it: the pump's running feedback for its suction and discharge.
3. A **computed tag** in MACHHUB when flow needs several conditions (pump running and valve open): one expression there, one topic here. Combining tags in screen code makes each screen answer the question differently.

Never infer flow from a command: a started pump with a closed valve does not flow.

Flow on bad or lost data stops moving (`scada-animation`), because motion claims the plant is moving now.

## Vessel levels

A vessel's level is its `level` binding with `min` and `max` in engineering units; the `fill-level` part scales to it. Show the number too (an `LT` instrument or the symbol's value), because a fill bar alone cannot be read to a percent.
