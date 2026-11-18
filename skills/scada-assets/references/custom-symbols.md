# Drawing a custom symbol

Draw a symbol only when neither the examples nor a public set has it. Draw in the ISA-101 spirit: plain outlines, no gradients, shadows or 3D; state comes from the theme.

## Set up the artboard

- A square artboard on a 24-unit grid (24, 48 or 96 units) for most equipment; tall vessels may be 48×96 or 96×216. Equipment drawn on one grid places cleanly beside other symbols.
- Stroke 3 units on a 96 board (1.2 on 24), round joins. The theme sets the colour; set your strokes to black while drawing.
- Leave 4 units clear around the art for the alarm ring.

## Name the layers

The fitter turns layer names into the contract, so name them in the editor instead of hand-editing XML:

| Layer or object name | Becomes |
|---|---|
| `body` | `data-part="body"` |
| `rotor`, `stem`, `fill-level`, `alarm-ring`, `outline` | that part |
| `port-in`, `port-out`, `port-<anything>` | `data-port="in"` and so on. Draw each as a tiny circle centred where the pipe meets. |

Inkscape writes the object's ID (Object Properties, or the XML editor) as `id`. Figma writes the layer name as `id` when you export SVG with **Include "id" attribute** on.

## Export

- **Inkscape:** File > Save As > Optimized SVG, or Plain SVG. Text as paths (Path > Object to Path) unless the symbol's text is bound.
- **Figma:** Export > SVG, with "Include id attribute" on and "Outline text" on.

## Fit and check

From the app root, with the scripts copied to `scripts/symbols/`:

```bash
node scripts/symbols/fit-symbols.mjs drawings/ src/lib/symbols/
```

```bash
node scripts/symbols/check-symbols.mjs src/lib/symbols --strict
```

`fit-symbols.mjs` turns the names into parts and ports, optimises with the HMI SVGO settings (which keep ports, part groups and stroke widths), removes colours inside themed parts, turns the rest to `currentColor`, and sets the `viewBox`. Add a `<title>` by hand.

Done when the check passes with `--strict` and the symbol, placed on a screen in the simulator, shows every state its binding drives (running, stopped, fault, an alarm, bad data).

## Licence of what you draw

A symbol drawn for a customer belongs to whoever the contract says; it never mixes in traced copies of a source that is not permissive (see `licences.md`). Tracing a draw.io stencil or a commercial kit makes the result a derivative of it.
