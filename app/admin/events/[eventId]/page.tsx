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
  const updateEvent = useMutation(api.events.update);
  const addEmails = useMutation(api.eligibleEmails.addBatch);
  const addCodes = useMutation(api.codes.addBatch);
  const [eventUrl, setEventUrl] = useState<string | null>(null);

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
      let codesAdded = 0;
      for (const batch of chunk(parseList(emailsText))) {
        const result = await addEmails({ eventId: typedId, emails: batch });
        emailsAdded += result.added;
      }
      for (const batch of chunk(parseList(codesText))) {
        const result = await addCodes({ eventId: typedId, codes: batch });
        codesAdded += result.added;
      }
      setEmailsText("");
      setCodesText("");
      setMessage(`Added ${emailsAdded} email${emailsAdded === 1 ? "" : "s"} and ${codesAdded} code${codesAdded === 1 ? "" : "s"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add lists");
    } finally {
      setSaving(false);
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

      <section className="mt-8 grid grid-cols-3 gap-4">
        <Stat label="Eligible" value={event.eligibleCount} />
        <Stat label="Codes" value={event.codeCount} />
        <Stat label="Claimed" value={event.claimedCount} />
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
