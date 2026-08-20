import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import SiteHeader from "@/components/SiteHeader";
import { clerkAppearance } from "@/lib/clerkAppearance";
import { isClerkConfigured } from "@/lib/clerkConfigured";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vend",
  description: "Dispense credit codes to event attendees.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const app = (
    <ConvexClientProvider>
      <SiteHeader />
      {children}
    </ConvexClientProvider>
  );

  return (
    <html lang="en-GB" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background antialiased`}
        suppressHydrationWarning
      >
        {isClerkConfigured() ? (
          <ClerkProvider
            dynamic
            appearance={{
              baseTheme: dark,
              ...clerkAppearance,
            }}
          >
            {app}
          </ClerkProvider>
        ) : (
          app
        )}
      </body>
    </html>
  );
}
