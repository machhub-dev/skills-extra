// The binding map for the reference unit screen: symbol id → topics. The one
// file that knows topic names, so moving the screen to another unit is an edit
// here. Topics are exact UNS paths (no wildcards); copy them from the
// Namespace page or the namespace JSON.
import type { BindingMap } from "./core";
import type { Controls } from "./Faceplate.svelte";

const UNIT = "PlantA/Area1/Unit1";

export const bindings = {
  "T-101": {
    level: { topic: `${UNIT}/T101/Level`, min: 0, max: 100 },
    value: { topic: `${UNIT}/T101/Level`, format: (v) => Number(v).toFixed(1) },
    source: "datasources:plc1",
  },
  "P-101": {
    run: `${UNIT}/P101/Running`,
    value: { topic: `${UNIT}/P101/Speed`, format: (v) => Number(v).toFixed(0) },
    mode: `${UNIT}/P101/Mode`,
    source: "datasources:plc1",
  },
  "XV-101": {
    position: `${UNIT}/XV101/Open`,
    source: "datasources:plc1",
  },
} satisfies BindingMap;

export const controls: Record<keyof typeof bindings, Controls> = {
  "T-101": {},
  "P-101": {
    run: { command: `${UNIT}/P101/StartCmd`, feedback: `${UNIT}/P101/Running` },
    setpoint: { topic: `${UNIT}/P101/SpeedSP`, min: 0, max: 1500, step: 10, unit: "rpm", label: "Speed" },
  },
  "XV-101": {
    run: { command: `${UNIT}/XV101/OpenCmd`, feedback: `${UNIT}/XV101/Open`, start: true, stop: false },
  },
};
