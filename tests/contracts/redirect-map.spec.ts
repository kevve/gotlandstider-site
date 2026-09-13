import { expect, test } from "@playwright/test";
import { LEGACY_ARTICLE_SLUG_MAP } from "../../src/lib/redirects";

test("redirect map stays coherent", () => {
  const entries = Object.entries(LEGACY_ARTICLE_SLUG_MAP);
  expect(entries.length).toBeGreaterThan(0);

  const targets = entries.map(([, targetSlug]) => targetSlug);
  expect(new Set(targets).size).toBe(targets.length);

  for (const [legacySlug, targetSlug] of entries) {
    expect(legacySlug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(targetSlug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(legacySlug, "a slug must not map to itself").not.toBe(targetSlug);
  }
});
