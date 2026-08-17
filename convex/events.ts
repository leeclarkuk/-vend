import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { normalizeSlug } from "./lib/text";

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const name = args.name.trim();
    if (!name) {
      throw new Error("Name is required");
    }
    const slug = normalizeSlug(args.slug);
    const existing = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing) {
      throw new Error("Slug already in use");
    }
    return await ctx.db.insert("events", {
      name,
      slug,
      createdBy: admin.tokenIdentifier,
      eligibleCount: 0,
      codeCount: 0,
      claimedCount: 0,
    });
  },
});

export const update = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }
    const name = args.name.trim();
    if (!name) {
      throw new Error("Name is required");
    }
    const slug = normalizeSlug(args.slug);
    if (slug !== event.slug) {
      const existing = await ctx.db
        .query("events")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (existing) {
        throw new Error("Slug already in use");
      }
    }
    await ctx.db.patch(args.eventId, { name, slug });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("events").order("desc").collect();
  },
});

export const get = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      return null;
    }
    const claims = await ctx.db
      .query("codes")
      .withIndex("by_event_and_status", (q) =>
        q.eq("eventId", args.eventId).eq("status", "claimed"),
      )
      .collect();
    claims.sort((a, b) => (b.claimedAt ?? 0) - (a.claimedAt ?? 0));
    return {
      ...event,
      claims: claims.map((row) => ({
        code: row.code,
        email: row.claimedByEmail ?? "",
        claimedAt: row.claimedAt ?? 0,
      })),
    };
  },
});

export const getPublic = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!event) {
      return null;
    }
    return { name: event.name, slug: event.slug };
  },
});
