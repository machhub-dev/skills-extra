#!/usr/bin/env node
// Publishes simulated tag values to a MACHHUB runtime, so a screen can be
// watched against real MQTT before the plant is connected.
//
// SAFETY: publishing to a tag a device driver owns WRITES TO THE DEVICE. Point
// this only at topics nothing drives: a namespace folder kept for simulation,
// or a runtime with no data sources. It prints what it would publish and
// writes nothing unless --apply is given.
//
// Usage:
//   node simulate.mjs <scenario.mjs> --url wss://host/mqtt [--apply]
//   MACHHUB_DEVELOPER_KEY=... node simulate.mjs ...
//
// The scenario module exports { prefix, intervalMs, signals }:
//   export default {
//     prefix: "Sim/Unit1/",            // every topic must start with it
//     intervalMs: 1000,
//     signals: {
//       "Sim/Unit1/T101/Level": { kind: "sine", min: 20, max: 90, periodS: 120 },
//       "Sim/Unit1/P101/Running": { kind: "toggle", periodS: 60 },
//       "Sim/Unit1/P101/Speed": { kind: "random", min: 850, max: 950, decimals: 0 },
//       "Sim/Unit1/FT102/Flow": { kind: "ramp", min: 0, max: 60, periodS: 30 },
//       "Sim/Unit1/P101/Mode": { kind: "constant", value: "auto" },
//     },
//   };
//
// Needs the mqtt package (a dependency of @machhub-dev/sdk-ts) and a developer
// key with access to the Workspace (MACHHUB > Settings > API keys).

import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const apply = args.includes("--apply");
const scenarioPath = args.find((a) => !a.startsWith("--") && a !== opt("--url"));
const url = opt("--url");
const key = process.env.MACHHUB_DEVELOPER_KEY;

if (!scenarioPath || !url) {
  console.error("Usage: node simulate.mjs <scenario.mjs> --url wss://host/mqtt [--apply]");
  process.exit(2);
}

const scenario = (await import(pathToFileURL(resolve(scenarioPath)).href)).default;
const { prefix, intervalMs = 1000, signals } = scenario;
if (!prefix || !prefix.endsWith("/")) {
  console.error('The scenario needs a prefix ending in "/", e.g. "Sim/Unit1/".');
  process.exit(2);
}
const outside = Object.keys(signals).filter((t) => !t.startsWith(prefix));
if (outside.length) {
  console.error(`Refusing: these topics are outside the prefix "${prefix}":\n  ${outside.join("\n  ")}`);
  process.exit(2);
}

const start = Date.now();
function valueOf(s) {
  const t = (Date.now() - start) / 1000;
  const period = s.periodS ?? 60;
  const span = (s.max ?? 100) - (s.min ?? 0);
  const round = (v) => Number(v.toFixed(s.decimals ?? 2));
  switch (s.kind) {
    case "sine": return round((s.min ?? 0) + span * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / period)));
    case "ramp": return round((s.min ?? 0) + span * ((t % period) / period));
    case "random": return round((s.min ?? 0) + span * Math.random());
    case "toggle": return Math.floor(t / (period / 2)) % 2 === 0;
    case "constant": return s.value;
    default: throw new Error(`Unknown signal kind "${s.kind}"`);
  }
}

let client;
if (apply) {
  if (!key) {
    console.error("Set MACHHUB_DEVELOPER_KEY to publish.");
    process.exit(2);
  }
  const require = createRequire(join(process.cwd(), "package.json"));
  const mqtt = (await import(pathToFileURL(require.resolve("mqtt")).href)).default;
  client = mqtt.connect(url, { protocolVersion: 5, username: "mch_developer_key", password: key });
  client.on("error", (e) => console.error("MQTT:", e.message));
  await new Promise((ok) => client.once("connect", ok));
  console.log(`Connected to ${url}. Publishing ${Object.keys(signals).length} topic(s) under ${prefix} every ${intervalMs} ms. Ctrl+C stops.`);
} else {
  console.log(`Dry run: printing one round. Add --apply to publish to ${url}.`);
}

const tick = () => {
  for (const [topic, s] of Object.entries(signals)) {
    const v = valueOf(s);
    if (client) client.publish(topic, JSON.stringify(v), { qos: 1, retain: true });
    else console.log(`  ${topic} = ${JSON.stringify(v)}`);
  }
};

tick();
if (client) {
  const timer = setInterval(tick, intervalMs);
  process.on("SIGINT", () => {
    clearInterval(timer);
    client.end(false, () => process.exit(0));
  });
}
