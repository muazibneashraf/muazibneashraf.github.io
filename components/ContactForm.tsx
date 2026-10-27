"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { gmailComposeUrl } from "@/lib/gmail";
import type { ContentSections } from "@/lib/types";
import "./page-motion.css";

function ContactField({ children }: { children: ReactNode }) {
  return <span className="contact-field">
    {children}
    <svg className="contact-field-border" viewBox="0 0 100 48" preserveAspectRatio="none" aria-hidden="true">
      <rect x=".3" y=".3" width="99.4" height="47.4" rx="3" pathLength="1" />
    </svg>
  </span>;
}

function SendIndicator({ status }: { status: "idle" | "sending" | "sent" | "error" }) {
  return <span className="contact-submit-art" aria-hidden="true">
    <svg viewBox="0 0 24 22">
      {status === "sending" ? <>{[5, 12, 19].map(x => <circle key={x} className="contact-send-dot" cx={x} cy="11" r="2" />)}</>
        : status === "sent" ? <path className="contact-confirmation" pathLength="1" d="m5 11 5 5L20 6" />
          : <path className="contact-send-icon" d="m3 10 18-7-6 17-4-7-8-3Zm8 3 10-10" />}
    </svg>
  </span>;
}

export function ContactForm({ email, copy }: { email: string; copy: ContentSections["contactForm"] }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [draft, setDraft] = useState<{ subject: string; message: string }>({
    subject: "",
    message: "",
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    const form = event.currentTarget;
    const data = new FormData(form);

    const name = String(data.get("name") || "").trim();
    const senderEmail = String(data.get("email") || "").trim();
    const subject = String(data.get("subject") || "").trim() || "Portfolio Inquiry";
    const message = String(data.get("message") || "").trim();
    const honeypot = String(data.get("website") || data.get("_honey") || "").trim();

    setDraft({ subject, message });

    // Spam honeypot
    if (honeypot) {
      form.reset();
      setStatus("sent");
      return;
    }

    try {
      // 1. Submit directly to our internal messages API
      const apiPromise = fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: senderEmail, subject, message }),
      });

      // 2. Also forward to FormSubmit with a fast 4s timeout (never hangs the UI)
      const formSubmitPromise = fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          name,
          email: senderEmail,
          _replyto: senderEmail,
          _subject: `[Portfolio] ${subject} - from ${name}`,
          message,
          _template: "table",
          _captcha: "false",
        }),
        signal: AbortSignal.timeout(4000),
      }).catch(() => null);

      const response = await apiPromise;
      const result = await response.json().catch(() => null);

      if (response.ok && (result?.ok || result?.success)) {
        form.reset();
        setStatus("sent");
      } else {
        const fallbackRes = await formSubmitPromise;
        if (fallbackRes && fallbackRes.ok) {
          form.reset();
          setStatus("sent");
        } else {
          setStatus("error");
        }
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="contact-form" data-status={status} aria-busy={status === "sending"} onSubmit={submit}>
      <div className="form-row">
        <label>
          {copy.nameLabel}
          <ContactField><input
            required
            name="name"
            type="text"
            maxLength={100}
            placeholder={copy.namePlaceholder}
          /></ContactField>
        </label>
        <label>
          {copy.emailLabel}
          <ContactField><input
            required
            name="email"
            type="email"
            maxLength={180}
            placeholder={copy.emailPlaceholder}
          /></ContactField>
        </label>
      </div>
      <label>
        {copy.subjectLabel}
        <ContactField><input
          name="subject"
          type="text"
          maxLength={160}
          placeholder={copy.subjectPlaceholder}
        /></ContactField>
      </label>
      <label>
        {copy.messageLabel}
        <ContactField><textarea
          required
          name="message"
          rows={6}
          maxLength={5000}
          placeholder={copy.messagePlaceholder}
        /></ContactField>
      </label>
      <label className="honeypot" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
        <input name="_honey" tabIndex={-1} autoComplete="off" style={{ display: "none" }} />
      </label>
      <button
        type="submit"
        className="submit-button"
        disabled={status === "sending"}
      >
        <span key={status} className="contact-submit-label">{status === "sending" ? copy.sendingLabel : copy.submitLabel}</span>
        <SendIndicator status={status} />
      </button>
      <p className="form-status" aria-live="polite">
        {status === "sent" && <>
          <svg className="contact-status-icon" viewBox="0 0 20 20" aria-hidden="true"><path className="contact-confirmation" pathLength="1" d="m4 10 4 4L16 6" /></svg>
          {copy.successText}
        </>}
        {status === "error" && (
          <>
            {copy.errorText}{" "}
            <a
              href={gmailComposeUrl(email, {
                subject: draft.subject,
                body: draft.message,
              })}
              target="_blank"
              rel="noreferrer"
            >
              {copy.directEmailLabel}
            </a>
          </>
        )}
      </p>
    </form>
  );
}
