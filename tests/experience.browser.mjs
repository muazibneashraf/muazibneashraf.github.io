// Run after npm run build. Set PLAYWRIGHT_MODULE to an installed Playwright module.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, copyFile, symlink, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { once } from "node:events";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const root = process.cwd(),
  fixture = await mkdtemp(join(tmpdir(), "muaz-experience-"));
let browser, server;
try {
  for (const name of [".next", "node_modules", "public"])
    await symlink(
      join(root, name),
      join(fixture, name),
      process.platform === "win32" ? "junction" : "dir",
    );
  await copyFile(join(root, "package.json"), join(fixture, "package.json"));
  await mkdir(join(fixture, "data"));
  await copyFile(
    join(root, "data/portfolio-content.json"),
    join(fixture, "data/portfolio-content.json"),
  );
  const base = "http://localhost:3220";
  server = spawn(
    process.execPath,
    [join(root, "node_modules/next/dist/bin/next"), "start", "-p", "3220"],
    {
      cwd: fixture,
      windowsHide: true,
      stdio: "ignore",
      env: {
        ...process.env,
        NODE_ENV: "production",
        ADMIN_PASSWORD: "experience-test",
        AUTH_SECRET: "isolated-experience-test-secret",
        UPSTASH_REDIS_REST_URL: "",
        UPSTASH_REDIS_REST_TOKEN: "",
        VERCEL: "",
      },
    },
  );
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + "/api/content")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({
    headless: true,
    channel: process.env.BROWSER_CHANNEL || "msedge",
  });
  const page = await browser.newPage({
      reducedMotion: "reduce",
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  const work = page.locator("#work");
  assert.equal(await work.locator(".project-card").count(), 4);
  assert.ok(
    (await work.locator(".project-card").first().innerText()).includes(
      "ICU Analyzer",
    ),
  );
  assert.equal(await page.getByText("EXPLORE BY FOCUS").count(), 0);
  assert.equal(await page.getByText("Muaz in 60 seconds").count(), 0);
  assert.ok(
    await page
      .locator("#skills")
      .getByText("Next.js", { exact: true })
      .isVisible(),
  );
  const trace = page.locator("#trace");
  await trace
    .getByRole("button", { name: "Portfolio & Content Studio", exact: true })
    .click();
  await trace.locator(".trace-node").nth(1).click();
  assert.ok(
    (await trace.locator(".trace-inspector").innerText()).includes(
      "Authenticated API",
    ),
  );
  await trace.getByRole("button", { name: "Next step", exact: true }).click();
  assert.ok(
    (await trace.locator(".trace-inspector").innerText()).includes(
      "Portfolio data",
    ),
  );
  const backendNode = page
    .locator(".interactive-network")
    .getByRole("button", { name: "Backend", exact: true });
  await backendNode.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  const backendBounds = await backendNode.boundingBox();
  await page.mouse.move(backendBounds.x + backendBounds.width / 2, backendBounds.y + backendBounds.height / 2);
  await backendNode.click();
  assert.ok(
    (await page.locator("#network-project-preview").innerText()).includes(
      "Admission Lottery",
    ),
  );
  await page
    .getByRole("button", { name: "Close project preview", exact: true })
    .click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base);
  await page.screenshot({ path: join(fixture, "homepage.png") });
  console.log(
    "Projects, skills, workflow trace, and interactive hero nodes: PASS",
  );
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(base);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `home overflow ${width}`,
    );
    await trace.scrollIntoViewIfNeeded();
    assert.ok(await trace.locator(".trace-node").first().isVisible());
    await page.goto(base + "/projects/portfolio-platform");
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `project overflow ${width}`,
    );
    assert.equal(await page.locator("#technical-tour").count(), 0);
    assert.equal(await page.locator("#architecture").count(), 0);
  }
  console.log(
    "Responsive homepage and project layouts 320–1920px: PASS",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "/admin");
  await page.getByLabel("Portfolio password").fill("experience-test");
  await page.getByRole("button", { name: "Enter studio" }).click();
  await page.getByRole("heading", { name: "Your details" }).waitFor();
  await page
    .locator(".admin-sidebar nav button")
    .filter({ hasText: "Projects" })
    .click();
  await page
    .getByLabel("Card summary", { exact: true })
    .fill("Verified editable project summary.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByText(/Saved at/).waitFor();
  const saved = await (await fetch(base + "/api/content")).json();
  assert.equal(saved.projects[0].summary, "Verified editable project summary.");
  await page.goto(base + "/projects/" + saved.projects[0].slug);
  assert.ok(
    (await page.locator("main").innerText()).includes(
      "Verified editable project summary.",
    ),
  );
  const login = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "experience-test" }),
  });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const bad = structuredClone(saved);
  bad.projects[0].repository = "javascript:alert(1)";
  assert.equal(
    (
      await fetch(base + "/api/content", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(bad),
      })
    ).status,
    400,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Admin project save reflected publicly; unsafe URL rejected; no browser errors: PASS",
  );
} finally {
  await browser?.close();
  if (server && server.exitCode === null) {
    const stopped = once(server, "exit");
    server.kill();
    await stopped;
  }
  for (const name of [".next", "node_modules", "public"])
    await rm(join(fixture, name), { force: true });
  assert.ok(
    resolve(fixture).startsWith(
      resolve(tmpdir()) + (process.platform === "win32" ? "\\" : "/"),
    ),
  );
  await rm(fixture, { recursive: true, force: true });
}
