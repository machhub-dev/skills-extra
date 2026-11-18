#!/usr/bin/env node
// Builds every skill's templates into one app (tests/app) the way the skills
// tell an agent to, then runs their checks:
//   1. check-symbols --strict on the example symbols
//   2. svelte-check (types and Svelte warnings) on core, Svelte and P&ID templates
//   3. build-artifact.mjs on the Artifact mimic
//   4. Playwright: hmi.spec.ts, pid.spec.ts (the skills' own test templates)
//      and the artifact smoke test, all on the simulator
//   5. with --fetch: fetch, fit and check two real symbols from each public set
//
// Usage: node scripts/test-templates.mjs [--fetch]
// Needs npm ci in tests/app first. Set PW_CHROMIUM_PATH to use a preinstalled
// Chromium; otherwise run `npx playwright install chromium` in tests/app.

import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const app = join(root, "tests/app");
const skill = (...p) => join(root, "skills", ...p);
const at = (...p) => join(app, ...p);

function run(label, cmd, args, cwd = app) {
  console.log(`\n▶ ${label}`);
  execFileSync(cmd, args, { cwd, stdio: "inherit", env: { ...process.env, CI: process.env.CI ?? "" } });
}

// Lay the templates out as the skills say: src/lib/hmi, src/lib/symbols.
for (const p of ["src/lib", "tests/hmi.spec.ts", "tests/pid.spec.ts", "artifact", "dist"]) rmSync(at(p), { recursive: true, force: true });
mkdirSync(at("src/lib/hmi"), { recursive: true });
cpSync(skill("scada-hmi-basics/templates/core"), at("src/lib/hmi/core"), { recursive: true });
cpSync(skill("scada-hmi-basics/templates/svelte"), at("src/lib/hmi"), { recursive: true });
cpSync(skill("scada-pid/templates/svelte"), at("src/lib/hmi"), { recursive: true });
cpSync(skill("scada-animation/templates"), at("src/lib/hmi"), { recursive: true });
cpSync(skill("scada-assets/templates/symbols"), at("src/lib/symbols"), { recursive: true });
cpSync(skill("scada-hmi-basics/templates/tests/hmi.spec.ts"), at("tests/hmi.spec.ts"));
cpSync(skill("scada-pid/templates/tests/pid.spec.ts"), at("tests/pid.spec.ts"));
cpSync(skill("scada-hmi-basics/templates/artifact"), at("artifact"), { recursive: true });

run("Example symbols follow the contract", "node", [skill("scada-assets/scripts/check-symbols.mjs"), at("src/lib/symbols"), "--strict"]);
run("Templates typecheck", "npx", ["svelte-check", "--tsconfig", "./tsconfig.json", "--fail-on-warnings"]);
run("Artifact mimic builds", "node", [at("artifact/build-artifact.mjs"), at("artifact/artifact.config.json")]);
run("Screens behave on the simulator", "npx", ["playwright", "test", "--trace", "off", "--reporter=line"]);

if (process.argv.includes("--fetch")) {
  const out = at("dist/vendor");
  run("Fetch and fit FUXA", "node", [skill("scada-assets/scripts/fetch-symbols.mjs"), "fuxa", "--only", "pumpcentri1,valve-ax", "--out", out, "--notice", at("dist/THIRD_PARTY.md")]);
  run("Fetch and fit Equinor", "node", [skill("scada-assets/scripts/fetch-symbols.mjs"), "equinor", "--only", "PP001A,PV005A", "--out", out, "--notice", at("dist/THIRD_PARTY.md")]);
  run("Fetched symbols pass the check", "node", [skill("scada-assets/scripts/check-symbols.mjs"), out]);
}

console.log("\n✓ templates build and pass their checks");
