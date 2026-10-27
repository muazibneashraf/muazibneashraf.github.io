import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");

test("the starter preview is fully replaced", () => {
  assert.equal(existsSync(resolve(root, "app/_sites-preview/SkeletonPreview.tsx")), false);
  const packageJson = readFileSync(resolve(root, "package.json"), "utf8");
  const layout = readFileSync(resolve(root, "app/layout.tsx"), "utf8");
  assert.doesNotMatch(packageJson, /react-loading-skeleton|site-creator-vinext-starter/);
  assert.doesNotMatch(layout, /codex-preview|Starter Project/);
});

test("all public portfolio sections and the admin studio exist", () => {
  const routes = [
    "app/page.tsx",
    "app/projects/page.tsx",
    "app/projects/[slug]/page.tsx",
    "app/about/page.tsx",
    "app/extracurricular/page.tsx",
    "app/internship/page.tsx",
    "app/contact/page.tsx",
    "app/admin/page.tsx",
  ];
  for (const route of routes) assert.equal(existsSync(resolve(root, route)), true, route);
});

test("Vercel and protected content APIs are configured", () => {
  const vercel = JSON.parse(readFileSync(resolve(root, "vercel.json"), "utf8"));
  const login = readFileSync(resolve(root, "app/api/auth/login/route.ts"), "utf8");
  const content = readFileSync(resolve(root, "app/api/content/route.ts"), "utf8");
  assert.equal(vercel.framework, "nextjs");
  assert.match(login, /passwordMatches/);
  assert.match(content, /verifyAdminSession/);
  assert.equal(existsSync(resolve(root, "public/brand/neuro-wave-pulse.svg")), true);
});

test("the studio exposes collection editors and local image tools", () => {
  const studio = readFileSync(resolve(root, "app/admin/AdminStudio.tsx"), "utf8");
  const imagePicker = readFileSync(resolve(root, "components/admin/ImagePicker.tsx"), "utf8");
  const projectsArchive = readFileSync(resolve(root, "components/ProjectsArchive.tsx"), "utf8");

  assert.match(studio, /Add activity/);
  assert.match(studio, /Add job/);
  assert.match(studio, /movePractice/);
  assert.match(studio, /moveJob/);
  assert.match(studio, /GalleryPicker/);
  assert.match(imagePicker, /createImageBitmap/);
  assert.match(imagePicker, /type="file"/);
  assert.match(imagePicker, /Drag image to reposition/);
  assert.match(imagePicker, /Show full image/);
  assert.match(imagePicker, /Move gallery image/);
  assert.match(projectsArchive, /aria-pressed/);
});
