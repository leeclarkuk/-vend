"use client";

import { useState } from "react";

export default function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
