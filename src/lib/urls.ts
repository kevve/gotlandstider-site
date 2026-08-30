export const PRODUCTION_ORIGIN = "https://gotlandstider.se";

const EXTERNAL_OR_FRAGMENT = /^(?:[a-z][a-z\d+.-]*:|#)/i;

/** Add Astro's configured base path to an internal route or public asset path. */
export function withBase(path: string): string {
  if (EXTERNAL_OR_FRAGMENT.test(path)) {
    return path;
  }

  const base = normalizeBase(import.meta.env.BASE_URL);
  const normalizedPath = `/${path.replace(/^\/+/, "")}`;

  if (normalizedPath === "/") {
    return base;
  }

  if (
    base !== "/" &&
    (normalizedPath === base.slice(0, -1) || normalizedPath.startsWith(base))
  ) {
    return normalizedPath;
  }

  return base === "/"
    ? normalizedPath
    : `${base.slice(0, -1)}${normalizedPath}`;
}

/** Build the production canonical URL. Preview base paths must never leak into canonicals. */
export function canonicalUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return new URL(
    `/${path.replace(/^\/+/, "")}`,
    `${PRODUCTION_ORIGIN}/`,
  ).toString();
}

function normalizeBase(base: string | undefined): string {
  if (!base || base === "/") {
    return "/";
  }

  return `/${base.replace(/^\/+|\/+$/g, "")}/`;
}
