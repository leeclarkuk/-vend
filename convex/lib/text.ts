export const RESERVED_SLUGS = new Set([
  "admin",
  "sign-in",
  "sign-up",
  "api",
  "new",
  "blacklist",
]);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isProbablyEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function normalizeSlug(value: string): string {
  const slug = slugify(value);
  if (slug.length < 2) {
    throw new Error("Slug must be at least 2 characters");
  }
  if (RESERVED_SLUGS.has(slug)) {
    throw new Error("That slug is reserved");
  }
  return slug;
}

export const BATCH_LIMIT = 200;
