"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { chunk, parseList } from "@/lib/parseList";
import { slugify } from "@/lib/slug";

export default function NewEventPage() {
  const router = useRouter();
  const createEvent = useMutation(api.events.create);
  const addEmails = useMutation(api.eligibleEmails.addBatch);
  const addCodes = useMutation(api.codes.addBatch);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [emailsText, setEmailsText] = useState("");
  const [codesText, setCodesText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const previewSlug = useMemo(
    () => (slugTouched ? slugify(slug) : slugify(name)),
    [name, slug, slugTouched],
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const emails = parseList(emailsText);
      const codes = parseList(codesText);
      const eventId: Id<"events"> = await createEvent({
        name,
        slug: previewSlug,
      });
      for (const batch of chunk(emails)) {
        await addEmails({ eventId, emails: batch });
      }
      for (const batch of chunk(codes)) {
        await addCodes({ eventId, codes: batch });
      }
      router.push(`/admin/events/${eventId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create event");
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-sm text-muted">Admin</p>
      <h1 className="mt-1 text-3xl font-medium tracking-tight">New event</h1>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-10 flex flex-col gap-6">
        <label className="flex flex-col gap-2 text-sm">
          <span>Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
            placeholder="Hackathon 1"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span>Slug</span>
          <input
            value={slugTouched ? slug : previewSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className="rounded-md border border-border bg-surface px-3 py-2 font-mono outline-none focus:border-accent"
            placeholder="hackathon-1"
          />
          <span className="text-muted">Attendees go to /{previewSlug || "…"}</span>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span>Eligible emails</span>
          <textarea
            value={emailsText}
            onChange={(e) => setEmailsText(e.target.value)}
            rows={8}
            className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs outline-none focus:border-accent"
            placeholder={"one@example.com\ntwo@example.com"}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span>Codes</span>
          <textarea
            value={codesText}
            onChange={(e) => setCodesText(e.target.value)}
            rows={8}
            className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs outline-none focus:border-accent"
            placeholder={"CODE-ONE\nCODE-TWO"}
          />
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={saving || !previewSlug}
          className="self-start rounded-md bg-accent px-4 py-2 text-sm text-background disabled:opacity-50"
        >
          {saving ? "Saving…" : "Create event"}
        </button>
      </form>
    </main>
  );
}
