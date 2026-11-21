import { test, expect } from "@playwright/test";
test("onboarding, workout refresh, completion, history and import are truthful", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome to FitForge." }),
  ).toBeVisible();
  await page.getByLabel("What should we call you?").fill("Test Athlete");
  for (let i = 0; i < 5; i++)
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Generate my plan" }).click();
  await expect(
    page.getByRole("heading", { name: "Your stronger tomorrow." }),
  ).toBeVisible();
  await expect(page.locator(".sync-status")).toContainText("Local demo");
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "My Workout", exact: true }).click();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .first()
    .click();
  await page.getByLabel("Weight (kg per dumbbell)").fill("4");
  await page.getByLabel("Actual repetitions").fill("12");
  await page
    .getByRole("button", { name: "Complete set 1", exact: true })
    .click();
  await expect(page.locator(".logged-sets")).toContainText("12 reps @ 4 kg");
  await page.reload();
  await expect(page.locator(".logged-sets")).toContainText("12 reps @ 4 kg");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Complete set 2", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByLabel("Weight (kg per dumbbell)").fill("4");
  await page.getByLabel("Actual repetitions").fill("10");
  await page
    .getByRole("button", { name: "Complete set 2", exact: true })
    .click();
  await expect(page.locator(".logged-sets > .row")).toHaveCount(2);
  await expect(page.locator(".logged-sets")).toContainText("10 reps @ 4 kg");
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Finish & save workout" }).click();
  await expect(
    page.getByRole("heading", { name: "Workout complete." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "History", exact: true }).click();
  await expect(page.locator(".history-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await page
    .getByRole("button", { name: "Import my two historical workouts" })
    .click();
  await expect(page.getByRole("status")).toContainText("2 sessions imported");
  await page
    .getByRole("button", { name: "Import my two historical workouts" })
    .click();
  await expect(page.getByRole("status")).toContainText("0 sessions imported");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.locator(".history-card")).toHaveCount(3);
  await page
    .getByRole("link", { name: "Progress", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "See yourself getting stronger." }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Exercise Library", exact: true })
    .click();
  await page.getByRole("textbox", { name: "Search exercises" }).fill("bicep");
  await page.locator(".exercise-card").first().click();
  await expect(page.getByRole("dialog")).toContainText("How to perform");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
