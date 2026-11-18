// Playwright checks for a P&ID screen on the simulator: pipes meet ports,
// flow follows the plant, and nothing moves on untrusted data.
// Run: npx playwright test --trace off
import { expect, test, type Page } from "@playwright/test";

const SCREEN = "/?sim&screen=pid";
const UNIT = "PlantA/Area1/Unit1";
const sim = (page: Page, fn: string) => page.evaluate(`(() => { const s = window.__hmiSim; ${fn} })()`);

test.beforeEach(async ({ page }) => {
  await page.goto(SCREEN);
  await expect(page.locator('[data-symbol="P-101"]')).toHaveAttribute("data-quality", "good");
});

test("every pipe end sits on a port", async ({ page }) => {
  const gaps = await page.evaluate(() => {
    const ports = [...document.querySelectorAll("[data-port]")].map((p) => {
      const r = p.getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2];
    });
    const out: number[] = [];
    for (const path of document.querySelectorAll<SVGPathElement>("[data-pipe]:not(.signal)")) {
      const m = path.getScreenCTM()!;
      for (const len of [0, path.getTotalLength()]) {
        const p = path.getPointAtLength(len);
        const x = m.a * p.x + m.c * p.y + m.e;
        const y = m.b * p.x + m.d * p.y + m.f;
        // An open line end (to the battery limit) has no port; skip ends beyond the symbols.
        const nearest = Math.min(...ports.map(([px, py]) => Math.hypot(px - x, py - y)));
        if (nearest < 40) out.push(nearest);
      }
    }
    return out;
  });
  expect(gaps.length).toBeGreaterThanOrEqual(5);
  for (const g of gaps) expect(g).toBeLessThan(1.5);
});

test("flow follows the pump and the valve", async ({ page }) => {
  const suction = page.locator('[data-pipe="suction"]');
  await expect(suction).toHaveAttribute("data-flow", "none");
  await sim(page, `s.set("${UNIT}/P101/Running", true)`);
  await expect(suction).toHaveAttribute("data-flow", "forward");
  await expect(page.locator('[data-pipe="outlet"]')).toHaveAttribute("data-flow", "none");
  await sim(page, `s.set("${UNIT}/XV101/Open", true)`);
  await expect(page.locator('[data-pipe="outlet"]')).toHaveAttribute("data-flow", "forward");
});

test("motion stops when the data cannot be trusted", async ({ page }) => {
  await sim(page, `s.set("${UNIT}/P101/Running", true)`);
  const suction = page.locator('[data-pipe="suction"]');
  await expect(suction).toHaveCSS("animation-name", "hmi-flow");
  await sim(page, `s.setSource("datasources:plc1", { connected: false })`);
  await expect(suction).toHaveCSS("animation-name", "none");
  await expect(page.locator('[data-symbol="P-101"] [data-part="rotor"]')).toHaveCSS("animation-name", "none");
});

test("instruments show live values and open the faceplate", async ({ page }) => {
  await sim(page, `s.set("${UNIT}/T101/Level", 47.25)`);
  await expect(page.locator('[data-symbol="LT-101"] [data-part="value"]')).toHaveText("47.3");
  await page.locator('[data-symbol="P-101"]').click();
  await expect(page.locator("[data-faceplate]")).toContainText("P-101");
});
