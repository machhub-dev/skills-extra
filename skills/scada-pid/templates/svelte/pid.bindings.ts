// Bindings for the reference P&ID: equipment, instruments and pipes.
import type { BindingMap } from "./core";

const UNIT = "PlantA/Area1/Unit1";

export const pidBindings = {
  "T-101": { level: { topic: `${UNIT}/T101/Level`, min: 0, max: 100 }, source: "datasources:plc1" },
  "P-101": { run: `${UNIT}/P101/Running`, mode: `${UNIT}/P101/Mode`, source: "datasources:plc1" },
  "XV-101": { position: `${UNIT}/XV101/Open`, source: "datasources:plc1" },
  "LT-101": { value: { topic: `${UNIT}/T101/Level`, format: (v) => Number(v).toFixed(1) }, source: "datasources:plc1" },
  "FT-102": { value: { topic: `${UNIT}/FT102/Flow`, format: (v) => Number(v).toFixed(1) }, source: "datasources:plc1" },
} satisfies BindingMap;

/** Flow follows the pump: no separate flow switch on this unit. */
export const pipeBindings = {
  suction: { flow: `${UNIT}/P101/Running`, source: "datasources:plc1" },
  discharge: { flow: `${UNIT}/P101/Running`, source: "datasources:plc1" },
  // Flows only while the valve is open and the pump runs: a computed tag in
  // MACHHUB is the right place to combine them; here, the valve alone.
  outlet: { flow: { topic: `${UNIT}/XV101/Open`, map: (v) => (v === true ? "forward" : "none") }, source: "datasources:plc1" },
} satisfies BindingMap;
