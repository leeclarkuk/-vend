export const RESERVED_SLUGS = new Set([
  "admin",
  "sign-in",
  "sign-up",
  "api",
  "new",
  "blacklist",
]);

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
