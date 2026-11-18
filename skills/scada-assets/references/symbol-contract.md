# The symbol contract

Every symbol on a MACHHUB SCADA screen follows this contract. The binding (`hmi-binding.ts`) writes state; the theme (`hmi.css`) and motion (`hmi-motion.css`) read it. A symbol that follows the contract works on every screen with no code of its own.

## The file

- One `<svg>` root with a `viewBox`, and no `width` or `height`, so it scales to the box it is placed in. Any aspect ratio: tanks and columns are taller than wide.
- A `<title>` naming the equipment ("Centrifugal pump"): screen readers and tooltips use it.
- Vector only: no `<image>`, `<script>`, `<foreignObject>`, embedded font or `on…` attribute, and no `href` outside the file.
- **No colour.** `fill`, `stroke` and `stop-color` are `none`, `currentColor`, or absent. The theme sets them. Ink lines use `currentColor`.
- An `id` that `url(#…)` refers to collides when the symbol is on a page twice; avoid references, or prefix the id per instance.

## Parts

Code and CSS touch only elements marked with `data-part`. Mark the element, or a `<g>` around several.

| Part | What it is | What drives it |
|---|---|---|
| `body` | The shape that fills: a pump casing, a valve body, a tank shell | Fill from run state or valve position; dashed on bad data |
| `outline` | Ink lines with no state (fetched art before fitting) | Nothing; `currentColor` |
| `rotor` | What turns: impeller, fan, agitator | Spins while running (`hmi-motion.css`) |
| `stem` | A valve's stem or disc | Turns with position; swings while travelling |
| `fill-level` | The liquid inside a vessel, drawn full | Scaled from its bottom edge by `--level` (0 to 1) |
| `alarm-ring` | A shape around the symbol, invisible by default | Stroked in the alarm's colour; blinks until acknowledged |
| `label`, `value` | Text, when the symbol carries its own | The tag, and the formatted value |

A `body` is required on every symbol a screen binds: without it run state and position have nothing to colour.

## Ports

A port is where a pipe meets the symbol: `<circle data-port="in" cx="…" cy="…" r="0" fill="none"/>`, with any name (`in`, `out`, `suction`, `c1`). An optional `data-port-angle` (0 right, 90 up, 180 left, 270 down) says which way the pipe leaves. `pid.ts` reads ports from the SVG text, so pipes end exactly on them. Put ports on the outer edge of the shape, on the 24-unit grid where you can.

## State attributes

The binding sets these on the element that hosts the symbol (`[data-symbol]`), never inside the SVG:

| Attribute | Values |
|---|---|
| `data-run` | `stopped`, `running`, `starting`, `stopping`, `fault` |
| `data-position` | `open`, `closed`, `travel` |
| `data-mode` | `auto`, `manual`, `maintenance` |
| `data-flow` (pipes) | `forward`, `reverse`, `none` |
| `data-quality` | `good`, `uncertain`, `stale`, `bad`, `comms-lost` |
| `data-alarm` | `none`, `low`, `medium`, `high`, `critical` (MACHHUB's alarm priorities) |
| `data-alarm-acked` | `true`, `false` |
| `data-alarm-active` | `false` once the condition has cleared but the alarm still waits for an acknowledgement |
| `data-alarm-shelved` | `true` while any of its alarms is shelved |
| `--level` (style) | `0` to `1` |

## Theme variables

The symbol never names a colour; the theme defines these on `:root` and a symbol inherits them: `--hmi-equip-stroke` (ink), `--hmi-equip-off`, `--hmi-equip-on`, `--hmi-equip-transit`, `--hmi-level`, `--hmi-alarm-critical|high|medium|low`, `--hmi-bad`. ISA-101 is the default; `data-hmi-theme="classic"` on `<html>` swaps in the colourful set on the same symbols.
