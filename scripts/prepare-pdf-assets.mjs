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
  if (jsonFiles.length > 0) {
    const latest = jsonFiles[jsonFiles.length - 1];
    const raw = JSON.parse(await readFile(join(resumesDir, latest), "utf-8"));
    if (raw.base64) {
      const buf = Buffer.from(raw.base64, "base64");
      await writeFile(join(process.cwd(), "public", "Muaz_Ibne_Ashraf_CV.pdf"), buf);
      await writeFile(join(process.cwd(), "public", "resume.pdf"), buf);
    }
  }
}

