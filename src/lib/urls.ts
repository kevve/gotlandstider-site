export const PRODUCTION_ORIGIN = "https://gotlandstider.se";

/** Build the production canonical URL. */
export function canonicalUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return new URL(
    `/${path.replace(/^\/+/, "")}`,
    `${PRODUCTION_ORIGIN}/`,
  ).toString();
}
