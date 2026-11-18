#!/usr/bin/env node
// Builds a MACHHUB 2 HTML Artifact (artifact/v1, kind "html") from a mimic:
// bundles the entry with esbuild, inlines CSS and contract SVGs, and writes the
// JSON MACHHUB stores. The sandbox allows no network, so everything is inline.
//
// Usage (from the app root): node build-artifact.mjs [artifact.config.json]
// Needs esbuild: npm i -D esbuild
//
// In mimic.html: /* hmi:css */ inside a <style>, /* hmi:script */ inside a
// <script>, and <!-- hmi:svg NAME --> where src/lib/symbols/NAME.svg goes.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const LIMIT = 262144; // bytes, the API's limit on an Artifact's html

const configPath = resolve(process.argv[2] ?? "artifact.config.json");
const base = dirname(configPath);
const cfg = JSON.parse(readFileSync(configPath, "utf8"));
const at = (p) => resolve(base, p);

const { build } = await import(pathToFileURL(createRequire(join(process.cwd(), "package.json")).resolve("esbuild")).href);
const bundle = await build({ entryPoints: [at(cfg.entry)], bundle: true, minify: true, format: "iife", target: "es2020", write: false });
const script = bundle.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const css = (cfg.css ?? []).map((p) => readFileSync(resolve(p), "utf8")).join("\n");
const symbolsDir = resolve(cfg.symbols ?? "src/lib/symbols");

let html = readFileSync(at(cfg.html), "utf8")
  .replace("/* hmi:css */", () => css)
  .replace("/* hmi:script */", () => script)
  .replace(/<!--\s*hmi:svg\s+([\w-]+)\s*-->/g, (_, name) => readFileSync(join(symbolsDir, `${name}.svg`), "utf8"));

const bytes = Buffer.byteLength(html, "utf8");
if (bytes > LIMIT) {
  console.error(`The HTML is ${bytes} bytes; MACHHUB refuses more than ${LIMIT}. Drop unused symbols or CSS.`);
  process.exit(1);
}
if (cfg.topics.length > 50) {
  console.error(`${cfg.topics.length} topics; one binding holds at most 50. Split them across bindings.`);
  process.exit(1);
}

const artifact = {
  $schema: "artifact/v1",
  kind: "html",
  title: cfg.title,
  ...(cfg.description ? { description: cfg.description } : {}),
  html,
  bindings: { [cfg.binding]: { source: "tags", topics: cfg.topics } },
  annotations: { source: "person" },
};
const out = resolve(cfg.out ?? "dist/artifact.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(artifact, null, 2));
console.log(`${out}: ${bytes} bytes of HTML, ${cfg.topics.length} topic(s) in binding "${cfg.binding}".`);
