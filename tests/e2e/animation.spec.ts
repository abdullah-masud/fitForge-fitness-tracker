import { test, expect } from "@playwright/test";
import { freshData } from "../../src/lib/catalog";

test.beforeEach(async ({ page }) => {
  const data = freshData();
  data.onboarded = true;
  await page.addInitScript(
    (data) =>
      !localStorage.getItem("fitforge-demo-v1") &&
      localStorage.setItem(
        "fitforge-demo-v1",
        JSON.stringify({ data, dirty: false }),
      ),
    data,
  );
});

test("3D guide supports front, angled, side, hand close-up, pause and scrubbing", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#library");
  await page.getByRole("textbox", { name: "Search exercises" }).fill("bicep");
  await page.locator(".exercise-card").first().click();
  const player = page.locator(".real-3d");
  await expect(player.locator('canvas[data-renderer="true-3d"]')).toBeVisible({
    timeout: 30000,
  });
  const slider = page.getByRole("slider", { name: "Scrub demonstration" });
  await expect
    .poll(async () => Number(await slider.inputValue()))
    .toBeGreaterThan(20);
  await page.getByRole("button", { name: "Pause demonstration" }).click();
  await slider.fill("500");
  await expect(slider).toHaveValue("500");
  await page.getByRole("button", { name: "Front view", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Front view", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Hands close-up", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Full body", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("combobox", { name: "Demonstration speed" })
    .selectOption("0.5");
  await page.getByRole("button", { name: "Restart demonstration" }).click();
  await expect(slider).toHaveValue("0");
  await page.getByRole("button", { name: "Side view", exact: true }).click();
  await page.getByRole("button", { name: "3/4 view", exact: true }).click();
  await page.getByRole("button", { name: "Full body", exact: true }).click();
  await page.getByRole("button", { name: "Play demonstration" }).click();
  await expect
    .poll(async () => Number(await slider.inputValue()))
    .toBeGreaterThan(10);
  await page.getByRole("button", { name: "Pause demonstration" }).click();
  await slider.fill("450");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("dialog").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.screenshot({ path: "test-results/rotatable-3d-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Close dialog" }).click();
});

test("reduced motion starts paused and camera controls stay available", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: /How to do each exercise/ }).click();
  await page.locator(".exercise-card").first().click();
  await expect(page.locator(".real-3d canvas")).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole("button", { name: "Play demonstration" }),
  ).toBeVisible();
  await expect(
    page.getByRole("slider", { name: "Scrub demonstration" }),
  ).toHaveValue("0");
  await page.getByRole("button", { name: "Front view", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Scrub demonstration" }),
  ).toHaveValue("0");
  await page.getByRole("button", { name: "Close dialog" }).click();
});

test("12 and 24 week program is explicit, persists and does not invent completed sessions", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept());
  await page.goto("/#plan");
  await page.getByLabel("Plan horizon").selectOption("24");
  await page
    .getByRole("button", { name: "Start this plan", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Plan applied");
  const state = await page.evaluate(
    () => JSON.parse(localStorage.getItem("fitforge-demo-v1")!).data,
  );
  expect(state.program.weeks).toBe(24);
  expect(state.program.phase).toBe(1);
  expect(state.trainingProfile.weightKg).toBe(65);
  expect(state.sessions).toHaveLength(0);
  expect(
    state.plans[0].exercises.every((e: { sets: number }) => e.sets === 2),
  ).toBe(true);
  await page.getByLabel("Phase to preview").selectOption("2");
  await expect(
    page.getByRole("button", { name: "Apply selected phase", exact: true }),
  ).toBeVisible();
  const before = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("fitforge-demo-v1")!).data.program.phase,
  );
  expect(before).toBe(1);
  await page
    .getByRole("button", { name: "Apply selected phase", exact: true })
    .click();
  await page.reload();
  await expect(page.getByLabel("Phase to preview")).toHaveValue("2");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/program-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("key chest, leg, back and core guides render and release their 3D canvases", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#library");
  for (const [query, file] of [
    ["Dumbbell flat bench press", "press"],
    ["Goblet squat", "squat"],
    ["One-arm dumbbell row", "row"],
    ["Reverse lunge", "lunge"],
    ["Dead bug", "core"],
    ["Dumbbell Romanian deadlift", "hinge"],
  ]) {
    await page.getByRole("textbox", { name: "Search exercises" }).fill(query);
    await page.locator(".exercise-card").first().click();
    await expect(page.locator(".real-3d canvas")).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("slider", { name: "Scrub demonstration" }).fill("450");
    await page.evaluate(() => new Promise(requestAnimationFrame));
    await page
      .locator(".three-stage")
      .screenshot({ path: `test-results/movement-${file}.png` });
    await page.getByRole("button", { name: "Close dialog" }).click();
    await expect(page.locator(".real-3d canvas")).toHaveCount(0);
  }
});
