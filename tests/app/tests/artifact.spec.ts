// The Artifact mimic, built by build-artifact.mjs, run with a stand-in for the
// frame's window.machhub.bind (the real frame puts its shim first, the same way).
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const artifact = JSON.parse(readFileSync("dist/unit1-mimic.artifact.json", "utf8"));
const U = "PlantA/Area1/Unit1";
const shim = (fail: boolean) => `<script>window.machhub = { bind: async (name) => {
  if (${fail}) throw new Error("offline");
  if (name !== "plant") throw new Error("unknown binding");
  return [
    { topic: "${U}/T101/Level", value: 71, ts: null },
    { topic: "${U}/P101/Running", value: true, ts: null },
    { topic: "${U}/P101/Speed", value: 880, ts: null },
    { topic: "${U}/XV101/Open", value: false, ts: null },
  ];
} };</script>`;

test("the artifact is valid artifact/v1 within the limits", () => {
  expect(artifact.$schema).toBe("artifact/v1");
  expect(artifact.kind).toBe("html");
  expect(Buffer.byteLength(artifact.html, "utf8")).toBeLessThanOrEqual(262144);
  expect(artifact.bindings.plant.topics.length).toBeLessThanOrEqual(50);
});

test("the mimic shows the binding's values", async ({ page }) => {
  await page.setContent(artifact.html.replace("<head>", "<head>" + shim(false)));
  await expect(page.locator('[data-symbol="P-101"]')).toHaveAttribute("data-run", "running");
  await expect(page.locator('[data-symbol="T-101"] [data-part="value"]')).toHaveText("71.0");
  await expect(page.locator('[data-symbol="XV-101"]')).toHaveAttribute("data-position", "closed");
});

test("a failed read shows comms lost", async ({ page }) => {
  await page.setContent(artifact.html.replace("<head>", "<head>" + shim(true)));
  await expect(page.locator('[data-symbol="P-101"]')).toHaveAttribute("data-quality", "comms-lost");
});
