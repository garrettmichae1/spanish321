import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("core screens have no automated WCAG A/AA violations", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start learning" }).waitFor();
  for (const screen of [
    "Today",
    "Lesson",
    "Assignments",
    "Flashcards",
    "Settings",
  ]) {
    if (screen === "Lesson")
      await page.getByRole("button", { name: "Start learning" }).click();
    else if (screen !== "Today")
      await page
        .getByRole("button", {
          name:
            screen === "Settings"
              ? "Settings & backup"
              : new RegExp("^" + screen),
        })
        .first()
        .click();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations, screen).toEqual([]);
  }
});
