"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export default function BlacklistPage() {
  const entries = useQuery(api.blacklist.list);
  const addEntry = useMutation(api.blacklist.add);
  const removeEntry = useMutation(api.blacklist.remove);

  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await addEntry({ email, reason: reason.trim() || undefined });
      setEmail("");
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add address");
    } finally {
      setSaving(false);
    }
  }

  async function onRemove(id: Id<"blacklist">) {
    setError(null);
    setRemovingId(id);
    try {
      await removeEntry({ blacklistId: id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove address");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm text-muted">Admin</p>
      <h1 className="mt-1 text-3xl font-medium tracking-tight">Blacklist</h1>
      <p className="mt-2 leading-relaxed text-muted">
        Blacklisted addresses are rejected on every path that would add them to
        an event&apos;s eligible list, across all events. Addresses already on
        an event&apos;s list before being blacklisted are left untouched.
      </p>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="mt-8 flex flex-col gap-4 md:flex-row md:items-end"
      >
        <label className="flex flex-1 flex-col gap-2 text-sm">
          <span>Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
            placeholder="bad-actor@example.com"
          />
        </label>
        <label className="flex flex-1 flex-col gap-2 text-sm">
          <span>Reason (optional)</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
            placeholder="Fraudulent claims"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-accent px-4 py-2 text-sm text-background disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add"}
        </button>
      </form>
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

      <div className="mt-10 overflow-hidden rounded-lg border border-border">
        {entries === undefined ? (
          <p className="px-4 py-8 text-sm text-muted">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted">
            No blacklisted addresses.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Hits</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry._id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 font-mono">{entry.email}</td>
                  <td className="px-4 py-3 text-muted">
                    {entry.reason ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{entry.hitCount}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={removingId === entry._id}
                      onClick={() => void onRemove(entry._id)}
                      className="text-sm text-muted hover:text-foreground disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
