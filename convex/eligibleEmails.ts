import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { BATCH_LIMIT, isProbablyEmail, normalizeEmail } from "./lib/text";

export const addBatch = mutation({
  args: {
    eventId: v.id("events"),
    emails: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.emails.length > BATCH_LIMIT) {
      throw new Error(`Batch cannot exceed ${BATCH_LIMIT} emails`);
    }
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    let added = 0;
    const seen = new Set<string>();
    for (const raw of args.emails) {
      const email = normalizeEmail(raw);
      if (!email || !isProbablyEmail(email) || seen.has(email)) {
        continue;
      }
      seen.add(email);
      const existing = await ctx.db
        .query("eligibleEmails")
        .withIndex("by_event_and_email", (q) =>
          q.eq("eventId", args.eventId).eq("email", email),
        )
        .unique();
      if (existing) {
        continue;
      }
      await ctx.db.insert("eligibleEmails", {
        eventId: args.eventId,
        email,
      });
      added += 1;
    }

    if (added > 0) {
      await ctx.db.patch(args.eventId, {
        eligibleCount: event.eligibleCount + added,
      });
    }
    return { added };
  },
});
