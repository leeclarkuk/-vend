/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, beforeEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

const ADMIN_EMAIL = "admin@example.com";
const ATTENDEE_EMAIL = "lee@x.com";

beforeEach(() => {
  process.env.ADMIN_EMAILS = ADMIN_EMAIL;
});

function setup() {
  const t = convexTest(schema, modules);
  const admin = t.withIdentity({ email: ADMIN_EMAIL });
  const attendee = t.withIdentity({ email: ATTENDEE_EMAIL });
  return { t, admin, attendee };
}

async function seedEvent(
  admin: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>,
  opts?: { emails?: string[]; codes?: string[]; slug?: string },
) {
  const eventId: Id<"events"> = await admin.mutation(api.events.create, {
    name: "Hackathon 1",
    slug: opts?.slug ?? "hackathon-1",
  });
  if (opts?.emails?.length) {
    await admin.mutation(api.eligibleEmails.addBatch, {
      eventId,
      emails: opts.emails,
    });
  }
  if (opts?.codes?.length) {
    await admin.mutation(api.codes.addBatch, {
      eventId,
      codes: opts.codes,
    });
  }
  return eventId;
}

test("eligible attendee is assigned a code", async () => {
  const { admin, attendee } = setup();
  await seedEvent(admin, {
    emails: [ATTENDEE_EMAIL],
    codes: ["CODE-ONE"],
  });

  const result = await attendee.mutation(api.claim.claimForCurrentUser, {
    slug: "hackathon-1",
  });
  expect(result).toEqual({ status: "claimed", code: "CODE-ONE" });
});

test("re-claim is idempotent and does not increment claimedCount", async () => {
  const { admin, attendee } = setup();
  const eventId = await seedEvent(admin, {
    emails: [ATTENDEE_EMAIL],
    codes: ["CODE-ONE", "CODE-TWO"],
  });

  const first = await attendee.mutation(api.claim.claimForCurrentUser, {
    slug: "hackathon-1",
  });
  const second = await attendee.mutation(api.claim.claimForCurrentUser, {
    slug: "hackathon-1",
  });
  expect(first).toEqual(second);
  expect(first).toEqual({ status: "claimed", code: "CODE-ONE" });

  const event = await admin.query(api.events.get, { eventId });
  expect(event?.claimedCount).toBe(1);
});

test("ineligible email cannot claim", async () => {
  const { admin, attendee } = setup();
  await seedEvent(admin, {
    emails: ["someone-else@x.com"],
    codes: ["CODE-ONE"],
  });

  const result = await attendee.mutation(api.claim.claimForCurrentUser, {
    slug: "hackathon-1",
  });
  expect(result).toEqual({ status: "ineligible" });
});

test("exhausted pool returns exhausted", async () => {
  const { t, admin, attendee } = setup();
  await seedEvent(admin, {
    emails: [ATTENDEE_EMAIL, "other@x.com"],
    codes: ["ONLY-CODE"],
  });

  const first = await attendee.mutation(api.claim.claimForCurrentUser, {
    slug: "hackathon-1",
  });
  expect(first).toEqual({ status: "claimed", code: "ONLY-CODE" });

  const other = t.withIdentity({ email: "other@x.com" });
  const second = await other.mutation(api.claim.claimForCurrentUser, {
    slug: "hackathon-1",
  });
  expect(second).toEqual({ status: "exhausted" });
});

test("unauthenticated claim is rejected", async () => {
  const { t, admin } = setup();
  await seedEvent(admin, {
    emails: [ATTENDEE_EMAIL],
    codes: ["CODE-ONE"],
  });

  await expect(
    t.mutation(api.claim.claimForCurrentUser, { slug: "hackathon-1" }),
  ).rejects.toThrow(/Not authenticated/);
});

test("non-admin cannot create an event", async () => {
  const { attendee } = setup();
  await expect(
    attendee.mutation(api.events.create, {
      name: "Nope",
      slug: "nope",
    }),
  ).rejects.toThrow(/Not authorised/);
});

test("email matching is case-insensitive", async () => {
  const { t, admin } = setup();
  await seedEvent(admin, {
    emails: ["lee@x.com"],
    codes: ["CODE-ONE"],
  });

  const mixedCase = t.withIdentity({ email: "Lee@X.com" });
  const result = await mixedCase.mutation(api.claim.claimForCurrentUser, {
    slug: "hackathon-1",
  });
  expect(result).toEqual({ status: "claimed", code: "CODE-ONE" });
});

test("duplicate slugs are rejected", async () => {
  const { admin } = setup();
  await seedEvent(admin, { slug: "hackathon-1" });
  await expect(
    admin.mutation(api.events.create, {
      name: "Hackathon 1 again",
      slug: "hackathon-1",
    }),
  ).rejects.toThrow(/Slug already in use/);
});

test("reserved slugs are rejected", async () => {
  const { admin } = setup();
  await expect(
    admin.mutation(api.events.create, {
      name: "Admin",
      slug: "admin",
    }),
  ).rejects.toThrow(/reserved/);
});

test("missing event slug returns missing", async () => {
  const { attendee } = setup();
  const result = await attendee.mutation(api.claim.claimForCurrentUser, {
    slug: "does-not-exist",
  });
  expect(result).toEqual({ status: "missing" });
});

test("duplicate emails and codes in a batch are skipped", async () => {
  const { admin } = setup();
  const eventId = await seedEvent(admin, {
    emails: ["lee@x.com", "LEE@x.com", "not-an-email"],
    codes: [" ALPHA ", "ALPHA", "BETA"],
  });
  const event = await admin.query(api.events.get, { eventId });
  expect(event?.eligibleCount).toBe(1);
  expect(event?.codeCount).toBe(2);
});

