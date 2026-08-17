import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireIdentity } from "./lib/auth";

export const claimForCurrentUser = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const user = await requireIdentity(ctx);
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!event) {
      return { status: "missing" as const };
    }

    const existing = await ctx.db
      .query("codes")
      .withIndex("by_event_and_claimedByEmail", (q) =>
        q.eq("eventId", event._id).eq("claimedByEmail", user.email),
      )
      .unique();
    if (existing) {
      return { status: "claimed" as const, code: existing.code };
    }

    const eligible = await ctx.db
      .query("eligibleEmails")
      .withIndex("by_event_and_email", (q) =>
        q.eq("eventId", event._id).eq("email", user.email),
      )
      .unique();
    if (!eligible) {
      return { status: "ineligible" as const };
    }

    const available = await ctx.db
      .query("codes")
      .withIndex("by_event_and_status", (q) =>
        q.eq("eventId", event._id).eq("status", "available"),
      )
      .first();
    if (!available) {
      return { status: "exhausted" as const };
    }

    await ctx.db.patch(available._id, {
      status: "claimed",
      claimedByEmail: user.email,
      claimedByUserId: user.tokenIdentifier,
      claimedAt: Date.now(),
    });
    await ctx.db.patch(event._id, {
      claimedCount: event.claimedCount + 1,
    });
    return { status: "claimed" as const, code: available.code };
  },
});
