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
