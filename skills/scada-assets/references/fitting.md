# Fitting a fetched symbol by hand

`fetch-symbols.mjs` makes a symbol themeable, but it cannot know which shape is the body or which part turns. Fit each symbol a screen binds, then run `check-symbols.mjs --strict` on it. Copy the fitted file out of `vendor/` into `src/lib/symbols/` under a plain name (`valve-gate.svg`), so a re-fetch never overwrites your edits.

The two sources need different moves: FUXA draws with **strokes** (the line is the shape), Equinor draws with **fills** (the outline is a filled ring). So a FUXA body is the existing shape with its fill freed; an Equinor body is a new shape drawn behind the ink.

## FUXA: a stroked valve

Fetched (`vendor/fuxa/valve-ax.svg`):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g data-part="outline"><path fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="1.2" d="m1.041 4.582 11.003 5.69L1.041 15.96zm22.005 0-11.003 5.69 11.003 5.689z" pointer-events="none"/></g></svg>
```

Fitted:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <title>Valve</title>
  <circle data-part="alarm-ring" cx="12" cy="10.3" r="11.5"/>
  <path data-part="body" stroke-width="1.2" stroke-linejoin="round" d="m1.041 4.582 11.003 5.69L1.041 15.96zm22.005 0-11.003 5.69 11.003 5.689z"/>
  <circle data-port="in" cx="1.041" cy="10.27" r="0" fill="none"/>
  <circle data-port="out" cx="23.046" cy="10.27" r="0" fill="none"/>
</svg>
```

1. The outline group became `data-part="body"` on the path itself.
2. `fill="none"` and `stroke="currentColor"` went: the theme now fills it by position and strokes it in ink.
3. Ports sit where the pipe meets each side; an alarm ring surrounds the whole.

## Equinor: a filled-outline valve

Fetched (`vendor/equinor/PV005A.svg`, connectors already turned into ports):

```svg
<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 48 24"><g data-part="outline"><g><path d="M24 12.5 43 22V2l-19 9.5L5 2v20zM6 3.618 22.764 12 6 20.382zm36 16.764L25.236 12 42 3.618z"/><g><circle cx="5.5" cy="12" r=".5" fill="none" data-port="c2" data-port-angle="270"/><circle cx="42.5" cy="12.002" r=".5" fill="none" data-port="c1" data-port-angle="90"/></g></g></g></svg>
```

Fitted:

```svg
<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 48 24">
  <title>Gate valve</title>
  <rect data-part="alarm-ring" x="1" y="0" width="46" height="24" rx="4"/>
  <path data-part="body" stroke="none" d="M5 2v20l19-9.5L43 22V2L24 11.5z"/>
  <g data-part="outline"><path d="M24 12.5 43 22V2l-19 9.5L5 2v20zM6 3.618 22.764 12 6 20.382zm36 16.764L25.236 12 42 3.618z"/></g>
  <circle cx="5.5" cy="12" r="0" fill="none" data-port="in"/>
  <circle cx="42.5" cy="12" r="0" fill="none" data-port="out"/>
</svg>
```

1. A body path traces the outer edge of the ink (the two triangles' outer corners) and sits **behind** it, so the theme's fill shows inside the drawn lines.
2. The ink stays as `outline`, filled with `currentColor` from the root.
3. Ports got names a screen reads well (`in`, `out` for `c2`, `c1`) and a zero radius.

## Moving parts

- **Rotor:** wrap the impeller or blades in `<g data-part="rotor">`. It turns about its own bounding box centre (`transform-box: fill-box`), so draw it centred on the shaft; add an invisible square around it if it is lopsided.
- **Stem:** wrap the stem or disc in `<g data-part="stem">`. Draw it in the open position; closed is a 90° turn.
- **Level:** add a `<rect data-part="fill-level">` covering the inside of the vessel at full level, inset from the shell so the stroke stays visible. It scales from its bottom edge.

Done when `check-symbols.mjs --strict` passes on the fitted file and the symbol shows run state or position on the screen.
