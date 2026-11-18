---
name: scada-animation
description: "Animation on MACHHUB SCADA screens: rotating pumps and agitators, flow along pipes, valve travel, vessel levels and alarm blinking, driven by live tag state with CSS and the Web Animations API, and stopped on bad data or reduced motion. Use when a symbol or pipe should move, show flow or rotation, or follow a live value smoothly."
license: MPL-2.0
metadata:
  related_skills: "scada-hmi-basics, scada-pid, scada-assets"
---

# Motion on SCADA screens

Motion on a SCADA screen is a claim: "this is moving in the plant, now". So every animation is driven by plant state, stops when the data cannot be trusted, and respects the operator's reduced-motion setting. Nothing moves to decorate.

Copy [`templates/hmi-motion.css`](templates/hmi-motion.css) to `src/lib/hmi/` and import it after `hmi.css`. Copy [`templates/motion.ts`](templates/motion.ts) when a screen needs value-driven motion.

## Pick the tool

Use the first row that fits:

| Motion | Tool | How |
|---|---|---|
| On or off with a state: rotor turning while running, flow while flowing, stem swinging while travelling, alarm blink | **CSS**, already in `hmi-motion.css` | The binding sets `data-run`, `data-flow`, `data-position`; the stylesheet animates the symbol's parts. No code. |
| Smoothly to a value: fill level, valve opening | **CSS transition** | `--level` and `transform` changes are transitioned in `hmi.css`; bind the value. |
| In proportion to a value: rotor speed from rpm, flow speed from m³/h | **Web Animations API** | `rotorBySpeed(symbol, hub, topic, nominal)` in `motion.ts`; `updatePlaybackRate` changes speed without a jump. Mark the symbol `data-rotor="speed"` so the CSS spin stays off. |
| A multi-step sequence: a batch stepping through phases, a guided start-up | **Motion** (`motion`, MIT) | `animate()` sequences. Rare on an operator screen; check the need first. |

GSAP is not used: its licence is not open source (`scada-assets` licences).

## Rules every animation keeps

1. **Driven by state, not time.** Motion starts and stops from a `data-*` attribute or a tag value, never from a timer the screen runs itself.
2. **Untrusted data does not move.** On `bad`, `stale` or `comms-lost` quality, rotors and flow stop (`hmi-motion.css` does this; `rotorBySpeed` pauses on bad values and a lost link).
3. **Compositor-friendly properties only:** `transform`, `opacity`, `stroke-dashoffset`. Never animate layout (`width`, `top`) or path data.
4. **Reduced motion:** under `prefers-reduced-motion: reduce`, rotors, flow and travel stop and show their state still: flow as a static dashed line. Alarm blinking stays but slows to 2 s, because ISA-18.2 needs an unacknowledged alarm to stand out.
5. **One blink rate, for alarms only.** Unacknowledged alarms blink at 1 Hz (`--hmi-blink`). Nothing else blinks.

[`references/recipes.md`](references/recipes.md) has the parts each recipe needs, the tuning variables, and a Motion sequence example.

## Verify

The P&ID checks (`scada-pid`, `pid.spec.ts`) assert `animation-name` on pipes and rotors, so motion is tested without pixels. Add a check per moving symbol: the animation runs in its running state and is `none` on bad data. Run the screen once with reduced motion on (`page.emulateMedia({ reducedMotion: "reduce" })`).

Done when every moving part on the screen has a test that it moves only in its moving state, and stops on bad data and under reduced motion.
