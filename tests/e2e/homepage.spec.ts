import { expect, test } from "@playwright/test";

test.describe("homepage", () => {
  test("renders the established sections and anchor navigation", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("lang", "sv");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();

    for (const id of ["stories", "house", "about", "contact"]) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }

    for (const hash of ["#stories", "#house", "#contact"]) {
      await expect(page.locator(`a[href$="${hash}"]`).first()).toBeAttached();
    }
    await expect(page.locator('a[href$="/artiklar/"]').first()).toBeAttached();
  });

  test("shows three unique archive cards without depending on random titles", async ({
    page,
  }) => {
    await page.goto("/");

    const cards = page.locator(
      '[data-article-grid] [data-random-card]:visible a[href*="/artiklar/"], #archive-scroll-container article:visible a[href*="/artiklar/"]',
    );
    await expect(cards).toHaveCount(3);

    const hrefs = await cards.evaluateAll((links) =>
      links.map((link) => (link as HTMLAnchorElement).getAttribute("href")),
    );
    expect(new Set(hrefs).size).toBe(3);
  });

  test("mobile menu exposes state and makes navigation available", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const menuButton = page.getByRole("button", { name: /meny/i });
    await expect(menuButton).toBeVisible();
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");

    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await expect(
      page
        .getByRole("navigation")
        .getByRole("link", { name: /arkivet/i })
        .last(),
    ).toBeVisible();
  });

  test("house image dialog opens, closes with Escape, and restores focus", async ({
    page,
  }) => {
    await page.goto("/");

    const trigger = page
      .locator(
        "#house [data-house-modal-trigger], #house [data-house-dialog-trigger], #house button",
      )
      .first();
    await expect(trigger).toBeVisible();
    await trigger.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("img")).toHaveAttribute("src", /\/content\//);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
