"use client";

import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated, useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function HomePage() {
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-24">
      <p className="text-sm text-muted">Credit codes for events</p>
      <h1 className="text-4xl font-medium tracking-tight">Vend</h1>
      <p className="max-w-xl text-lg leading-relaxed text-muted">
        Organisers load a list of emails and a pool of unique codes. Attendees
        open the event link, sign in, and receive a code if they are on the
        list. The same email always gets the same code back.
      </p>
      <div className="flex flex-wrap gap-3">
        <Unauthenticated>
          <SignInButton mode="modal">
            <button className="rounded-md bg-accent px-4 py-2 text-sm text-background">
              Sign in
            </button>
          </SignInButton>
        </Unauthenticated>
        <Authenticated>
          {me?.isAdmin ? (
            <Link
              href="/admin"
              className="rounded-md bg-accent px-4 py-2 text-sm text-background"
            >
              Manage events
            </Link>
          ) : (
            <p className="text-sm text-muted">
              Signed in as {me?.email}. Use the event URL you were given.
            </p>
          )}
        </Authenticated>
      </div>
    </main>
  );
}
