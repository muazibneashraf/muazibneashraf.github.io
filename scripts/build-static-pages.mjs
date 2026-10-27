import { cp, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

async function prepareStaticRoutes(directory, originals) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) await prepareStaticRoutes(file, originals);
    else if (entry.name === "page.tsx") {
      const source = await readFile(file, "utf8");
      const rendered = source.replace(/export const revalidate\s*=\s*0\s*;/g,
        'export const dynamic = "force-static";\nexport const revalidate = false;');
      if (rendered !== source) {
        originals.set(file, source);
        await writeFile(file, rendered, "utf8");
      }
    }
  }
}

async function buildStatic() {
  console.log("Preparing static site export for GitHub Pages...");

  // Run PDF preparation
  execSync("node scripts/prepare-pdf-assets.mjs", { stdio: "inherit" });

  // Clean .next to avoid stale dev validation types
  await rm(".next", { recursive: true, force: true });

  const hasApi = existsSync("app/api");
  const hasAdmin = existsSync("app/admin");

  const originals = new Map();
  try {
    // Keep Vercel's request-time content behavior in source. Only this export
    // snapshots public routes: revalidate=0 otherwise silently omits their HTML.
    if (hasApi) await rename("app/api", ".server_api");
    if (hasAdmin) await rename("app/admin", ".server_admin");
    await prepareStaticRoutes("app", originals);
    console.log("Building static pages into out/ ...");
    execSync("npx next build", {
      stdio: "inherit",
      env: { ...process.env, GITHUB_PAGES: "true" }
    });

    const content = JSON.parse(await readFile("data/portfolio-content.json", "utf8"));
    const requiredPages = ["index", "about", "projects", "contact", "experience", "extracurricular", "resume",
      ...content.projects.map(project => `projects/${project.slug}`)];
    for (const page of requiredPages) {
      if (!existsSync(`out/${page}.html`)) throw new Error(`Static export is missing out/${page}.html`);
    }

    // Create .nojekyll in out/ to prevent GitHub Pages from ignoring _next directory
    await writeFile("out/.nojekyll", "", "utf-8");
    console.log("Created out/.nojekyll");

    // Also provide fallback for /api/resume in out/
    if (existsSync("public/Muaz_Ibne_Ashraf_CV.pdf")) {
      const { mkdir } = await import("node:fs/promises");
      await mkdir("out/api", { recursive: true });
      await cp("public/Muaz_Ibne_Ashraf_CV.pdf", "out/api/resume");
    }

    // Provide friendly static admin notice page
    const { mkdir: makeDir } = await import("node:fs/promises");
    await makeDir("out/admin", { recursive: true });
    const adminHtml = `<!DOCTYPE html>
<html lang="en" style="background-color: #060913; color-scheme: dark;">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Admin - Muaz.tech Notice</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #060913;
      color: #f6f7fb;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 24px;
      box-sizing: border-box;
    }
    .card {
      background: #0d1222;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 36px;
      max-width: 580px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: rgba(79, 143, 255, 0.15);
      color: #79aeff;
      border: 1px solid rgba(79, 143, 255, 0.3);
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 20px;
    }
    h1 {
      margin: 0 0 16px;
      font-size: 24px;
      font-weight: 600;
    }
    p {
      color: #9aa2ba;
      line-height: 1.6;
      margin: 0 0 20px;
      font-size: 15px;
    }
    .step {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 12px;
    }
    .step-title {
      color: #f6f7fb;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 4px;
    }
    .step-desc {
      color: #8c95ae;
      font-size: 13px;
      line-height: 1.5;
    }
    code {
      background: rgba(255,255,255,0.08);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      color: #79aeff;
    }
    .actions {
      margin-top: 24px;
      display: flex;
      gap: 12px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .btn-primary {
      background: #4f8fff;
      color: #fff;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Portfolio Studio Notice</div>
    <h1>Admin Studio on GitHub Pages</h1>
    <p>This live deployment at <strong>muazibneashraf.github.io</strong> is hosted on GitHub Pages as a static site. GitHub Pages does not run a server backend (Node.js APIs, file persistence, and authentication sessions cannot run on a static host).</p>
    
    <div class="step">
      <div class="step-title">Option 1: Edit Content Locally (Recommended)</div>
      <div class="step-desc">Run <code>npm run dev</code> on your machine and open <code>http://localhost:3001/admin</code>. All changes are saved to your repository and automatically re-deploy when you push to GitHub.</div>
    </div>

    <div class="step">
      <div class="step-title">Option 2: Live Cloud Admin via Vercel (Free)</div>
      <div class="step-desc">Connect this repository to Vercel. Vercel executes Next.js server functions, enabling the full online <code>/admin</code> dashboard, session login, and message inbox in the cloud.</div>
    </div>

    <div class="actions">
      <a href="/" class="btn btn-primary">Return to Portfolio</a>
    </div>
  </div>
</body>
</html>`;
    await writeFile("out/admin/index.html", adminHtml, "utf-8");

    console.log("Static export completed successfully in ./out");
  } finally {
    for (const [file, source] of originals) await writeFile(file, source, "utf8");
    if (hasApi && existsSync(".server_api")) await rename(".server_api", "app/api");
    if (hasAdmin && existsSync(".server_admin")) await rename(".server_admin", "app/admin");
  }
}

buildStatic().catch((err) => {
  console.error("Static build failed:", err);
  process.exit(1);
});
