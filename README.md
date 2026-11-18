# MACHHUB Extra skills (machhub-dev/skills-extra)

Optional [Agent Skills](https://agentskills.io) for building on MACHHUB, beyond the core set in [machhub-dev/plugins](https://github.com/machhub-dev/plugins). Install the core skills first: these build on them.

## SCADA on the MACHHUB runtime

Four skills for building SCADA as a hosted MACHHUB app, from a basic operator screen to a live P&ID. They are the interim way to do this until MACHHUB Screens ships.

| Skill | For |
|---|---|
| [`scada-hmi-basics`](skills/scada-hmi-basics/SKILL.md) | ISA-101 screens: binding tags to symbols, alarms from MACHHUB's alarm engine, data quality, faceplates with confirmed writes, trends, a simulator and Playwright checks. Also read-only mimics as v2 HTML Artifacts. |
| [`scada-pid`](skills/scada-pid/SKILL.md) | P&ID drawings: equipment on one SVG sheet, process lines that snap to symbol ports, live flow, ISA-5.1 instruments. |
| [`scada-animation`](skills/scada-animation/SKILL.md) | Motion driven by plant state: rotors, flow, valve travel, levels, alarm blink; stopped on bad data and reduced motion. |
| [`scada-assets`](skills/scada-assets/SKILL.md) | The symbol contract; fetching and fitting the MIT-licensed FUXA and Equinor symbol sets; drawing custom symbols; licence rules. |

The skills ship templates (a framework-free HMI core in TypeScript, Svelte 5 components, test specs) and scripts. They ship no symbol artwork: apps fetch it from its public sources at pinned commits.

Needs `@machhub-dev/sdk-ts` with `sdk.alarms`, `sdk.tag.onConnectionChange` and value quality on `subscribe` (newer than 2.0.0-next.0). On an older SDK the screens still run, without alarms or quality.

## Install

Any agent, with GitHub CLI 2.90+:

```bash
gh skill install machhub-dev/skills-extra --all --agent claude-code
```

Claude Code as a plugin:

```
/plugin marketplace add machhub-dev/skills-extra
/plugin install machhub-extra@machhub-extra
```

The other hosts (Codex, Cursor, Antigravity, ChatGPT) install it the same way as the core plugin; see the [plugins README](https://github.com/machhub-dev/plugins#-install) and use `machhub-dev/skills-extra` and `machhub-extra` in place of `machhub-dev/plugins` and `machhub`.

## Development

```bash
node scripts/validate.mjs
```

```bash
cd tests/app && npm ci && npx playwright install chromium && cd ../..
```

```bash
node scripts/test-templates.mjs --fetch
```

`validate.mjs` checks the skills' frontmatter, every relative link in their markdown, and the manifests. `test-templates.mjs` lays the templates out in `tests/app` as the skills tell an agent to, then typechecks them, builds the Artifact mimic, runs the skills' own Playwright specs on the simulator, and (with `--fetch`) fetches and fits real symbols. CI runs both on every push; tags `v*` publish zips. Releasing works as in the core repo: bump `version` in the three versioned manifests, then tag.

## Licence

[MPL-2.0](LICENSE). Third-party assets an app fetches keep their own licences, recorded in that app's `THIRD_PARTY.md`.
