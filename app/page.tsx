"use client";

import Link from "next/link";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { isClerkPublishableConfigured } from "@/lib/clerkConfigured";
import { isConvexConfigured } from "@/lib/convexConfigured";

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-24">
      <p className="text-sm text-muted">Credit codes for events</p>
      <h1 className="text-4xl font-medium tracking-tight">Vend</h1>
      <p className="max-w-xl text-lg leading-relaxed text-muted">
        Organisers load a list of emails and a pool of unique codes. Attendees
        open the event link, sign in, and receive a code if they are on the
        list. The same email always gets the same code back.
      </p>
      {isConvexConfigured() && isClerkPublishableConfigured() ? (
        <HomeCta />
      ) : (
        <DisconnectedCta />
      )}
    </main>
  );
}

function HomeCta() {
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");

  return (
    <div className="flex flex-wrap gap-3">
      <SignedOut>
        <SignInButton mode="modal">
          <button className="rounded-md bg-accent px-4 py-2 text-sm text-background">
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        {me?.isAdmin ? (
          <Link
            href="/admin"
            className="rounded-md bg-accent px-4 py-2 text-sm text-background"
          >
            Manage events
          </Link>
        ) : (
          <p className="text-sm text-muted">
            Signed in as {me?.email ?? "you"}. Use the event URL you were given.
          </p>
        )}
      </SignedIn>
    </div>
  );
}

function DisconnectedCta() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Convex is not connected in this preview, so claiming and the admin
        list are off. The page itself should still load.
      </p>
      {isClerkPublishableConfigured() ? (
        <div>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-md bg-accent px-4 py-2 text-sm text-background">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <p className="text-sm text-muted">
              Signed in. Backend is not connected yet.
            </p>
          </SignedIn>
        </div>
      ) : null}
    </div>
  );
}
