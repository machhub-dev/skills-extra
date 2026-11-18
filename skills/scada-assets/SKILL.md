---
name: scada-assets
description: "SVG symbols for MACHHUB SCADA screens: the symbol contract every HMI and P&ID symbol follows, fetching and fitting the open-source FUXA and Equinor sets, licence rules, and drawing custom symbols in Inkscape or Figma. Use when a screen needs a pump, valve, tank or other equipment symbol, or a symbol must be added, fixed or checked."
license: MPL-2.0
metadata:
  related_skills: "scada-hmi-basics, scada-pid, scada-animation"
---

# SCADA symbols

A symbol is a plain SVG that follows the **symbol contract**: named parts, ports, and no colour of its own. The theme colours it and the binding animates it, so one stylesheet drives every symbol, whoever drew it. The contract is in [`references/symbol-contract.md`](references/symbol-contract.md); read it before touching a symbol.

Symbols live in the app, never in this skill: `src/lib/symbols/` for your own, `src/lib/symbols/vendor/<source>/` for fetched ones.

## Get a symbol

Work down this list and stop at the first that has it:

1. **Already in the app.** Look in `src/lib/symbols/`.
2. **The examples here.** [`templates/symbols/`](templates/symbols/) has a centrifugal pump, a gate valve and a vertical tank, drawn to the contract. Copy them into `src/lib/symbols/`.
3. **A public set.** Fetch it, then fit it (next section).
4. **Draw it.** See [`references/custom-symbols.md`](references/custom-symbols.md).

| Source | Licence | What it has | Use it for |
|---|---|---|---|
| `fuxa`: [FUXA](https://github.com/frangoteam/FUXA) shapes | MIT | 154 outline shapes, 24×24: pumps, compressors, valves, tanks, exchangers, agitators, crushers | Equipment on overview and unit screens |
| `equinor`: [Equinor engineering-symbols](https://github.com/equinor/engineering-symbols) | MIT | 55 ISO-style P&ID symbols with connection points (PP pumps, PV valves, PT vessels, PA agitators, IM instruments) | P&ID screens: their connectors become ports |

Only permissive licences ship in an app: MIT, Apache-2.0, ISC, BSD, CC0, CC-BY. [`references/licences.md`](references/licences.md) lists what was checked and refused (draw.io stencils, Wikimedia ISO 10628 sheets, GSAP, commercial kits) and why.

## Fetch and fit a public set

Copy [`scripts/`](scripts/) into the app as `scripts/symbols/`, then from the app root:

```bash
npm i -D svgo@4
```

```bash
node scripts/symbols/fetch-symbols.mjs fuxa --only pumpcentri1,valve-ax,tank1
```

It downloads the commit pinned in `sources.json`, runs it through `fit-symbols.mjs` (SVGO, colours to `currentColor`, connectors to `data-port`), writes `src/lib/symbols/vendor/fuxa/`, copies the source's `LICENSE` beside the files, and records the set in `THIRD_PARTY.md`. Run it with no `--only` to fetch the whole set and browse it; `--list` shows the sources.

A fetched symbol is outline only: it draws, but run state cannot fill it. **Fit it by hand** for each symbol a screen uses: mark the shape that fills as `data-part="body"`, the turning part as `rotor`, the valve stem as `stem`, and add ports. [`references/fitting.md`](references/fitting.md) shows this on a FUXA pump and an Equinor valve.

## Check

```bash
node scripts/symbols/check-symbols.mjs src/lib/symbols --strict
```

Done when the check reports no errors for every symbol a screen uses. `--strict` makes a missing body or port an error; use it on everything a screen binds. A vendor folder you only browse can be checked without it.

## Hand-off

- Placing symbols on a screen and binding them: `scada-hmi-basics`.
- Joining them with pipes at their ports: `scada-pid`.
- Making parts move: `scada-animation`.
