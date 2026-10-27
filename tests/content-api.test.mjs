import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, copyFile, cp, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { once } from "node:events";
import test from "node:test";

// Run the real production app against isolated data, never the owner's content.
test(
  "admin saves are reflected in public hero HTML and content API",
  { timeout: 60000 },
  async () => {
    const root = resolve(import.meta.dirname, "..");
    const fixture = await mkdtemp(join(tmpdir(), "muaz-content-test-"));
    let server;
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
      await cp(join(root, "data/resumes"), join(fixture, "data/resumes"), { recursive: true }).catch(error => {
        if (error.code !== "ENOENT") throw error;
      });
      const port = 3219;
      const base = `http://127.0.0.1:${port}`;
      server = spawn(
        process.execPath,
        [
          join(root, "node_modules/next/dist/bin/next"),
          "start",
          "-p",
          String(port),
        ],
        {
          cwd: fixture,
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
          env: {
            ...process.env,
            NODE_ENV: "production",
            ADMIN_PASSWORD: "isolated-test-password",
            AUTH_SECRET: "isolated-test-secret",
            UPSTASH_REDIS_REST_URL: "",
            UPSTASH_REDIS_REST_TOKEN: "",
            VERCEL: "",
          },
        },
      );
      let log = "";
      server.stdout.on("data", (d) => (log += d));
      server.stderr.on("data", (d) => (log += d));
      for (let i = 0; i < 100; i++) {
        if (server.exitCode !== null) throw new Error(log);
        try {
          if ((await fetch(base + "/api/content")).ok) break;
        } catch {}
        await new Promise((r) => setTimeout(r, 200));
      }
      const original = await (await fetch(base + "/api/content")).json();
      for (const route of [
        "/",
        "/projects",
        ...original.projects.map((p) => `/projects/${p.slug}`),
        "/about",
        "/extracurricular",
        "/contact",
        "/resume",
        "/admin",
      ])
        assert.equal((await fetch(base + route)).status, 200, route);
      const pdf = await fetch(base + original.identity.resumeUrl);
      assert.equal(pdf.status, 200);
      const homeHtml = await (await fetch(base)).text();
      assert.match(homeHtml, /SELECT A NODE/);
      assert.doesNotMatch(homeHtml, /Muaz in 60 seconds/);
      assert.doesNotMatch(homeHtml, /EXPLORE BY FOCUS/);
      const initialHero = homeHtml.match(/<section(?: id="top")? class="hero wrap">([\s\S]*?)<\/section>/)?.[1] || "";
      assert.doesNotMatch(initialHero, /class="hero-description"|class="availability/);
      assert.ok(!initialHero.includes(original.home.intro));
      const sections = [
        ...homeHtml.matchAll(
          /<section id="(about|work|skills|research|trace|experience|capabilities|contact)"/g,
        ),
      ].map((match) => match[1]);
      assert.deepEqual(sections, [
        "about",
        "skills",
        "work",
        "trace",
        "research",
        "experience",
        "capabilities",
        "contact",
      ]);
      assert.doesNotMatch(homeHtml.split("<dialog")[0], /download=""/);
      const resumeHtml = await (await fetch(base + "/resume")).text();
      assert.ok(resumeHtml.includes(`href="${original.identity.resumeUrl}"`));
      assert.match(resumeHtml, /Download CV \(PDF\)/);
      assert.doesNotMatch(resumeHtml, /<object|<iframe|resume-preview.webp/);
      for (const old of [
        "/Muaz_Ibne_Ashraf_CV_Portfolio.pdf",
        "/Muaz_Ibne_Ashraf_Final%20CV.pdf",
      ])
        assert.equal((await fetch(base + old)).status, 404);
      assert.equal((await pdf.text()).slice(0, 4), "%PDF");
      assert.equal(
        (
          await fetch(base + "/api/content", {
            method: "PUT",
            body: JSON.stringify(original),
          })
        ).status,
        401,
      );
      const login = await fetch(base + "/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "isolated-test-password" }),
      });
      assert.equal(login.status, 200);
      const cookie = login.headers.get("set-cookie").split(";")[0];
      const headers = { "content-type": "application/json", cookie };
      for (const body of [
        "null",
        "{",
        JSON.stringify({ ...original, projects: [] }),
        JSON.stringify({
          ...original,
          about: { ...original.about, story: "invalid" },
        }),
        JSON.stringify({
          ...original,
          identity: { ...original.identity, resumeUrl: "javascript:alert(1)" },
        }),
      ]) {
        assert.equal(
          (await fetch(base + "/api/content", { method: "PUT", headers, body }))
            .status,
          400,
        );
      }
      assert.deepEqual(
        (await (await fetch(base + "/api/content")).json()).home,
        original.home,
      );
      assert.equal(
        (
          await fetch(base + "/api/auth/login", {
            method: "POST",
            headers,
            body: "null",
          })
        ).status,
        401,
      );
      assert.equal((await fetch(base + "/api/messages")).status, 401);
      assert.equal(
        (
          await fetch(base + "/api/messages", {
            method: "POST",
            headers,
            body: "null",
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await fetch(base + "/api/messages", {
            method: "POST",
            headers,
            body: JSON.stringify({
              name: "Local test",
              email: "test@example.com",
              message: "Isolated inbox verification",
            }),
          })
        ).status,
        201,
      );
      const inbox = await (
        await fetch(base + "/api/messages", { headers })
      ).json();
      assert.equal(inbox[0].message, "Isolated inbox verification");
      const parallelMessages = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          fetch(base + "/api/messages", {
            method: "POST",
            headers,
            body: JSON.stringify({
              name: "Local test",
              email: "test@example.com",
              message: `Concurrent message ${i}`,
            }),
          }),
        ),
      );
      assert.ok(parallelMessages.every((response) => response.status === 201));
      assert.equal(
        (await (await fetch(base + "/api/messages", { headers })).json())
          .length,
        6,
      );
      const changed = structuredClone(original);
      Object.assign(changed.home, {
        eyebrow: "A new chapter",
        title: "Editable <Engineer>",
        accentWord: "Reliable systems. Thoughtful interfaces.",
        intro: "Visible introduction from the authenticated admin API.",
        marquee: ["Rust", "Go", "WebAssembly"],
      });
      Object.assign(changed.identity, {
        email: "test@example.com",
        location: "Remote worldwide",
        availability: "Available for graduate roles",
        resumeUrl: "/test-resume.pdf",
      });
      changed.contact.linkedin = "https://www.linkedin.com/in/test-engineer";
      changed.about.title = "Editable biography";
      changed.about.skills = ["Rust"];
      changed.sections.skills.groups = [{ id: "qa-skills", name: "QA languages", icon: "</>", items: ["Rust"] }];
      changed.about.education = [
        { label: "Degree", value: "Editable degree" },
        { label: "University", value: "Editable university" },
      ];
      changed.theme.accent = "#aabbcc";
      const save = await fetch(base + "/api/content", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(changed),
      });
      assert.equal(save.status, 200);
      assert.deepEqual(
        (await (await fetch(base + "/api/content")).json()).home,
        changed.home,
      );
      const editedResume = await (await fetch(base + "/resume")).text();
      assert.ok(editedResume.includes('href="/test-resume.pdf"'));
      assert.ok(!editedResume.includes('src="/resume-preview.webp"'));
      let html = await (await fetch(base)).text();
      for (const text of [
        "Editable biography",
        "Editable degree",
        "Editable university",
        "--accent:#aabbcc",
      ])
        assert.ok(html.includes(text), text);
      assert.doesNotMatch(
        html.match(/<section id="skills"([\s\S]*?)<\/section>/)?.[0] || "",
        /PyTorch/,
      );
      const hero = html.match(
        /<section(?: id="top")? class="hero wrap">([\s\S]*?)<\/section>/,
      )?.[1];
      assert.ok(hero);
      for (const text of [
        "A new chapter",
        "Editable &lt;Engineer&gt;",
        "Reliable systems",
        "Thoughtful interfaces",
        "Remote worldwide",
        "to=test%40example.com",
        "/resume",
        changed.contact.linkedin,
      ])
        assert.ok(hero.includes(text), text);
      assert.doesNotMatch(hero, /hero-description|class="availability|Visible introduction from the authenticated admin API/);
      assert.doesNotMatch(
        hero,
        /aria-hidden="true"[^>]*>Visible introduction|Building software\./,
      );
      assert.match(html, /WebAssembly/);
      changed.home.accentWord = "One editable tagline";
      changed.home.intro = "";
      changed.home.marquee = [];
      changed.contact.linkedin = "";
      assert.equal(
        (
          await fetch(base + "/api/content", {
            method: "PUT",
            headers: { "content-type": "application/json", cookie },
            body: JSON.stringify(changed),
          })
        ).status,
        200,
      );
      html = await (await fetch(base)).text();
      assert.match(html, /One editable tagline/);
      assert.equal(
        (await (await fetch(base + "/api/content")).json()).home.intro,
        "",
      );
      assert.doesNotMatch(html, /class="hero-description"/);
      assert.doesNotMatch(html, /class="stack-strip"/);
      assert.doesNotMatch(
        html.match(/<section(?: id="top")? class="hero wrap">([\s\S]*?)<\/section>/)[1],
        />LinkedIn</,
      );
      assert.equal(
        (await fetch(base + "/api/auth/logout", { method: "POST", headers }))
          .status,
        200,
      );
      assert.deepEqual(await (await fetch(base + "/api/auth/session")).json(), {
        authenticated: false,
      });
    } finally {
      if (server && server.exitCode === null) {
        const stopped = once(server, "exit");
        server.kill();
        await stopped;
      }
      // Remove only the junctions first; never recursively follow into source files.
      for (const name of [".next", "node_modules", "public"])
        await rm(join(fixture, name), { force: true });
      assert.ok(
        resolve(fixture).startsWith(
          resolve(tmpdir()) + (process.platform === "win32" ? "\\" : "/"),
        ),
      );
      await rm(fixture, { recursive: true, force: true });
    }
  },
);
