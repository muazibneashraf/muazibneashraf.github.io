import { cp, rename, rm, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

async function buildStatic() {
  console.log("Preparing static site export for GitHub Pages...");

  // Run PDF preparation
  execSync("node scripts/prepare-pdf-assets.mjs", { stdio: "inherit" });

  // Clean .next to avoid stale dev validation types
  await rm(".next", { recursive: true, force: true });

  const hasApi = existsSync("app/api");
  const hasAdmin = existsSync("app/admin");

  // Temporarily move server-only routes so next export generates pure static HTML
  if (hasApi) await rename("app/api", ".server_api");
  if (hasAdmin) await rename("app/admin", ".server_admin");

  try {
    console.log("Building static pages into out/ ...");
    execSync("npx next build", {
      stdio: "inherit",
      env: { ...process.env, GITHUB_PAGES: "true" }
    });

    // Create .nojekyll in out/ to prevent GitHub Pages from ignoring _next directory
    await writeFile("out/.nojekyll", "", "utf-8");
    console.log("Created out/.nojekyll");

    console.log("Static export completed successfully in ./out");
  } finally {
    if (hasApi && existsSync(".server_api")) await rename(".server_api", "app/api");
    if (hasAdmin && existsSync(".server_admin")) await rename(".server_admin", "app/admin");
  }
}

buildStatic().catch((err) => {
  console.error("Static build failed:", err);
  process.exit(1);
});
