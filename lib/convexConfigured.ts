export function isConvexConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    return false;
  }
  try {
    const host = new URL(url).hostname;
    if (host === "placeholder.convex.cloud" || host.startsWith("placeholder.")) {
      return false;
    }
  } catch {
    return false;
  }
  return true;
}
