"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { api } from "@/convex/_generated/api";
import CopyButton from "@/components/CopyButton";
import { isConvexConfigured } from "@/lib/convexConfigured";

type ClaimResult =
  | { status: "claimed"; code: string }
  | { status: "ineligible" }
  | { status: "exhausted" }
  | { status: "missing" };

export default function ClaimPage() {
  if (!isConvexConfigured()) {
    return (
      <main className="mx-auto max-w-xl px-6 py-24">
        <h1 className="text-3xl font-medium tracking-tight">Backend not connected</h1>
        <p className="mt-4 text-muted">
          Claiming needs a real Convex deployment. This preview has no backend,
          so codes cannot be issued.
        </p>
      </main>
    );
  }
  return <ClaimPageInner />;
}

function ClaimPageInner() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const event = useQuery(api.events.getPublic, slug ? { slug } : "skip");

  if (!slug || event === undefined) {
    return (
      <main className="mx-auto max-w-xl px-6 py-24 text-sm text-muted">
        Loading…
      </main>
    );
  }

  if (event === null) {
    return (
      <main className="mx-auto max-w-xl px-6 py-24">
        <h1 className="text-3xl font-medium tracking-tight">No event here</h1>
        <p className="mt-4 text-muted">
          That URL does not match an event. Check the link you were given.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <p className="text-sm text-muted">Event</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">{event.name}</h1>
      <AuthLoading>
        <p className="mt-8 text-sm text-muted">Checking sign-in…</p>
      </AuthLoading>
      <Unauthenticated>
        <p className="mt-6 leading-relaxed text-muted">
          Sign in with Google or an email code so we can confirm the address is
          yours. If it is on the list, you will get a code. The same email
          always gets the same code back.
        </p>
        <SignInButton mode="modal" forceRedirectUrl={`/${slug}`}>
          <button className="mt-8 rounded-md bg-accent px-4 py-2 text-sm text-background">
            Sign in to claim
          </button>
        </SignInButton>
      </Unauthenticated>
      <Authenticated>
        <AutoClaim slug={slug} />
      </Authenticated>
    </main>
  );
}

function AutoClaim({ slug }: { slug: string }) {
  const claim = useMutation(api.claim.claimForCurrentUser);
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    void claim({ slug })
      .then(setResult)
      .catch((err: unknown) => {
        started.current = false;
        setError(err instanceof Error ? err.message : "Could not claim");
      });
  }, [claim, slug]);

  if (error) {
    return <p className="mt-8 text-sm text-red-400">{error}</p>;
  }
  if (!result) {
    return <p className="mt-8 text-sm text-muted">Claiming…</p>;
  }
  if (result.status === "claimed") {
    return (
      <div className="mt-10 rounded-lg border border-border bg-surface p-6">
        <p className="text-sm text-muted">Your code</p>
        <p className="mt-3 break-all font-mono text-2xl tracking-wide">
          {result.code}
        </p>
        <div className="mt-6">
          <CopyButton value={result.code} />
        </div>
        <p className="mt-6 text-sm text-muted">
          Keep this. Signing in again with the same email returns the same code.
        </p>
      </div>
    );
  }
  if (result.status === "ineligible") {
    return (
      <p className="mt-8 leading-relaxed text-muted">
        This email is not on the list for this event. If that looks wrong, talk
        to the organisers.
      </p>
    );
  }
  if (result.status === "exhausted") {
    return (
      <p className="mt-8 leading-relaxed text-muted">
        Every code for this event has been claimed. Talk to the organisers.
      </p>
    );
  }
  return (
    <p className="mt-8 text-muted">
      That URL does not match an event. Check the link you were given.
    </p>
  );
}
