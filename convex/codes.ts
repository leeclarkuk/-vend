import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { BATCH_LIMIT } from "./lib/text";

export const addBatch = mutation({
  args: {
    eventId: v.id("events"),
    codes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.codes.length > BATCH_LIMIT) {
      throw new Error(`Batch cannot exceed ${BATCH_LIMIT} codes`);
    }
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    let added = 0;
    const seen = new Set<string>();
    for (const raw of args.codes) {
      const code = raw.trim();
      if (!code || seen.has(code)) {
        continue;
      }
      seen.add(code);
      const existing = await ctx.db
        .query("codes")
        .withIndex("by_event_and_code", (q) =>
          q.eq("eventId", args.eventId).eq("code", code),
        )
        .unique();
      if (existing) {
        continue;
      }
      await ctx.db.insert("codes", {
        eventId: args.eventId,
        code,
        status: "available",
      });
      added += 1;
    }

    if (added > 0) {
      await ctx.db.patch(args.eventId, {
        codeCount: event.codeCount + added,
      });
    }
    return { added };
  },
});
