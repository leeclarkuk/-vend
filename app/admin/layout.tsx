"use client";

import { ReactNode } from "react";
import { Authenticated, AuthLoading, Unauthenticated, useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");

  return (
    <>
      <AuthLoading>
        <main className="mx-auto max-w-5xl px-6 py-16 text-sm text-muted">
          Checking access…
        </main>
      </AuthLoading>
      <Unauthenticated>
        <main className="mx-auto max-w-5xl px-6 py-16 text-sm text-muted">
          Sign in to continue.
        </main>
      </Unauthenticated>
      <Authenticated>
        {me === undefined ? (
          <main className="mx-auto max-w-5xl px-6 py-16 text-sm text-muted">
            Checking access…
          </main>
        ) : me.isAdmin ? (
          children
        ) : (
          <main className="mx-auto max-w-2xl px-6 py-16">
            <h1 className="text-2xl font-medium">No access</h1>
            <p className="mt-3 text-muted">
              This account is not on the admin list. If that is wrong, add{" "}
              <span className="font-mono text-foreground">{me.email}</span> to
              ADMIN_EMAILS on the Convex deployment.
            </p>
          </main>
        )}
      </Authenticated>
    </>
  );
}
