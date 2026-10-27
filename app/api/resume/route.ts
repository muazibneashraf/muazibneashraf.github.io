import { createHash } from "node:crypto";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/auth";
import { getUploadedResume, saveUploadedResume } from "@/lib/content-store";

export const runtime = "nodejs";
const MAX_RESUME_BYTES = 4 * 1024 * 1024;

export async function GET(request: Request) {
  const hash = new URL(request.url).searchParams.get("v") || "";
  const resume = await getUploadedResume(hash);
  if (!resume) return Response.json({ error: "Résumé not found." }, { status: 404 });
  const filename = encodeURIComponent(resume.filename).replace(/'/g, "%27");
  return new Response(Buffer.from(resume.base64, "base64"), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${filename}`,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const token = (request.headers.get("cookie") || "").split(";").map(v => v.trim()).find(v => v.startsWith(`${ADMIN_COOKIE}=`))?.slice(ADMIN_COOKIE.length + 1);
  if (!verifyAdminSession(token)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (Number(request.headers.get("content-length") || 0) > MAX_RESUME_BYTES + 16384) {
    return Response.json({ error: "Choose a PDF no larger than 4 MB." }, { status: 413 });
  }
  let form: FormData;
  try { form = await request.formData(); }
  catch { return Response.json({ error: "Choose a PDF file to upload." }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return Response.json({ error: "Choose a PDF file to upload." }, { status: 400 });
  if (file.size > MAX_RESUME_BYTES) return Response.json({ error: "Choose a PDF no larger than 4 MB." }, { status: 413 });
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!/^%PDF-\d\.\d/.test(bytes.subarray(0, 8).toString("ascii"))) {
    return Response.json({ error: "That file is not a valid PDF." }, { status: 400 });
  }
  const hash = createHash("sha256").update(bytes).digest("hex");
  const filename = file.name.replace(/[^\p{L}\p{N} ._-]/gu, "_").slice(0, 120) || "resume.pdf";
  try { await saveUploadedResume({ hash, filename, base64: bytes.toString("base64") }); }
  catch { return Response.json({ error: "Could not store the PDF. Check persistent storage and try again." }, { status: 503 }); }
  return Response.json({ url: `/api/resume?v=${hash}`, filename });
}
