import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/auth";
import { addMessage, getMessages, updateMessage } from "@/lib/content-store";
import type { ContactMessage, MessageAction } from "@/lib/types";
export const dynamic = "force-dynamic";

function sessionFrom(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE}=`))
    ?.slice(ADMIN_COOKIE.length + 1);
}

export async function GET(request: Request) {
  if (!verifyAdminSession(sessionFrom(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await getMessages(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load the inbox. Please try refreshing." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  if (!verifyAdminSession(sessionFrom(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string" || !["read", "unread", "archive", "restore"].includes(body.action)) return NextResponse.json({ error: "Choose a message and a valid action." }, { status: 400 });
  try {
    const message = await updateMessage(body.id, body.action as MessageAction);
    return message ? NextResponse.json(message) : NextResponse.json({ error: "Message not found. Refresh the inbox." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Could not update this message. Please try again." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const body = (await request
    .json()
    .catch(() => ({}))) as Partial<ContactMessage> & {
    website?: string;
  };
  if (!body || typeof body !== "object" || Array.isArray(body))
    return NextResponse.json(
      { error: "Please complete the required fields." },
      { status: 400 },
    );
  if (body.website) return NextResponse.json({ ok: true });
  if (
    typeof body.name !== "string" ||
    !body.name.trim() ||
    typeof body.email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) ||
    typeof body.message !== "string" ||
    !body.message.trim()
  ) {
    return NextResponse.json(
      { error: "Please complete the required fields." },
      { status: 400 },
    );
  }
  const message: ContactMessage = {
    id: randomUUID(),
    name: String(body.name).slice(0, 100),
    email: String(body.email).slice(0, 180),
    subject: String(body.subject || "Portfolio enquiry").slice(0, 160),
    message: String(body.message).slice(0, 5000),
    createdAt: new Date().toISOString(),
  };
  try {
    await addMessage(message);
  } catch {
    return NextResponse.json(
      {
        error:
          "The inbox is temporarily unavailable. Please email Muaz directly.",
      },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
