"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { ContactMessage, MessageAction } from "@/lib/types";
import { gmailComposeUrl } from "@/lib/gmail";
import { CopyEmail } from "@/components/CopyEmail";

function date(value: string) {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? "" : timestamp.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" });
}

export function AdminInbox({ messages, onChange }: { messages: ContactMessage[]; onChange: Dispatch<SetStateAction<ContactMessage[]>> }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"active" | "unread" | "archived">("active");
  const [selectedId, setSelectedId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const mutating = useRef(false);
  const refresh = useCallback(async () => {
    if (mutating.current) return;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true);
    try {
      const response = await fetch("/api/messages", { cache: "no-store", signal: controller.signal });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result)) throw new Error(result.error || "Could not load the inbox.");
      if (controller.signal.aborted) return;
      onChange(result.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setError("");
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not load the inbox.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [onChange]);
  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const onFocus = () => { if (!document.hidden) void refresh(); };
    const interval = window.setInterval(onFocus, 30000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { request.current?.abort(); clearTimeout(initial); clearInterval(interval); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [refresh]);

  async function act(message: ContactMessage, action: MessageAction) {
    if (mutating.current) return;
    setSelectedId(message.id);
    mutating.current = true; request.current?.abort(); setLoading(false); setPending(true);
    try {
      const response = await fetch("/api/messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: message.id, action }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update this message.");
      onChange(current => current.map(item => item.id === result.id ? result : item)); setError("");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not update this message."); }
    finally { mutating.current = false; setPending(false); }
  }

  async function remove(message: ContactMessage) {
    if (mutating.current) return;
    if (!window.confirm(`Delete message from "${message.name}"? This cannot be undone.`)) return;
    mutating.current = true; request.current?.abort(); setLoading(false); setPending(true);
    try {
      const response = await fetch(`/api/messages?id=${encodeURIComponent(message.id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not delete this message.");
      onChange(current => current.filter(item => item.id !== message.id));
      setSelectedId(""); setError("");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not delete this message."); }
    finally { mutating.current = false; setPending(false); }
  }

  const filtered = messages.filter(message => filter === "archived" ? !!message.archivedAt : !message.archivedAt && (filter !== "unread" || !message.readAt))
    .filter(message => `${message.name} ${message.email} ${message.subject} ${message.message}`.toLowerCase().includes(query.toLowerCase()));
  const selected = messages.find(message => message.id === selectedId) ?? filtered[0];
  const unread = messages.filter(message => !message.archivedAt && !message.readAt).length;
  const subject = selected ? (/^re:/i.test(selected.subject) ? selected.subject : `Re: ${selected.subject}`) : "";
  const body = selected ? `${drafts[selected.id] ?? ""}\n\n--- Original message ---\nFrom: ${selected.name} <${selected.email}>\nDate: ${date(selected.createdAt)}\nSubject: ${selected.subject}\n\n${selected.message}` : "";
  return <div className="admin-inbox">
    <div className="inbox-tools"><label className="admin-field"><span className="sr-only">Search messages</span><input type="search" aria-label="Search messages" placeholder="Search sender, subject or message…" value={query} onChange={event => { setQuery(event.target.value); setSelectedId(""); }} /></label><button type="button" disabled={loading || pending} onClick={() => void refresh()}>{loading ? "Refreshing…" : "Refresh inbox"}</button></div>
    <div className="inbox-filters" aria-label="Message filters">{([['active', 'Inbox'], ['unread', `Unread (${unread})`], ['archived', 'Archived']] as const).map(([key, name]) => <button type="button" key={key} aria-pressed={filter === key} onClick={() => { setFilter(key); setSelectedId(""); }}>{name}</button>)}<span>{filtered.length} {filtered.length === 1 ? "message" : "messages"}</span></div>
    {error && <div className="inbox-error" role="alert"><p>{error}</p><button type="button" onClick={() => void refresh()}>Try again</button></div>}
    <div className="inbox-layout">
      <div className="inbox-threads" aria-label="Messages">{filtered.map(message => <button type="button" key={message.id} className={`inbox-thread${selected?.id === message.id ? " is-selected" : ""}${!message.readAt ? " is-unread" : ""}`} aria-pressed={selected?.id === message.id} onClick={() => { setSelectedId(message.id); if (!message.readAt) void act(message, "read"); }}><span><strong>{message.name}</strong><time dateTime={message.createdAt}>{date(message.createdAt)}</time></span><b>{message.subject}</b><p>{message.message}</p><small>{message.email}</small></button>)}{!filtered.length && <p className="empty-state">{loading ? "Loading messages…" : query ? "No messages match your search." : "No messages in this view."}</p>}</div>
      <article className="inbox-detail" aria-label="Message details">{selected ? <>
        <header><p className="eyebrow">{selected.archivedAt ? "Archived message" : selected.readAt ? "Read message" : "New message"}</p><h2>{selected.subject}</h2><p><strong>{selected.name}</strong> <span>{selected.email}</span></p><time dateTime={selected.createdAt}>{date(selected.createdAt)} · Dhaka time</time></header>
        <div className="inbox-message-body">{selected.message}</div>
        <div className="inbox-message-actions"><button type="button" disabled={pending} onClick={() => void act(selected, selected.readAt ? "unread" : "read")}>{selected.readAt ? "Mark unread" : "Mark read"}</button><button type="button" disabled={pending} onClick={() => void act(selected, selected.archivedAt ? "restore" : "archive")}>{selected.archivedAt ? "Move to inbox" : "Archive message"}</button><button type="button" className="inbox-delete-action" disabled={pending} onClick={() => void remove(selected)}>Delete message</button><CopyEmail key={selected.id} email={selected.email} /></div>
        <div className="inbox-reply"><label className="admin-field"><span>Your reply</span><textarea aria-label="Your reply" rows={5} placeholder="Write your reply…" value={drafts[selected.id] ?? ""} onChange={event => setDrafts(current => ({ ...current, [selected.id]: event.target.value }))} /></label><a className="inbox-reply-link" href={gmailComposeUrl(selected.email, { subject, body })} target="_blank" rel="noreferrer">Reply in Gmail</a><p>Opens a Gmail draft with the recipient, subject and your reply filled in.</p></div>
      </> : <div className="inbox-no-selection"><h2>Your inbox is clear</h2><p>Contact form enquiries will appear here. Refresh to check for new messages.</p></div>}</article>
    </div>
  </div>;
}
