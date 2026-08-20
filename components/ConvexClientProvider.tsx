"use client";

import { ReactNode, useMemo } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
import { isConvexConfigured } from "@/lib/convexConfigured";

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  if (!isConvexConfigured()) {
    return children;
  }
  return <ConnectedConvexProvider>{children}</ConnectedConvexProvider>;
}

function ConnectedConvexProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    return new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  }, []);

  return (
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
