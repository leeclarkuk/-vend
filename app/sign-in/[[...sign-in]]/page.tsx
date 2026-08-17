import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6 py-16">
      <SignIn />
    </main>
  );
}
