import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  events: defineTable({
    name: v.string(),
    slug: v.string(),
    createdBy: v.string(),
    eligibleCount: v.number(),
    codeCount: v.number(),
    claimedCount: v.number(),
  }).index("by_slug", ["slug"]),

  eligibleEmails: defineTable({
    eventId: v.id("events"),
    email: v.string(),
  })
    .index("by_event", ["eventId"])
    .index("by_event_and_email", ["eventId", "email"]),

  codes: defineTable({
    eventId: v.id("events"),
    code: v.string(),
    status: v.union(v.literal("available"), v.literal("claimed")),
    claimedByEmail: v.optional(v.string()),
    claimedByUserId: v.optional(v.string()),
    claimedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_event_and_code", ["eventId", "code"])
    .index("by_event_and_status", ["eventId", "status"])
    .index("by_event_and_claimedByEmail", ["eventId", "claimedByEmail"]),
});
