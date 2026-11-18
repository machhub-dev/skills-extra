// Playwright checks for an HMI screen, run on the simulator (?sim), so no
// runtime is needed. Each test drives tags through window.__hmiSim and asserts
// the contract attributes on [data-symbol] elements, never pixels.
//
// Copy to tests/hmi.spec.ts, change SCREEN and the topics to your screen, and
// run: npx playwright test --trace off
import { expect, test, type Page } from "@playwright/test";

const SCREEN = "/?sim";
const UNIT = "PlantA/Area1/Unit1";

/** Runs code against the simulator's controls in the page. */
const sim = (page: Page, fn: string) => page.evaluate(`(() => { const s = window.__hmiSim; ${fn} })()`);
const symbol = (page: Page, id: string) => page.locator(`[data-symbol="${id}"]`);

test.beforeEach(async ({ page }) => {
  await page.goto(SCREEN);
  await expect(symbol(page, "P-101")).toHaveAttribute("data-quality", "good");
  // Retained values show on load, for every symbol (shared topics included).
  await expect(symbol(page, "P-101").locator('[data-part="value"]')).toHaveText("0");
  await expect(symbol(page, "T-101").locator('[data-part="value"]')).toHaveText("62.5");
});

test("values and states follow the tags", async ({ page }) => {
  await sim(page, `s.set("${UNIT}/T101/Level", 40)`);
  await expect(symbol(page, "T-101").locator('[data-part="value"]')).toHaveText("40.0");
  await expect(symbol(page, "T-101")).toHaveAttribute("style", /--level: 0\.400/);

  await sim(page, `s.set("${UNIT}/P101/Running", true)`);
  await expect(symbol(page, "P-101")).toHaveAttribute("data-run", "running");

  await sim(page, `s.set("${UNIT}/P101/Mode", "manual")`);
  await expect(symbol(page, "P-101")).toHaveAttribute("data-mode", "manual");
});

test("an alarm shows its priority, blinks until acknowledged, then stays until it clears", async ({ page }) => {
  await sim(page, `s.set("${UNIT}/T101/Level", 92); s.pollAlarms()`);
  const tank = symbol(page, "T-101");
  await expect(tank).toHaveAttribute("data-alarm", "high");
  await expect(tank).toHaveAttribute("data-alarm-acked", "false");

  await tank.click();
  await page.locator('[data-action="ack"]').click();
  await sim(page, "s.pollAlarms()");
  await expect(tank).toHaveAttribute("data-alarm-acked", "true");

  await sim(page, `s.set("${UNIT}/T101/Level", 50); s.pollAlarms()`);
  await expect(tank).toHaveAttribute("data-alarm", "none");
});

test("bad data, a failing source and a lost link each mark the symbol", async ({ page }) => {
  await sim(page, `s.set("${UNIT}/P101/Speed", 900, "bad")`);
  await expect(symbol(page, "P-101")).toHaveAttribute("data-quality", "bad");

  await sim(page, `s.set("${UNIT}/P101/Speed", 900, "uncertain")`);
  await expect(symbol(page, "P-101")).toHaveAttribute("data-quality", "uncertain");

  await sim(page, `s.setSource("datasources:plc1", { connected: false })`);
  await expect(symbol(page, "XV-101")).toHaveAttribute("data-quality", "comms-lost");
  await sim(page, `s.setSource("datasources:plc1", { connected: true, failingPoints: ["${UNIT}/XV101/Open"] })`);
  await expect(symbol(page, "XV-101")).toHaveAttribute("data-quality", "bad");
  await sim(page, `s.setSource("datasources:plc1", {})`);

  await sim(page, "s.setConnected(false)");
  await expect(symbol(page, "T-101")).toHaveAttribute("data-quality", "comms-lost");
  await expect(page.locator("[data-link-lost]")).toBeVisible();
  await sim(page, "s.setConnected(true)");
  await expect(symbol(page, "T-101")).toHaveAttribute("data-quality", "good");
});

test("a start is selected, confirmed, and shown only once the device reports it", async ({ page }) => {
  await symbol(page, "P-101").click();
  await page.locator('[data-action="start"]').click();
  await expect(page.locator("[data-confirm]")).toContainText("Start P-101");
  expect(await sim(page, "return s.published.length")).toBe(0); // nothing written before Confirm

  await page.locator('[data-action="execute"]').click();
  await expect(page.locator('[data-status="confirmed"]')).toBeVisible();
  await expect(symbol(page, "P-101")).toHaveAttribute("data-run", "running");
  expect(await sim(page, "return s.published")).toEqual([{ topic: `${UNIT}/P101/StartCmd`, value: true }]);
});

test("a setpoint is confirmed by the adapter's read-back, not by its own echo", async ({ page }) => {
  await symbol(page, "P-101").click();
  await page.locator('[data-input="setpoint"]').fill("1200");
  await page.locator('[data-action="setpoint"]').click();
  await page.locator('[data-action="execute"]').click();
  await expect(page.locator('[data-status="pending"]')).toBeVisible();
  await expect(page.locator('[data-status="confirmed"]')).toBeVisible();
});

test("controls are withheld without permission and on bad data", async ({ page }) => {
  await page.addInitScript(() => ((window as any).__hmiSimInit = { allowed: false }));
  await page.reload();
  await symbol(page, "P-101").click();
  await expect(page.locator("[data-blocked]")).toContainText("permission");
  await expect(page.locator('[data-action="start"]')).toHaveCount(0);
});
