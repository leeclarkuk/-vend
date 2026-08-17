export function parseList(text: string): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const part of text.split(/[\n,]+/)) {
    const value = part.trim();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    items.push(value);
  }
  return items;
}

export const CLIENT_BATCH_SIZE = 200;

export function chunk<T>(items: T[], size = CLIENT_BATCH_SIZE): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}
