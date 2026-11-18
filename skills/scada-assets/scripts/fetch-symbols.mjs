#!/usr/bin/env node
// Fetches a pinned public symbol set, fits it to the symbol contract and
// records it in THIRD_PARTY.md. Run from the app's root.
//
// Usage:
//   node fetch-symbols.mjs <source> [--only a,b,c] [--out src/lib/symbols/vendor] [--notice THIRD_PARTY.md]
//   node fetch-symbols.mjs --list
//
// <source> is a key of sources.json (fuxa, equinor). --only takes file names
// without .svg. Needs git and svgo (npm i -D svgo@4).
//
// Output: <out>/<source>/*.svg, <out>/<source>/LICENSE, and a section of
// THIRD_PARTY.md that is replaced on every run, so re-running is safe.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fitSvg } from "./fit-symbols.mjs";
import { checkSvg } from "./check-symbols.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const sources = JSON.parse(readFileSync(join(here, "sources.json"), "utf8"));

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
}

function git(cwd, ...args) {
  execFileSync("git", args, { cwd, stdio: ["ignore", "ignore", "inherit"] });
}

/** A sparse, blob-filtered checkout of one directory at the pinned commit. */
function checkout(key, src) {
  const cache = resolve(".hmi-symbols-cache", `${key}-${src.commit.slice(0, 12)}`);
  if (existsSync(join(cache, src.dir))) return cache;
  mkdirSync(cache, { recursive: true });
  git(cache, "init", "-q");
  git(cache, "remote", "add", "origin", src.repo);
  git(cache, "sparse-checkout", "set", "--no-cone", `/${src.dir}/`, `/${src.licenceFile}`);
  git(cache, "fetch", "-q", "--depth", "1", "--filter=blob:none", "origin", src.commit);
  git(cache, "checkout", "-q", "FETCH_HEAD");
  return cache;
}

function noticeSection(key, src, files) {
  return [
    `<!-- hmi-symbols:${key} -->`,
    `## ${src.name}`,
    "",
    `- Source: ${src.repo}/tree/${src.commit}/${src.dir}`,
    `- Licence: ${src.licence}. ${src.copyright}. Full text: \`${key}/LICENSE\` beside the symbols.`,
    "- Changed: optimised with SVGO, colours removed for theming, connector annotations turned into data-port attributes.",
    `- Files (${files.length}): ${files.join(", ")}`,
    `<!-- /hmi-symbols:${key} -->`,
  ].join("\n");
}

function writeNotice(path, key, section) {
  const header = "# Third-party material\n\nAssets and code from other projects that this app ships, with their licences.\n";
  let text = existsSync(path) ? readFileSync(path, "utf8") : header;
  const re = new RegExp(`<!-- hmi-symbols:${key} -->[\\s\\S]*?<!-- /hmi-symbols:${key} -->`);
  text = re.test(text) ? text.replace(re, section) : `${text.trimEnd()}\n\n${section}\n`;
  writeFileSync(path, text);
}

async function main() {
  if (process.argv.includes("--list")) {
    for (const [k, s] of Object.entries(sources)) console.log(`${k}: ${s.name} (${s.licence}) - ${s.notes}`);
    return;
  }
  const key = process.argv[2];
  const src = sources[key];
  if (!src) {
    console.error(`Unknown source "${key}". One of: ${Object.keys(sources).join(", ")}`);
    process.exit(2);
  }
  const out = resolve(arg("--out", "src/lib/symbols/vendor"), key);
  const only = arg("--only", "")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];

  const cache = checkout(key, src);
  const dir = join(cache, src.dir);
  let names = readdirSync(dir).filter((f) => f.endsWith(".svg")).map((f) => f.slice(0, -4));
  if (only.length) {
    const missing = only.filter((n) => !names.includes(n));
    if (missing.length) {
      console.error(`Not in ${key}: ${missing.join(", ")}. Run with no --only to fetch all and browse.`);
      process.exit(1);
    }
    names = only;
  }

  mkdirSync(out, { recursive: true });
  let warned = 0;
  for (const n of names) {
    const file = join(dir, `${n}.svg`);
    const svg = await fitSvg(readFileSync(file, "utf8"), { vendor: true, path: file });
    const { errors } = checkSvg(svg);
    if (errors.length) {
      console.warn(`skip ${n}: ${errors.join("; ")}`);
      warned++;
      continue;
    }
    writeFileSync(join(out, `${n}.svg`), svg);
  }
  copyFileSync(join(cache, src.licenceFile), join(out, "LICENSE"));
  const written = names.length - warned;
  const kept = readdirSync(out).filter((f) => f.endsWith(".svg")).map((f) => f.slice(0, -4)).sort();
  writeNotice(resolve(arg("--notice", "THIRD_PARTY.md")), key, noticeSection(key, src, kept));
  console.log(`${written} symbol(s) from ${src.name} in ${out}; THIRD_PARTY.md updated.`);
  console.log("Next: mark each symbol's body, rotor or stem (references/fitting.md), then check-symbols.mjs.");
}

await main();
