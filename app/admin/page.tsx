"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function AdminEventsPage() {
  const events = useQuery(api.events.list);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Admin</p>
          <h1 className="mt-1 text-3xl font-medium tracking-tight">Events</h1>
        </div>
        <Link
          href="/admin/events/new"
          className="rounded-md bg-accent px-4 py-2 text-sm text-background"
        >
          New event
        </Link>
      </div>

      <div className="mt-10 overflow-hidden rounded-lg border border-border">
        {events === undefined ? (
          <p className="px-4 py-8 text-sm text-muted">Loading…</p>
        ) : events.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted">
            No events yet. Create one and paste the email list and code pool.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">URL</th>
                <th className="px-4 py-3 font-medium">Claimed</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event._id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/events/${event._id}`}
                      className="hover:underline"
                    >
                      {event.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-muted">
                    /{event.slug}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {event.claimedCount} / {event.codeCount}
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
