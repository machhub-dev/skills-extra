// P&ID geometry: where a symbol's ports land on the drawing, so pipes start
// and end exactly on them. Copy to src/lib/hmi/pid.ts.

export interface Placement {
  /** Top-left corner on the drawing. */
  x: number;
  y: number;
  /** Width on the drawing; height follows the symbol's viewBox. */
  w: number;
}

interface Parsed {
  vb: [number, number, number, number];
  ports: Record<string, [number, number]>;
}

const cache = new Map<string, Parsed>();

function parse(svg: string): Parsed {
  let p = cache.get(svg);
  if (p) return p;
  const vb = (/viewBox="([^"]+)"/.exec(svg)?.[1] ?? "0 0 100 100").split(/[\s,]+/).map(Number) as Parsed["vb"];
  const ports: Parsed["ports"] = {};
  for (const m of svg.matchAll(/<circle\b[^>]*>/g)) {
    const tag = m[0];
    const name = /data-port="([^"]+)"/.exec(tag)?.[1];
    if (!name) continue;
    ports[name] = [Number(/\bcx="([^"]+)"/.exec(tag)?.[1] ?? 0), Number(/\bcy="([^"]+)"/.exec(tag)?.[1] ?? 0)];
  }
  p = { vb, ports };
  cache.set(svg, p);
  return p;
}

/** Height of a placed symbol, from its viewBox. */
export function heightOf(svg: string, w: number): number {
  const { vb } = parse(svg);
  return (w * vb[3]) / vb[2];
}

/** A port's point on the drawing. Throws on an unknown port, so a typo fails loudly. */
export function portAt(svg: string, port: string, at: Placement): [number, number] {
  const { vb, ports } = parse(svg);
  const p = ports[port];
  if (!p) throw new Error(`No data-port="${port}" in this symbol (has: ${Object.keys(ports).join(", ") || "none"}).`);
  const k = at.w / vb[2];
  return [at.x + (p[0] - vb[0]) * k, at.y + (p[1] - vb[1]) * k];
}

/**
 * An orthogonal route from a to b through optional corner points: each leg
 * runs horizontally then vertically, as process lines are drawn.
 */
export function route(a: [number, number], b: [number, number], via: [number, number][] = []): string {
  const pts = [a, ...via, b];
  let d = `M${a[0]} ${a[1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    d += ` H${x1} V${y1}`;
  }
  return d;
}
