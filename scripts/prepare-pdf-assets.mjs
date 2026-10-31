import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";

const require = createRequire(import.meta.url);
const source = dirname(require.resolve("pdfjs-dist/package.json"));
const target = join(process.cwd(), "public", "pdfjs");
await mkdir(target, { recursive: true });
await cp(join(source, "build", "pdf.worker.min.mjs"), join(target, "pdf.worker.min.mjs"));
for (const folder of ["cmaps", "standard_fonts", "wasm"])
  await cp(join(source, folder), join(target, folder), { recursive: true });

// Ensure static resume PDF is always present in public/
const resumesDir = join(process.cwd(), "data", "resumes");
if (existsSync(resumesDir)) {
  const files = await readdir(resumesDir);
  const jsonFiles = files.filter(f => f.endsWith(".json"));
    const content = JSON.parse(await readFile(join(process.cwd(), "data", "portfolio-content.json"), "utf8"));
    const hash = new URL(content.identity.resumeUrl, "http://localhost").searchParams.get("v");
    // Restore the published selection, never an unrelated older draft by mtime.
    const selected = hash && /^[a-f0-9]{8,64}$/.test(hash)
      ? jsonFiles.find(file => file.slice(0, -5).startsWith(hash)) : undefined;
    if (selected) {
      const raw = JSON.parse(await readFile(join(resumesDir, selected), "utf-8"));
    if (raw.base64) {
      const buf = Buffer.from(raw.base64, "base64");
      await writeFile(join(process.cwd(), "public", "Muaz_Ibne_Ashraf_CV.pdf"), buf);
      await writeFile(join(process.cwd(), "public", "resume.pdf"), buf);
      await writeFile(join(process.cwd(), "public", "Muaz_Ibne_Ashraf_CV_Finalized.pdf"), buf);
    }
  }
}

