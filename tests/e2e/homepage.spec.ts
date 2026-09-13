import { expect, test } from "./browser-fixture";

test.describe("homepage", () => {
  test("renders the established sections and anchor navigation", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("lang", "sv");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();

    for (const id of ["aktuellt", "sommarhuset", "about", "kontakt"]) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }

    for (const hash of ["#aktuellt", "#sommarhuset", "#kontakt"]) {
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
        .getByRole("link", { name: /upplevelser/i })
        .last(),
    ).toBeVisible();
  });

  test("highlights link to the featured article whose headings provide anchors", async ({
    page,
  }) => {
    await page.goto("/");

    const highlights = page.locator("a.highlight-item");
    const count = await highlights.count();
    expect(count).toBeGreaterThan(0);

    const hrefs = await highlights.evaluateAll((links) =>
      links.map((link) => (link as HTMLAnchorElement).getAttribute("href")),
    );
    const articleHrefs = new Set(
      hrefs.map((href) => (href ?? "").split("#")[0]),
    );
    expect(articleHrefs.size).toBe(1);
    const articleHref = [...articleHrefs][0];
    expect(articleHref).toMatch(/^\/artiklar\/.+\/$/);

    const response = await page.goto(articleHref!);
    expect(response?.status()).toBe(200);

    const fragmentTargets = new Set(
      hrefs
        .map((href) => href?.split("#")[1])
        .filter((fragment): fragment is string => Boolean(fragment)),
    );
    for (const fragment of fragmentTargets) {
      await expect(page.locator(`[id="${fragment}"]`)).toHaveCount(1);
    }

    if (fragmentTargets.size === 0) {
      const anchorableHeadings = page.locator(
        ".article-body h2[id], .article-body h3[id]",
      );
      expect(await anchorableHeadings.count()).toBeGreaterThan(0);
    }
  });

  test("house image dialog opens, closes with Escape, and restores focus", async ({
    page,
  }) => {
    await page.goto("/");

    const trigger = page
      .locator(
        "#sommarhuset [data-house-modal-trigger], #sommarhuset [data-house-dialog-trigger], #sommarhuset button",
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
