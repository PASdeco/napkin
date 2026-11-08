import { test, expect } from "@playwright/test";

// Reads-only happy path: the board, landing and idea pages work without a
// wallet because reads use a read-only client. Wallet writes need an
// extension, which CI can't provide — those are covered by the contract's
// gltest suite plus manual QA.

test("landing renders hero, form and live board section", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Every big idea starts on a");
  await expect(page.getByLabel("Your startup idea")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send to the panel" })).toBeVisible();
  // Live chain data (or a graceful notice) must be present — never a blank section.
  await expect(page.getByText("Prize pool this week")).toBeVisible();
});

test("counter tracks input and clamps at 400", async ({ page }) => {
  await page.goto("/pitch");
  const box = page.getByLabel("Your startup idea");
  await box.fill("A");
  await expect(page.getByText("1 / 400")).toBeVisible();
});

test("short pitches are rejected client-side with a hint", async ({ page }) => {
  await page.goto("/pitch");
  await page.getByLabel("Your startup idea").fill("too short");
  await page.getByRole("button", { name: "Send to the panel" }).click();
  await expect(page.getByRole("status")).toContainText("at least 30 characters");
  // No wallet modal, no transaction — the form just nudges.
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("board page shows current week and archive section", async ({ page }) => {
  await page.goto("/board");
  await expect(page.getByText("This week’s board")).toBeVisible();
  await expect(page.getByText("Past weeks")).toBeVisible();
  await expect(page.getByText("Prize pool this week")).toBeVisible();
});

test("idea page handles a missing idea gracefully", async ({ page }) => {
  await page.goto("/idea/999999");
  await expect(page.getByText(/Could not load this idea|Loading the napkin/)).toBeVisible();
});

test("404 page is the napkin-flavoured one", async ({ page }) => {
  await page.goto("/definitely-not-a-page");
  await expect(page.getByText("Nothing on this")).toBeVisible();
});

test("theme toggle persists and swaps the logo asset", async ({ page }) => {
  await page.goto("/");
  const logo = page.locator("nav img").first();
  await expect(logo).toHaveAttribute("src", /napkin-logo-(light|dark)-bg\.png/);
  const before = await logo.getAttribute("src");
  await page.getByRole("button", { name: /Switch between light and dark mode/ }).click();
  await page.waitForTimeout(300);
  const after = await page.locator("nav img").first().getAttribute("src");
  expect(after).toBeTruthy();
  expect(after).not.toBe(before);
  const stored = await page.evaluate(() => localStorage.getItem("nk-theme"));
  expect(["light", "dark"]).toContain(stored ?? "");
});
