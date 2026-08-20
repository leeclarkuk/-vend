import { SignIn } from "@clerk/nextjs";
import { isClerkPublishableConfigured } from "@/lib/clerkConfigured";

export default function SignInPage() {
  if (!isClerkPublishableConfigured()) {
    return (
      <main className="mx-auto max-w-xl px-6 py-24">
        <h1 className="text-2xl font-medium">Sign-in is not configured</h1>
        <p className="mt-3 text-muted">
          Set Clerk production keys on the host, then redeploy.
        </p>
      </main>
    );
  }
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6 py-16">
      <SignIn />
    </main>
  );
}
