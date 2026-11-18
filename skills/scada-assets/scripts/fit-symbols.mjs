#!/usr/bin/env node
// Fits SVG files to the symbol contract (references/symbol-contract.md):
//
//   1. Names → contract. An element whose id (an Inkscape or Figma layer name)
//      is a part name becomes data-part="<name>"; "port-<x>" becomes
//      data-port="<x>"; Equinor's "annotation-connector-<n>-<angle>" becomes
//      data-port="c<n>" data-port-angle="<angle>".
//   2. SVGO with the HMI settings (svgo.config.mjs).
//   3. Colour literals in fill, stroke and stop-color (attributes and style)
//      become currentColor, so the theme's ink colours the art; inside a body,
//      fill-level or alarm-ring part they are removed, so the theme fills it.
//      "none", "currentColor" and url(#...) stay.
//   4. A viewBox, from width/height when missing; width/height removed.
//   5. Vendor mode only: everything wrapped in <g data-part="outline"> when no
//      body is marked, so the theme can still colour the strokes.
//
// Usage:
//   node fit-symbols.mjs <in-dir|file.svg> <out-dir> [--vendor]
//
// Needs svgo in the app: npm i -D svgo@4
// Then run check-symbols.mjs on <out-dir>.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { hmiPreset } from "./svgo.config.mjs";

export const PARTS = ["body", "outline", "rotor", "stem", "fill-level", "label", "value", "alarm-ring"];

const KEEP_COLOUR = /^(none|currentcolor|transparent|inherit|url\(#.*\)|var\(.*\))$/i;
const COLOUR_PROPS = ["fill", "stroke", "stop-color", "color"];

/** SVGO plugin: layer names and Equinor connectors to contract attributes. */
const namesToContract = {
  name: "hmiNamesToContract",
  fn: () => ({
    element: {
      enter(node) {
        const id = node.attributes.id;
        if (!id) return;
        const lower = id.toLowerCase();
        const connector = /^annotation-connector-(\d+)-(\d+)$/.exec(lower);
        if (connector) {
          node.attributes["data-port"] = `c${connector[1]}`;
          node.attributes["data-port-angle"] = connector[2];
          node.attributes.fill = "none";
          delete node.attributes.id;
        } else if (lower.startsWith("port-")) {
          node.attributes["data-port"] = lower.slice(5);
          delete node.attributes.id;
        } else if (PARTS.includes(lower)) {
          node.attributes["data-part"] = lower;
          delete node.attributes.id;
        }
      },
    },
  }),
};

/** Parts whose fill and stroke the theme sets: colours inside them are removed. */
const THEMED = ["body", "fill-level", "alarm-ring"];

/** SVGO plugin: colours to currentColor, viewBox fixed, vendor art wrapped. */
function themeable(vendor) {
  return {
    name: "hmiThemeable",
    fn: () => {
      const stack = [];
      const recolour = (v, themed) => (themed ? undefined : "currentColor");
      return {
        element: {
          enter(node, parent) {
            const themed = stack.some((n) => THEMED.includes(n.attributes["data-part"])) || THEMED.includes(node.attributes["data-part"]);
            stack.push(node);
            for (const p of COLOUR_PROPS) {
              const v = node.attributes[p];
              if (v === undefined || KEEP_COLOUR.test(v.trim())) continue;
              const next = recolour(v, themed);
              if (next === undefined) delete node.attributes[p];
              else node.attributes[p] = next;
            }
            if (node.attributes.style) {
              const kept = node.attributes.style
                .split(";")
                .map((d) => d.trim())
                .filter(Boolean)
                .flatMap((d) => {
                  const [prop, ...rest] = d.split(":");
                  const name = prop.trim().toLowerCase();
                  const v = rest.join(":").trim();
                  if (!COLOUR_PROPS.includes(name) || KEEP_COLOUR.test(v)) return [d];
                  const next = recolour(v, themed);
                  return next === undefined ? [] : [`${name}:${next}`];
                });
              if (kept.length) node.attributes.style = kept.join(";");
              else delete node.attributes.style;
            }
            if (node.name !== "svg" || parent.type !== "root") return;

            const { width, height } = node.attributes;
            if (!node.attributes.viewBox && width && height) node.attributes.viewBox = `0 0 ${parseFloat(width)} ${parseFloat(height)}`;
            delete node.attributes.width;
            delete node.attributes.height;
            node.attributes.xmlns ??= "http://www.w3.org/2000/svg";

            if (!vendor) return;
            const hasBody = JSON.stringify(node.children, (k, v) => (k === "parentNode" ? undefined : v)).includes('"data-part":"body"');
            if (hasBody) return;
            const art = node.children.filter((c) => !(c.type === "element" && ["title", "desc", "defs"].includes(c.name)));
            const rest = node.children.filter((c) => !art.includes(c));
            node.children = [...rest, { type: "element", name: "g", attributes: { "data-part": "outline" }, children: art }];
          },
          exit() {
            stack.pop();
          },
        },
      };
    },
  };
}

/** svgo from the app being worked on (the current directory), then from here. */
async function loadSvgo() {
  for (const base of [join(process.cwd(), "package.json"), import.meta.url]) {
    try {
      return await import(pathToFileURL(createRequire(base).resolve("svgo")).href);
    } catch {}
  }
  throw new Error("svgo not found. In the app: npm i -D svgo@4");
}

/** Fits one SVG's text. `vendor` wraps unmarked art in an outline part. */
export async function fitSvg(text, { vendor = false, path } = {}) {
  const { optimize } = await loadSvgo();
  return optimize(text, { path, multipass: false, plugins: [namesToContract, hmiPreset, themeable(vendor)] }).data;
}

function svgFiles(input) {
  if (statSync(input).isFile()) return [input];
  return readdirSync(input).filter((f) => f.toLowerCase().endsWith(".svg")).map((f) => join(input, f));
}

async function main() {
  const args = process.argv.slice(2);
  const vendor = args.includes("--vendor");
  const [input, out] = args.filter((a) => !a.startsWith("--"));
  if (!input || !out) {
    console.error("Usage: node fit-symbols.mjs <in-dir|file.svg> <out-dir> [--vendor]");
    process.exit(2);
  }
  mkdirSync(out, { recursive: true });
  let n = 0;
  for (const file of svgFiles(input)) {
    writeFileSync(join(out, basename(file)), await fitSvg(readFileSync(file, "utf8"), { vendor, path: file }));
    n++;
  }
  console.log(`Fitted ${n} symbol(s) into ${out}. Next: node check-symbols.mjs ${out}`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
