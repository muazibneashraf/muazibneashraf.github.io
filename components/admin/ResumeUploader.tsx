"use client";
import { useState } from "react";

export function ResumeUploader({ value, onChange, onBusy }: { value: string; onChange: (url: string) => void; onBusy: (busy: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return <div className="resume-upload">
    <label htmlFor="resume-upload">Upload résumé PDF</label>
    <p>Choose a PDF up to 4 MB, then save your changes to publish it across the website.</p>
    <input id="resume-upload" type="file" accept="application/pdf,.pdf" disabled={busy} onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = "";
      if (!file) return;
      if (file.size > 4 * 1024 * 1024) { setMessage("Choose a PDF no larger than 4 MB."); return; }
      setBusy(true); onBusy(true); setMessage("Uploading résumé…");
      try {
        const form = new FormData(); form.set("file", file);
        const response = await fetch("/api/resume", { method: "POST", body: form });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not upload the résumé.");
        onChange(result.url); setMessage(`${result.filename} is ready. Save changes to publish your new résumé.`);
      } catch (error) { setMessage(error instanceof Error ? error.message : "Could not upload the résumé."); }
      finally { setBusy(false); onBusy(false); }
    }} />
    {message && <p role="status">{message}</p>}
    {value && <a href={value} target="_blank" rel="noreferrer">Preview selected résumé</a>}
  </div>;
}
