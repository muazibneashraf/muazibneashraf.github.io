import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/auth";
import { getContent, saveContent } from "@/lib/content-store";
import { isValidContent } from "@/lib/content-validation";

export const dynamic = "force-dynamic";

function sessionFrom(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE}=`))
    ?.slice(ADMIN_COOKIE.length + 1);
}

export async function GET() {
  return NextResponse.json(await getContent(), {
    headers: {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    },
  });
}

export async function PUT(request: Request) {
  if (!verifyAdminSession(sessionFrom(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.text();
  if (raw.length > 12_000_000) {
    return NextResponse.json(
      { error: "Portfolio data is too large." },
      { status: 413 },
    );
  }
  let content: unknown;
  try {
    content = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "The content must be valid JSON." },
      { status: 400 },
    );
  }
  if (!isValidContent(content)) {
    return NextResponse.json(
      { error: "Portfolio data is incomplete." },
      { status: 400 },
    );
  }

  try {
    await saveContent(content);
    revalidatePath("/", "layout");
    revalidatePath("/");
    revalidatePath("/about");
    revalidatePath("/projects");
    revalidatePath("/experience");
    revalidatePath("/extracurricular");
    revalidatePath("/contact");
    revalidatePath("/resume");
    revalidatePath("/admin");
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not save the content. Check the storage configuration and try again.",
      },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
}
