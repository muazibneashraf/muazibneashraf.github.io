import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  configuredAdminPassword,
  createAdminSession,
  passwordMatches,
} from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    password?: string;
  };
  if (!configuredAdminPassword()) {
    return NextResponse.json(
      { error: "Set ADMIN_PASSWORD before using the production admin." },
      { status: 503 },
    );
  }
  if (
    !body ||
    typeof body.password !== "string" ||
    !passwordMatches(body.password)
  ) {
    return NextResponse.json(
      { error: "That password is not correct." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, createAdminSession(), adminCookieOptions);
  return response;
}
