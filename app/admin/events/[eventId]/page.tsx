"use client";

import { FormEvent, use, useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { chunk, parseList } from "@/lib/parseList";
import CopyButton from "@/components/CopyButton";

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const typedId = eventId as Id<"events">;
  const event = useQuery(api.events.get, { eventId: typedId });
  const flagged = useQuery(api.flaggedEmails.listForEvent, { eventId: typedId });
  const blacklistHits = useQuery(api.blacklist.listHitsForEvent, {
    eventId: typedId,
  });
  const updateEvent = useMutation(api.events.update);
  const addEmails = useMutation(api.eligibleEmails.addBatch);
  const addCodes = useMutation(api.codes.addBatch);
  const approveFlagged = useMutation(api.flaggedEmails.approve);
  const rejectFlagged = useMutation(api.flaggedEmails.reject);
  const [eventUrl, setEventUrl] = useState<string | null>(null);
  const [flagError, setFlagError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  useEffect(() => {
    if (event?.slug) {
      setEventUrl(`${window.location.origin}/${event.slug}`);
    }
  }, [event?.slug]);

  const [name, setName] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [emailsText, setEmailsText] = useState("");
  const [codesText, setCodesText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (event === undefined) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16 text-sm text-muted">
        Loading…
      </main>
    );
  }
  if (event === null) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-2xl font-medium">Event not found</h1>
      </main>
    );
  }

  const nameValue = name ?? event.name;
  const slugValue = slug ?? event.slug;

  async function saveMeta(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      await updateEvent({ eventId: typedId, name: nameValue, slug: slugValue });
      setMessage("Saved name and slug.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function appendLists(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      let emailsAdded = 0;
      let emailsFlagged = 0;
      let emailsBlacklisted = 0;
      let codesAdded = 0;
      for (const batch of chunk(parseList(emailsText))) {
        const result = await addEmails({ eventId: typedId, emails: batch });
        emailsAdded += result.added;
        emailsFlagged += result.flagged;
        emailsBlacklisted += result.blacklisted;
      }
      for (const batch of chunk(parseList(codesText))) {
        const result = await addCodes({ eventId: typedId, codes: batch });
        codesAdded += result.added;
      }
      setEmailsText("");
      setCodesText("");
      const parts = [
        `Added ${emailsAdded} email${emailsAdded === 1 ? "" : "s"} and ${codesAdded} code${codesAdded === 1 ? "" : "s"}.`,
      ];
      if (emailsFlagged > 0) {
        parts.push(
          `${emailsFlagged} flagged for review (already on another event's list).`,
        );
      }
      if (emailsBlacklisted > 0) {
        parts.push(`${emailsBlacklisted} rejected (blacklisted).`);
      }
      setMessage(parts.join(" "));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add lists");
    } finally {
      setSaving(false);
    }
  }

  async function decideFlagged(
    flaggedId: Id<"flaggedEmails">,
    decision: "approve" | "reject",
  ) {
    setFlagError(null);
    setDecidingId(flaggedId);
    try {
      if (decision === "approve") {
        await approveFlagged({ flaggedId });
      } else {
        await rejectFlagged({ flaggedId });
      }
    } catch (err) {
      setFlagError(err instanceof Error ? err.message : "Could not decide");
    } finally {
      setDecidingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/admin" className="text-sm text-muted hover:text-foreground">
        ← Events
      </Link>
      <h1 className="mt-4 text-3xl font-medium tracking-tight">{event.name}</h1>
      <div className="mt-2 flex items-center gap-3">
        <p className="font-mono text-sm text-muted">/{event.slug}</p>
        <CopyButton value={eventUrl ?? `/${event.slug}`} />
      </div>

      <section className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Eligible" value={event.eligibleCount} />
        <Stat label="Codes" value={event.codeCount} />
        <Stat label="Claimed" value={event.claimedCount} />
        <Stat label="Flagged" value={flagged?.length ?? 0} />
      </section>

      <form onSubmit={(e) => void saveMeta(e)} className="mt-10 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span>Name</span>
          <input
            value={nameValue}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span>Slug</span>
          <input
            value={slugValue}
            onChange={(e) => setSlug(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 font-mono outline-none focus:border-accent"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="self-end rounded-md border border-border px-4 py-2 text-sm hover:bg-surface disabled:opacity-50"
        >
          Save
        </button>
      </form>

      <form onSubmit={(e) => void appendLists(e)} className="mt-10 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span>Add emails</span>
          <textarea
            value={emailsText}
            onChange={(e) => setEmailsText(e.target.value)}
            rows={6}
            className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span>Add codes</span>
          <textarea
            value={codesText}
            onChange={(e) => setCodesText(e.target.value)}
            rows={6}
            className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs outline-none focus:border-accent"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="self-start rounded-md bg-accent px-4 py-2 text-sm text-background disabled:opacity-50"
        >
          Add to pool
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      {message ? <p className="mt-4 text-sm text-muted">{message}</p> : null}

      <section className="mt-12">
        <h2 className="text-lg font-medium">Flagged for review</h2>
        <p className="mt-1 text-sm text-muted">
          These addresses already appear on another event&apos;s eligible
          list. Approve to add them here, or reject to leave them off.
        </p>
        {flagError ? (
          <p className="mt-3 text-sm text-red-400">{flagError}</p>
        ) : null}
        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          {flagged === undefined ? (
            <p className="px-4 py-8 text-sm text-muted">Loading…</p>
          ) : flagged.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted">Nothing flagged.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {flagged.map((row) => (
                  <tr key={row._id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{row.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          disabled={decidingId === row._id}
                          onClick={() => void decideFlagged(row._id, "approve")}
                          className="text-sm text-accent hover:underline disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={decidingId === row._id}
                          onClick={() => void decideFlagged(row._id, "reject")}
                          className="text-sm text-muted hover:text-foreground disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium">Blacklisted</h2>
        <p className="mt-1 text-sm text-muted">
          Upload attempts rejected because the address is on the app-wide
          blacklist. Manage the blacklist at{" "}
          <Link href="/admin/blacklist" className="underline">
            /admin/blacklist
          </Link>
          .
        </p>
        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          {blacklistHits === undefined ? (
            <p className="px-4 py-8 text-sm text-muted">Loading…</p>
          ) : blacklistHits.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted">No rejected uploads.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Email</th>
                </tr>
              </thead>
              <tbody>
                {blacklistHits.map((hit) => (
                  <tr key={hit._id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{hit.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium">Claims</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          {event.claims.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted">No claims yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                </tr>
              </thead>
              <tbody>
                {event.claims.map((claim) => (
                  <tr key={`${claim.email}-${claim.code}`} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{claim.email}</td>
                    <td className="px-4 py-3 font-mono">{claim.code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-medium">{value}</p>
    </div>
  );
}
