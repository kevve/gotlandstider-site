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
