# Licences of third-party assets

An app built with these skills ships on customer sites, so everything third-party in it must carry a **permissive** licence: MIT, Apache-2.0, ISC, BSD, CC0, or CC-BY (with the credit in `THIRD_PARTY.md`). Each asset's source, commit, licence and changed files go in `THIRD_PARTY.md`; `fetch-symbols.mjs` writes that for the sets it fetches, and you add the rest by hand.

Checked on 18 November 2026 from each project's LICENSE file and npm metadata:

| Asset | Licence | Verdict |
|---|---|---|
| FUXA shapes (frangoteam/FUXA) | MIT | Use: symbol source |
| Equinor engineering-symbols | MIT | Use: symbol source (inactive since 2023, so the commit is pinned) |
| Lucide icons | ISC | Use: app chrome (menus, buttons), never plant equipment |
| Tabler icons | MIT | Use: app chrome |
| Material Symbols (`@material-symbols/svg-*`) | Apache-2.0 | Use: app chrome |
| uPlot | MIT | Use: trends |
| Apache ECharts | Apache-2.0 | Use: gauges and charts uPlot does not draw |
| Motion (`motion`) | MIT | Use: multi-step animation sequences |
| anime.js v4 | MIT | Allowed; Motion is the default |
| Konva, PixiJS | MIT | Allowed: only for screens past about 2,000 moving elements |
| SVGO | MIT | Use: build tool, not shipped |
| draw.io P&ID stencils (jgraph/drawio) | Own stencil licence | **Refused.** It bars use, and derivatives including traced or AI-made look-alikes, in Atlassian products without permission; and the stencils are not standalone SVG |
| Wikimedia ISO 10628-2 symbol sheets | CC BY-SA 4.0 | **Refused** as shipped assets: share-alike. Use them only as a drawing reference |
| GSAP | Own "no charge" licence, not OSI-approved | **Refused** |
| JointJS core | MPL-2.0 | **Refused** by the permissive-only rule |
| smart-industrial and other HMI kits under an EULA | Commercial | **Refused** |
| canvas-gauges, gauge.js | MIT | Allowed but abandoned (2015 to 2020); draw gauges in SVG or use ECharts |

## This repository's own licence

This skill repository is MPL-2.0. That covers its files: the skill text, scripts and templates. MPL-2.0 is file-level: a changed copy of one of these files stays MPL-2.0 and its source must be shared on request; code beside it is not affected.
