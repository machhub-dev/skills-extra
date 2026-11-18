// Value-driven motion with the Web Animations API, for what a data-* state
// cannot express: speed in proportion to a measurement. Copy to
// src/lib/hmi/motion.ts. State-driven motion stays in hmi-motion.css.
import type { TagHub } from "./core";

const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Spins a symbol's rotor at a rate proportional to a speed tag: at `nominal`
 * (e.g. 1450 rpm) one turn takes `periodAtNominal` seconds. Zero, bad or
 * missing speed stops it. updatePlaybackRate changes speed without a jump,
 * which restarting a CSS animation with a new duration cannot do.
 *
 * The symbol's CSS rotor animation must be off for this symbol:
 * put data-rotor="speed" on its [data-symbol] element (hmi-motion.css).
 */
export function rotorBySpeed(symbol: Element, hub: TagHub, topic: string, nominal: number, periodAtNominal = 1.2): () => void {
  const rotor = symbol.querySelector<SVGGraphicsElement>('[data-part="rotor"]');
  if (!rotor || reduced()) return () => {};
  const spin = rotor.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], {
    duration: periodAtNominal * 1000,
    iterations: Infinity,
  });
  spin.pause();

  const stop = hub.watch(topic, (r) => {
    const speed = Number(r.value);
    const trusted = r.quality !== "bad" && hub.connected;
    if (!trusted || !Number.isFinite(speed) || speed <= 0) {
      spin.pause();
      return;
    }
    spin.updatePlaybackRate(Math.min(4, speed / nominal));
    if (spin.playState !== "running") spin.play();
  });
  const offLink = hub.onConnection((up) => {
    if (!up) spin.pause();
  });
  return () => {
    stop();
    offLink();
    spin.cancel();
  };
}
