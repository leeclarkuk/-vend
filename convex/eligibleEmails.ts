import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { BATCH_LIMIT, isProbablyEmail, normalizeEmail } from "./lib/text";
import { isBlacklisted, recordBlacklistHit } from "./blacklist";

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
    let flagged = 0;
    let blacklisted = 0;
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

      // App-wide blacklist: reject outright, recorded for this event.
      if (await isBlacklisted(ctx, email)) {
        await recordBlacklistHit(ctx, args.eventId, email);
        blacklisted += 1;
        continue;
      }

      // Cross-event duplicate: don't add directly, flag for review instead.
      const elsewhere = await ctx.db
        .query("eligibleEmails")
        .withIndex("by_email", (q) => q.eq("email", email))
        .filter((q) => q.neq(q.field("eventId"), args.eventId))
        .first();
      if (elsewhere) {
        const alreadyFlagged = await ctx.db
          .query("flaggedEmails")
          .withIndex("by_event_and_email", (q) =>
            q.eq("eventId", args.eventId).eq("email", email),
          )
          .filter((q) => q.eq(q.field("status"), "pending"))
          .unique();
        if (!alreadyFlagged) {
          await ctx.db.insert("flaggedEmails", {
            eventId: args.eventId,
            email,
            otherEventId: elsewhere.eventId,
            status: "pending",
            createdAt: Date.now(),
          });
          flagged += 1;
        }
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
    return { added, flagged, blacklisted };
  },
});
