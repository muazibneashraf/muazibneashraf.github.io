export function gmailComposeUrl(email: string, options?: { subject?: string; body?: string }) {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}${options?.subject ? `&su=${encodeURIComponent(options.subject)}` : ""}${options?.body ? `&body=${encodeURIComponent(options.body)}` : ""}`;
}
