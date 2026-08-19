import { v } from "convex/values";
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";
import { isProbablyEmail, normalizeEmail } from "./lib/text";
import { logAudit } from "./lib/audit";

// Plain helpers (not exposed as Convex functions) so other mutations, like
// eligibleEmails.addBatch, can check/record against the blacklist inline.
export async function isBlacklisted(
  ctx: QueryCtx | MutationCtx,
  email: string,
): Promise<boolean> {
  const hit = await ctx.db
    .query("blacklist")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
  return hit !== null;
}

export async function recordBlacklistHit(
  ctx: MutationCtx,
  eventId: Id<"events">,
  email: string,
): Promise<void> {
  await ctx.db.insert("blacklistHits", {
    eventId,
    email,
    createdAt: Date.now(),
  });
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const entries = await ctx.db.query("blacklist").order("desc").collect();
    return await Promise.all(
      entries.map(async (entry) => {
        const hits = await ctx.db
          .query("blacklistHits")
          .withIndex("by_email", (q) => q.eq("email", entry.email))
          .collect();
        return { ...entry, hitCount: hits.length };
      }),
    );
  },
});

export const listHitsForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("blacklistHits")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: { email: v.string(), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const email = normalizeEmail(args.email);
    if (!email || !isProbablyEmail(email)) {
      throw new Error("Enter a valid email address");
    }
    const existing = await ctx.db
      .query("blacklist")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) {
      throw new Error("That address is already blacklisted");
    }
    const reason = args.reason?.trim() || undefined;
    await ctx.db.insert("blacklist", {
      email,
      reason,
      createdBy: admin.email,
      createdAt: Date.now(),
    });
    await logAudit(ctx, {
      type: "blacklist_added",
      email,
      actor: admin.email,
      details: reason,
    });
  },
});

export const remove = mutation({
  args: { blacklistId: v.id("blacklist") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const entry = await ctx.db.get(args.blacklistId);
    if (!entry) {
      throw new Error("Not found");
    }
    await ctx.db.delete(args.blacklistId);
    // Un-blacklisting clears its recorded hits.
    const hits = await ctx.db
      .query("blacklistHits")
      .withIndex("by_email", (q) => q.eq("email", entry.email))
      .collect();
    for (const hit of hits) {
      await ctx.db.delete(hit._id);
    }
    await logAudit(ctx, {
      type: "blacklist_removed",
      email: entry.email,
      actor: admin.email,
    });
  },
});
