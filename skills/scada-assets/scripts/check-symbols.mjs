#!/usr/bin/env node
// Checks SVG symbols against the symbol contract (references/symbol-contract.md).
// No dependencies. Exit code 1 when any file has an error.
//
// Usage:
//   node check-symbols.mjs <dir|file.svg>... [--strict]
//
// --strict is for symbols you draw yourself: a body and ports become required.
// Without it (fitted vendor symbols) they are warnings.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const PARTS = ["body", "outline", "rotor", "stem", "fill-level", "label", "value", "alarm-ring"];
const KEEP_COLOUR = /^(none|currentcolor|transparent|inherit|url\(#[^)]*\)|var\(.*\))$/i;

function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) out[m[1]] = m[3] ?? m[4];
  return out;
}

export function checkSvg(text, { strict = false } = {}) {
  const errors = [];
  const warnings = [];
  const root = /<svg\b[^>]*>/i.exec(text);
  if (!root) return { errors: ["not an SVG"], warnings };
  const r = attrs(root[0]);

  const vb = (r.viewBox ?? "").trim().split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || vb.some(Number.isNaN)) errors.push("no viewBox on <svg>");
  if (r.width || r.height) warnings.push("width/height on <svg>: remove them so the symbol scales to its box");

  if (/<image\b/i.test(text)) errors.push("embedded raster <image>; draw it as vector");
  if (/<script\b/i.test(text)) errors.push("<script> in a symbol");
  if (/<foreignObject\b/i.test(text)) errors.push("<foreignObject> in a symbol");
  if (/@font-face|<font\b/i.test(text)) errors.push("embedded font");
  if (/\son\w+\s*=/i.test(text)) errors.push("event handler attribute (on...)");

  const parts = new Set();
  let ports = 0;
  for (const m of text.matchAll(/<([a-zA-Z][\w:-]*)\b[^>]*>/g)) {
    const a = attrs(m[0]);
    const tag = m[1];
    for (const key of ["href", "xlink:href"]) {
      if (a[key] && !a[key].startsWith("#")) errors.push(`<${tag}> links outside the file (${key}="${a[key]}")`);
    }
    for (const p of ["fill", "stroke", "stop-color", "color"]) {
      if (a[p] && !KEEP_COLOUR.test(a[p].trim())) errors.push(`<${tag}> has ${p}="${a[p]}"; leave colour to the theme`);
    }
    if (a.style) {
      for (const decl of a.style.split(";")) {
        const [prop, ...rest] = decl.split(":");
        const v = rest.join(":").trim();
        if (["fill", "stroke", "stop-color", "color"].includes(prop?.trim().toLowerCase()) && v && !KEEP_COLOUR.test(v)) {
          errors.push(`<${tag}> style sets ${prop.trim()}: ${v}; leave colour to the theme`);
        }
      }
    }
    if (a["data-part"]) {
      if (!PARTS.includes(a["data-part"])) errors.push(`unknown data-part="${a["data-part"]}" (one of ${PARTS.join(", ")})`);
      parts.add(a["data-part"]);
    }
    if (a["data-port"] !== undefined) ports++;
    if (a.id && (text.includes(`url(#${a.id})`) || text.includes(`href="#${a.id}"`))) warnings.push(`id="${a.id}" is referenced; two copies of this symbol on one page share it. Prefix it per instance or avoid the reference`);
  }

  const need = (cond, msg) => (cond ? null : (strict ? errors : warnings).push(msg));
  need(parts.has("body"), 'no data-part="body": run state and position cannot colour this symbol');
  need(ports > 0, "no data-port: pipes have nothing to snap to");
  if (!/<title\b/i.test(text)) warnings.push("no <title>: screen readers and tooltips have no name");
  if (parts.has("rotor") && !parts.has("body")) warnings.push("a rotor without a body");

  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

function files(path) {
  if (statSync(path).isFile()) return path.toLowerCase().endsWith(".svg") ? [path] : [];
  return readdirSync(path).flatMap((f) => files(join(path, f)));
}

function main() {
  const args = process.argv.slice(2);
  const strict = args.includes("--strict");
  const targets = args.filter((a) => !a.startsWith("--"));
  if (!targets.length) {
    console.error("Usage: node check-symbols.mjs <dir|file.svg>... [--strict]");
    process.exit(2);
  }
  let bad = 0;
  let total = 0;
  for (const file of targets.flatMap(files)) {
    total++;
    const { errors, warnings } = checkSvg(readFileSync(file, "utf8"), { strict });
    if (!errors.length && !warnings.length) continue;
    console.log(file);
    for (const e of errors) console.log(`  error: ${e}`);
    for (const w of warnings) console.log(`  warn:  ${w}`);
    if (errors.length) bad++;
  }
  console.log(`${total} symbol(s) checked, ${bad} with errors.`);
  process.exit(bad ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
