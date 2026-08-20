export function isClerkPublishableConfigured(): boolean {
  return (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").startsWith("pk_");
}

export function isClerkConfigured(): boolean {
  return (
    isClerkPublishableConfigured() &&
    (process.env.CLERK_SECRET_KEY ?? "").startsWith("sk_")
  );
}
