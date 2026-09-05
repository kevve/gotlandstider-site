import { expect, test } from "@playwright/test";
import { articlePath } from "./fixtures";
import { LEGACY_ARTICLE_SLUG_MAP } from "../../src/lib/redirects";

test("redirect map targets resolve as published article routes", async ({
  request,
}) => {
  const responses = await Promise.all(
    Object.values(LEGACY_ARTICLE_SLUG_MAP).map((targetSlug) =>
      request.get(articlePath(targetSlug)),
    ),
  );
  for (const response of responses) {
    expect(response.status(), response.url()).toBe(200);
  }
});

test("legacy article routes are not emitted for any mapped slug", async ({
  request,
}) => {
  const responses = await Promise.all(
    Object.keys(LEGACY_ARTICLE_SLUG_MAP).map((legacySlug) =>
      request.get(`/articles/${legacySlug}/`),
    ),
  );
  for (const response of responses) {
    expect(response.status(), response.url()).toBe(404);
  }
});

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
