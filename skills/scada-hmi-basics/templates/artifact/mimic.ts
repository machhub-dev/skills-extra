// Entry of the Unit 1 mimic Artifact. Same core and binding map shape as the
// app; the data comes from the Artifact's "plant" binding instead of the SDK.
import { TagHub, bindScreen, createArtifactSdk, type BindingMap } from "../src/lib/hmi/core";

const UNIT = "PlantA/Area1/Unit1";
const bindings: BindingMap = {
  "T-101": { level: `${UNIT}/T101/Level`, value: { topic: `${UNIT}/T101/Level`, format: (v) => Number(v).toFixed(1) } },
  "P-101": { run: `${UNIT}/P101/Running`, value: { topic: `${UNIT}/P101/Speed`, format: (v) => Number(v).toFixed(0) } },
  "XV-101": { position: `${UNIT}/XV101/Open` },
};

const hub = new TagHub(createArtifactSdk({ binding: "plant", intervalMs: 5000 }));
bindScreen(document, bindings, hub);
