"use client";

import Link from "next/link";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { isClerkPublishableConfigured } from "@/lib/clerkConfigured";
import { isConvexConfigured } from "@/lib/convexConfigured";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="font-medium tracking-tight">
          Vend
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted">
          {isConvexConfigured() ? <AdminLinks /> : null}
          {isClerkPublishableConfigured() ? <AuthControls /> : null}
        </nav>
      </div>
    </header>
  );
}

function AuthControls() {
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="rounded-md border border-border px-3 py-1.5 text-foreground hover:bg-surface">
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </>
  );
}

function AdminLinks() {
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  if (!me?.isAdmin) {
    return null;
  }
  return (
    <>
      <Link href="/admin" className="hover:text-foreground">
        Events
      </Link>
      <Link href="/admin/blacklist" className="hover:text-foreground">
        Blacklist
      </Link>
    </>
  );
}
