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
    .index("by_event_and_email", ["eventId", "email"])
    .index("by_email", ["email"]),

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

  // Cross-event duplicate flagging: an uploaded email that already appears
  // on another event's eligible list lands here instead of being added
  // directly, pending an organiser's approve/reject decision.
  flaggedEmails: defineTable({
    eventId: v.id("events"),
    email: v.string(),
    otherEventId: v.id("events"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    createdAt: v.number(),
    decidedBy: v.optional(v.string()),
    decidedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_event_and_email", ["eventId", "email"])
    .index("by_event_and_status", ["eventId", "status"]),

  // App-wide email blacklist, managed by global admins at /admin/blacklist.
  blacklist: defineTable({
    email: v.string(),
    reason: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // One row per rejected upload attempt against a blacklisted address, kept
  // per-event so organisers can see why an address didn't make their list.
  // Cleared when the address is un-blacklisted.
  blacklistHits: defineTable({
    eventId: v.id("events"),
    email: v.string(),
    createdAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_email", ["email"]),

  auditLog: defineTable({
    type: v.string(),
    email: v.string(),
    actor: v.string(),
    eventId: v.optional(v.id("events")),
    details: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_email", ["email"]),
});
