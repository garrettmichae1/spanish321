import { test, expect } from "@playwright/test";
test("complete offline learning loop, persistence and export", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A new day. A little more español." }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Start learning" }).click();
  await expect(
    page.getByRole("heading", { name: "Sounds, spelling & survival phrases" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark lesson read" }).click();
  await expect(
    page.getByRole("button", { name: "Lesson read", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Practice this unit" }).click();
  await page.getByLabel("hola", { exact: true }).check();
  await page.getByLabel("sí", { exact: true }).check();
  await page
    .getByRole("textbox", { name: "Answer 6", exact: true })
    .fill("No entiendo");
  await page.getByRole("button", { name: "Check my answers" }).click();
  await expect(
    page.getByRole("heading", { name: "Practice result" }),
  ).toBeVisible();
  await expect(page.locator(".feedback").first()).toContainText("Correct");
  await page.getByRole("button", { name: "Apply it in your homework" }).click();
  await page
    .getByLabel("Your work & reflection")
    .first()
    .fill("Hola. Soy Ana. ¿Puede repetir, por favor?");
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Flashcards/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Reveal answer" }).click();
  await page.getByRole("button", { name: "Good Recalled correctly" }).click();
  await expect(page.getByText("1/20 today")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "A new day. A little more español." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Assignments", exact: true }).click();
  await expect(page.getByLabel("Your work & reflection").first()).toHaveValue(
    "Hola. Soy Ana. ¿Puede repetir, por favor?",
  );
  await page.getByRole("button", { name: "Portfolio", exact: true }).click();
  await expect(page.locator(".stat").first()).toContainText("1/12");
  await expect(page.locator(".result-row")).toContainText("practice");
  await page.getByRole("button", { name: "Settings & backup" }).click();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup" }).click();
  const file = await (await dl).path();
  expect(file).toBeTruthy();
  await context.setOffline(false);
});
test("course map distinguishes drafts from planned courses and works on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("button", { name: "Courses", exact: true }).click();
  await expect(page.locator(".unit-card")).toHaveCount(12);
  await page.getByRole("button", { name: "Spanish II", exact: true }).click();
  await expect(
    page.getByText("This course is a syllabus, not a usable course yet.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.locator(".unit-card").first()).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("backup restore rejects malformed data without overwriting work", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Assignments", exact: true }).click();
  await page
    .getByLabel("Your work & reflection")
    .first()
    .fill("Keep this draft");
  await page.getByRole("button", { name: "Settings & backup" }).click();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":999}'),
    });
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Assignments", exact: true }).click();
  await expect(page.getByLabel("Your work & reflection").first()).toHaveValue(
    "Keep this draft",
  );
});
test("restores valid backups, preserves retired content IDs and separates assessment attempts", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Courses", exact: true }).click();
  await page.getByRole("button", { name: /Cumulative midterm/ }).click();
  await page.getByLabel("Attempt type").selectOption("assessment");
  await page.getByRole("button", { name: "Check my answers" }).click();
  await page.getByRole("button", { name: "Settings & backup" }).click();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup" }).click();
  const file = await (await event).path();
  const fs = await import("node:fs/promises");
  const backup = JSON.parse(await fs.readFile(file!, "utf8"));
  expect(backup.attempts[0].mode).toBe("assessment");
  backup.completed.push("retired-content-stable-id");
  backup.homework["c1-u01-h1"] = {
    text: "Restored writing with accents: sí, él, año.",
    evaluation: "self",
    updated: Date.now(),
  };
  page.on("dialog", (d) => d.accept());
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "valid.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
  await expect(page.getByRole("status")).toContainText("Backup restored");
  await page.reload();
  await page.getByRole("button", { name: "Assignments", exact: true }).click();
  await expect(page.getByLabel("Your work & reflection").first()).toHaveValue(
    "Restored writing with accents: sí, él, año.",
  );
  await page.getByRole("button", { name: "Settings & backup" }).click();
  const next = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup" }).click();
  const restored = JSON.parse(
    await fs.readFile((await (await next).path())!, "utf8"),
  );
  expect(restored.completed).toContain("retired-content-stable-id");
});
test("imports CSV atomically and preserves Spanish characters", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings & backup" }).click();
  const csv =
    'id,unit,kind,front,back,example\ncustom-1,custom,production,"Say yes","Sí","Sí, por favor."';
  await page
    .locator("input[type=file]")
    .nth(1)
    .setInputFiles({
      name: "cards.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
  await expect(page.getByRole("status")).toContainText("1 cards imported");
  await page
    .locator("input[type=file]")
    .nth(1)
    .setInputFiles({
      name: "cards.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
  await expect(page.getByRole("alert")).toContainText("Duplicate card ID");
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export all cards" }).click();
  const fs = await import("node:fs/promises");
  const contents = await fs.readFile((await (await event).path())!, "utf8");
  expect(contents).toContain("Sí, por favor.");
  expect(contents.match(/custom-1/g)).toHaveLength(1);
});
test("records with a simulated microphone, saves and reopens local audio", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["microphone"]);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Practice studio", exact: true })
    .click();
  await page.getByRole("button", { name: "Start a recording" }).click();
  await expect(page.getByText("Recording · 3 min maximum")).toBeVisible();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Stop & save recording" }).click();
  await expect(page.locator("audio")).toHaveCount(1);
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Practice studio", exact: true })
    .click();
  await expect(page.locator("audio")).toHaveCount(1);
  expect(await page.locator("audio").getAttribute("src")).toMatch(
    /^data:audio\//,
  );
});
