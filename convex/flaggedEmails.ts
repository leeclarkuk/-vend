import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { logAudit } from "./lib/audit";
import { isBlacklisted } from "./blacklist";

export const listForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("flaggedEmails")
      .withIndex("by_event_and_status", (q) =>
        q.eq("eventId", args.eventId).eq("status", "pending"),
      )
      .order("desc")
      .collect();
  },
});

export const approve = mutation({
  args: { flaggedId: v.id("flaggedEmails") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const flagged = await ctx.db.get(args.flaggedId);
    if (!flagged) {
      throw new Error("Not found");
    }
    if (flagged.status !== "pending") {
      throw new Error("Already decided");
    }
    if (await isBlacklisted(ctx, flagged.email)) {
      throw new Error("This address is blacklisted and cannot be approved");
    }
    const event = await ctx.db.get(flagged.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const alreadyEligible = await ctx.db
      .query("eligibleEmails")
      .withIndex("by_event_and_email", (q) =>
        q.eq("eventId", flagged.eventId).eq("email", flagged.email),
      )
      .unique();
    if (!alreadyEligible) {
      await ctx.db.insert("eligibleEmails", {
        eventId: flagged.eventId,
        email: flagged.email,
      });
      await ctx.db.patch(flagged.eventId, {
        eligibleCount: event.eligibleCount + 1,
      });
    }

    await ctx.db.patch(args.flaggedId, {
      status: "approved",
      decidedBy: admin.email,
      decidedAt: Date.now(),
    });
    await logAudit(ctx, {
      type: "flag_approved",
      email: flagged.email,
      actor: admin.email,
      eventId: flagged.eventId,
    });
  },
});

export const reject = mutation({
  args: { flaggedId: v.id("flaggedEmails") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const flagged = await ctx.db.get(args.flaggedId);
    if (!flagged) {
      throw new Error("Not found");
    }
    if (flagged.status !== "pending") {
      throw new Error("Already decided");
    }
    await ctx.db.patch(args.flaggedId, {
      status: "rejected",
      decidedBy: admin.email,
      decidedAt: Date.now(),
    });
    await logAudit(ctx, {
      type: "flag_rejected",
      email: flagged.email,
      actor: admin.email,
      eventId: flagged.eventId,
    });
  },
});
