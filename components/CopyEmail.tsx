"use client";
import { useState } from "react";
import "./page-motion.css";
export function CopyEmail({ email }: { email: string }) {
  const [message, setMessage] = useState("Copy email address");
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setMessage("Email copied");
      setCopied(true);
    } catch {
      setMessage("Select the email above to copy");
      setCopied(false);
    }
  }
  return (
    <button className="copy-email" data-copied={copied} onClick={copy} aria-live="polite">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        {copied ? <path key="copied" pathLength="1" d="m3 8 3 3 7-7" /> : <g><rect x="5" y="5" width="8" height="8" rx="1.5" /><path d="M10 3H4a1 1 0 0 0-1 1v6" /></g>}
      </svg>
      {message}
    </button>
  );
}