test("blacklisted email is rejected on upload and recorded as a hit", async () => {
  const { admin } = setup();
  await admin.mutation(api.blacklist.add, {
    email: "blocked@x.com",
    reason: "prior abuse",
  });
  const eventId = await seedEvent(admin);

  const result = await admin.mutation(api.eligibleEmails.addBatch, {
    eventId,
    emails: ["blocked@x.com", "ok@x.com"],
  });
  expect(result).toEqual({ added: 1, flagged: 0, blacklisted: 1 });

  const event = await admin.query(api.events.get, { eventId });
  expect(event?.eligibleCount).toBe(1);

  const hits = await admin.query(api.blacklist.listHitsForEvent, { eventId });
  expect(hits).toHaveLength(1);
  expect(hits[0].email).toBe("blocked@x.com");
});

test("un-blacklisting clears recorded hits", async () => {
  const { admin } = setup();
  await admin.mutation(api.blacklist.add, { email: "blocked@x.com" });
  const eventId = await seedEvent(admin);
  await admin.mutation(api.eligibleEmails.addBatch, {
    eventId,
    emails: ["blocked@x.com"],
  });

  const entries = await admin.query(api.blacklist.list);
  expect(entries).toHaveLength(1);
  expect(entries[0].hitCount).toBe(1);

  await admin.mutation(api.blacklist.remove, {
    blacklistId: entries[0]._id,
  });

  const hits = await admin.query(api.blacklist.listHitsForEvent, { eventId });
  expect(hits).toHaveLength(0);
});

test("email already on another event's list is flagged, not added", async () => {
  const { admin } = setup();
  await seedEvent(admin, { slug: "hackathon-1", emails: ["dup@x.com"] });
  const eventTwo = await seedEvent(admin, { slug: "hackathon-2" });

  const result = await admin.mutation(api.eligibleEmails.addBatch, {
    eventId: eventTwo,
    emails: ["dup@x.com", "fresh@x.com"],
  });
  expect(result).toEqual({ added: 1, flagged: 1, blacklisted: 0 });

  const event = await admin.query(api.events.get, { eventId: eventTwo });
  expect(event?.eligibleCount).toBe(1);

  const flagged = await admin.query(api.flaggedEmails.listForEvent, {
    eventId: eventTwo,
  });
  expect(flagged).toHaveLength(1);
  expect(flagged[0].email).toBe("dup@x.com");
});

test("approving a flagged email adds it to the eligible list", async () => {
  const { admin, attendee } = setup();
  await seedEvent(admin, { slug: "hackathon-1", emails: [ATTENDEE_EMAIL] });
  const eventTwo = await seedEvent(admin, {
    slug: "hackathon-2",
    codes: ["CODE-TWO"],
  });
  await admin.mutation(api.eligibleEmails.addBatch, {
    eventId: eventTwo,
    emails: [ATTENDEE_EMAIL],
  });

  const [flaggedRow] = await admin.query(api.flaggedEmails.listForEvent, {
    eventId: eventTwo,
  });
  await admin.mutation(api.flaggedEmails.approve, {
    flaggedId: flaggedRow._id,
  });

  const event = await admin.query(api.events.get, { eventId: eventTwo });
  expect(event?.eligibleCount).toBe(1);

  const claim = await attendee.mutation(api.claim.claimForCurrentUser, {
    slug: "hackathon-2",
  });
  expect(claim).toEqual({ status: "claimed", code: "CODE-TWO" });
});

test("rejecting a flagged email leaves it ineligible", async () => {
  const { admin, attendee } = setup();
  await seedEvent(admin, { slug: "hackathon-1", emails: [ATTENDEE_EMAIL] });
  const eventTwo = await seedEvent(admin, {
    slug: "hackathon-2",
    codes: ["CODE-TWO"],
  });
  await admin.mutation(api.eligibleEmails.addBatch, {
    eventId: eventTwo,
    emails: [ATTENDEE_EMAIL],
  });

  const [flaggedRow] = await admin.query(api.flaggedEmails.listForEvent, {
    eventId: eventTwo,
  });
  await admin.mutation(api.flaggedEmails.reject, {
    flaggedId: flaggedRow._id,
  });

  const stillFlagged = await admin.query(api.flaggedEmails.listForEvent, {
    eventId: eventTwo,
  });
  expect(stillFlagged).toHaveLength(0);

  const claim = await attendee.mutation(api.claim.claimForCurrentUser, {
    slug: "hackathon-2",
  });
  expect(claim).toEqual({ status: "ineligible" });
});

test("a blacklisted flagged email cannot be approved", async () => {
  const { admin } = setup();
  await seedEvent(admin, { slug: "hackathon-1", emails: ["dup@x.com"] });
  const eventTwo = await seedEvent(admin, { slug: "hackathon-2" });
  await admin.mutation(api.eligibleEmails.addBatch, {
    eventId: eventTwo,
    emails: ["dup@x.com"],
  });
  await admin.mutation(api.blacklist.add, { email: "dup@x.com" });

  const [flaggedRow] = await admin.query(api.flaggedEmails.listForEvent, {
    eventId: eventTwo,
  });
  await expect(
    admin.mutation(api.flaggedEmails.approve, { flaggedId: flaggedRow._id }),
  ).rejects.toThrow(/blacklisted/);
});

test("non-admin cannot manage the blacklist", async () => {
  const { attendee } = setup();
  await expect(
    attendee.mutation(api.blacklist.add, { email: "someone@x.com" }),
  ).rejects.toThrow(/Not authorised/);
});
