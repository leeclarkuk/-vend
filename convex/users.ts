import { query } from "./_generated/server";
import { emailIsAdmin } from "./lib/auth";
import { normalizeEmail } from "./lib/text";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      return { signedIn: false, isAdmin: false, email: null as string | null };
    }
    const email = normalizeEmail(identity.email);
    return {
      signedIn: true,
      isAdmin: emailIsAdmin(email),
      email,
    };
  },
});
