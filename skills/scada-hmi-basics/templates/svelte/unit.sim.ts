// Simulator scenario for the reference unit screen (?sim). Mirrors the real
// plant closely enough to drive every state the screen can show.
import type { createSimSdk } from "./core";

const UNIT = "PlantA/Area1/Unit1";

export const unitSim: Parameters<typeof createSimSdk>[0] = {
  initial: {
    [`${UNIT}/T101/Level`]: 62.5,
    [`${UNIT}/P101/Running`]: false,
    [`${UNIT}/P101/Speed`]: 0,
    [`${UNIT}/P101/SpeedSP`]: 900,
    [`${UNIT}/P101/Mode`]: "auto",
    [`${UNIT}/XV101/Open`]: false,
    [`${UNIT}/FT102/Flow`]: 0,
  },
  rules: [
    { id: "alarm_rules:t101_high", name: "T-101 level high", tag: `${UNIT}/T101/Level`, priority: "high", when: (v) => Number(v) > 85, message: "Level above 85 %" },
    { id: "alarm_rules:p101_speed_low", name: "P-101 speed low", tag: `${UNIT}/P101/Speed`, priority: "critical", when: (v) => Number(v) > 0 && Number(v) < 200 },
  ],
  devices: [
    { command: `${UNIT}/P101/StartCmd`, feedback: `${UNIT}/P101/Running`, delayMs: 400 },
    { command: `${UNIT}/P101/StartCmd`, feedback: `${UNIT}/P101/Speed`, map: (on) => (on ? 900 : 0), delayMs: 600 },
    { command: `${UNIT}/P101/StartCmd`, feedback: `${UNIT}/FT102/Flow`, map: (on) => (on ? 42.5 : 0), delayMs: 900 },
    { command: `${UNIT}/XV101/OpenCmd`, feedback: `${UNIT}/XV101/Open`, delayMs: 700 },
    // A setpoint the PLC takes: the adapter reads it back on the same topic.
    { command: `${UNIT}/P101/SpeedSP`, feedback: `${UNIT}/P101/SpeedSP`, delayMs: 300 },
  ],
};
