import { QueryCtx, MutationCtx } from "../_generated/server";
import { normalizeEmail } from "./text";

type AuthCtx = QueryCtx | MutationCtx;

export type SignedInUser = {
  email: string;
  tokenIdentifier: string;
};

export async function requireIdentity(ctx: AuthCtx): Promise<SignedInUser> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  if (!identity.email) {
    throw new Error("Signed-in account has no email");
  }
  return {
    email: normalizeEmail(identity.email),
    tokenIdentifier: identity.tokenIdentifier,
  };
}

export function readAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export function emailIsAdmin(email: string): boolean {
  return readAdminEmails().includes(normalizeEmail(email));
}

export async function requireAdmin(ctx: AuthCtx): Promise<SignedInUser> {
  const user = await requireIdentity(ctx);
  if (!emailIsAdmin(user.email)) {
    throw new Error("Not authorised");
  }
  return user;
}