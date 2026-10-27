import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, symlink, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';

// All publishing and contact tests use a separate store, never the owner's data.
const root = process.cwd(), fixture = await mkdtemp(join(tmpdir(), 'muaz-editorial-'));
const ownerContent = await readFile(join(root, 'data/portfolio-content.json'), 'utf8');
const output = resolve('tmp/editorial-inbox');
await mkdir(output, { recursive: true });
let server, browser, page;
const base = 'http://localhost:3228', errors = [];
try {
  for (const name of ['.next', 'node_modules', 'public']) await symlink(join(root, name), join(fixture, name), process.platform === 'win32' ? 'junction' : 'dir');
  await copyFile(join(root, 'package.json'), join(fixture, 'package.json'));
  await mkdir(join(fixture, 'data'));
  await copyFile(join(root, 'data/portfolio-content.json'), join(fixture, 'data/portfolio-content.json'));
  server = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'start', '-p', '3228'], { cwd: fixture, windowsHide: true, stdio: 'ignore', env: { ...process.env, NODE_ENV: 'production', ADMIN_PASSWORD: 'editorial-qa-password', AUTH_SECRET: 'editorial-qa-secret', UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '', VERCEL: '' } });
  for (let i = 0; i < 100; i++) { try { if ((await fetch(base + '/api/content')).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  assert.equal((await context.request.post(base + '/api/auth/login', { data: { password: 'editorial-qa-password' } })).status(), 200);
  page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/admin', { waitUntil: 'networkidle' });
  const tab = label => page.getByRole('navigation', { name: 'Studio sections' }).getByRole('button', { name: new RegExp(label) }).click();
  const field = (scope, label) => scope.getByLabel(label, { exact: true });
  const panel = title => page.locator('details.editor-group').filter({ has: page.locator('summary', { hasText: title }) }).last();
  const save = async () => { const response = page.waitForResponse(r => r.url() === base + '/api/content' && r.request().method() === 'PUT'); await page.getByRole('button', { name: 'Save changes', exact: true }).click(); const result = await response; assert.equal(result.status(), 200, await result.text()); await page.getByText(/Saved at/).waitFor(); };
  await page.getByRole('heading', { name: 'Your details' }).waitFor();

  await tab('Technical skills');
  await field(page, 'Title').fill('QA tools in use.');
  const groups = page.locator('.editor-repeat-card');
  await field(groups.first(), 'Name').fill('QA systems'); await field(groups.first(), 'Icon').fill('◇'); await field(groups.first(), 'Skills in this group').fill('Rust\nElixir');
  await page.getByRole('button', { name: 'Add skill group', exact: true }).click();
  await field(groups.last(), 'Name').fill('QA platforms'); await field(groups.last(), 'Skills in this group').fill('Fly.io\nPodman');
  await groups.last().getByRole('button', { name: 'Move up', exact: true }).click();
  await groups.last().getByRole('button', { name: 'Remove', exact: true }).click();

  await tab('About'); await field(panel('University education'), 'Graduation').fill('QA 2030');
  await page.getByRole('button', { name: 'Add education', exact: true }).click();
  const qualification = panel('Earlier education').locator('.editor-repeat-card').last();
  await field(qualification, 'Title').fill('QA diploma'); await field(qualification, 'Institution').fill('QA Institute'); await field(qualification, 'Period').fill('2024');

  await tab('Page text');
  await field(panel('Selected projects section'), 'Title').fill('QA selected work.');
  await field(panel('Projects page'), 'Title').fill('QA project archive.');
  await field(panel('Contact page'), 'Title').fill('QA get in touch.');
  await field(panel('Contact form'), 'Submit label').fill('QA send enquiry');
  await field(panel('Project detail labels'), 'Overview').fill('QA project overview');

  await tab('Site & navigation');
  await field(panel('Brand, links and search listing'), 'Brand').fill('qa');
  await field(panel('Brand, links and search listing'), 'Brand suffix').fill('.dev');
  await field(panel('Brand, links and search listing'), 'Title').fill('QA portfolio SEO');
  await field(panel('Navigation labels'), 'Projects').fill('QA projects');
  await field(panel('Website logos'), 'Browser icon URL').fill('/brand/mark.svg');

  await tab('Homepage'); await page.getByText('Hero buttons, ticker and globe content', { exact: true }).click();
  await field(page, 'Primary button text').fill('QA explore'); await field(page, 'Code card filename').fill('~/qa/profile.py');
  await field(page, 'Marquee trail').fill('QA learning');
  await field(page.locator('.editor-repeat-card').first(), 'Button label').fill('QA backend');

  await tab('Research'); await field(page, 'Title').fill('QA research.'); await field(page, 'Note').fill('QA research limitations');
  await tab('Capabilities'); await field(page, 'Title').first().fill('QA contributions.');
  await field(page.locator('.editor-repeat-card').first(), 'Title').fill('QA service design');
  await field(page.locator('.editor-repeat-card').first(), 'Summary').fill('QA editable contribution text.');
  await page.getByRole('button', { name: 'Add capability', exact: true }).click();
  await field(page.locator('.editor-repeat-card').last(), 'Title').fill('QA new capability');

  await tab('Walkthroughs'); await page.getByText('Section heading and labels', { exact: true }).click();
  await field(panel('Section heading and labels'), 'Title').fill('QA workflow.');
  await field(panel('Section heading and labels'), 'Request badge text').fill('QA DATA');
  const stage = page.locator('.editor-repeat-card').first(); await field(stage, 'Title').fill('QA ingest'); await field(stage, 'Detail').fill('QA editable stage details.');
  await page.getByRole('button', { name: 'Add stage', exact: true }).click();
  await field(page.locator('.editor-repeat-card').last(), 'Title').fill('QA final stage');
  await save();

  const published = await (await context.request.get(base + '/api/content')).json();
  assert.deepEqual(published.sections.skills.groups[0].items, ['Rust', 'Elixir']);
  assert.equal(published.sections.skills.groups.at(-1).name, 'QA platforms');
  assert.equal(published.about.previousEducation.at(-1).title, 'QA diploma');
  assert.equal(published.projects[0].walkthroughSteps.at(-1).title, 'QA final stage');
  const home = await context.newPage(); home.on('pageerror', e => errors.push(e.message));
  await home.goto(base, { waitUntil: 'networkidle' });
  for (const value of ['QA selected work', 'QA tools in use', 'QA systems', 'Rust', 'Elixir', 'QA platforms', 'Fly.io', 'QA diploma', 'QA 2030', 'QA explore', 'QA backend', 'QA research', 'QA research limitations', 'QA contributions', 'QA service design', 'QA new capability', 'QA workflow', 'QA ingest', 'QA DATA']) assert.ok((await home.locator('body').innerText()).includes(value), value);
  assert.equal(await home.title(), 'QA portfolio SEO'); assert.equal(await home.locator('.brand-native-wordmark').textContent(), 'qa.dev');
  assert.equal(await home.locator('#skills h2').textContent(), 'QA tools in use');
  await home.locator('#trace').scrollIntoViewIfNeeded(); assert.equal(await home.locator('.trace-node').count(), published.projects[0].walkthroughSteps.length);
  await home.locator('.trace-node').last().click();
  assert.equal(await home.locator('.trace-explanation h3').textContent(), 'QA final stage');
  const centers = await home.locator('.trace-track').evaluate(el => { const selected = el.querySelector('[aria-current=step]').getBoundingClientRect(), packet = el.querySelector('.trace-packet').getBoundingClientRect(); return [selected.x + selected.width / 2, packet.x + packet.width / 2]; });
  assert.ok(Math.abs(centers[0] - centers[1]) < 1);
  await home.goto(base + '/projects'); await home.getByRole('heading', { name: 'QA project archive', exact: true }).waitFor();
  await home.goto(base + '/contact'); await home.getByRole('heading', { name: 'QA get in touch', exact: true }).waitFor(); await home.getByRole('button', { name: 'QA send enquiry' }).waitFor();
  await home.goto(base + '/projects/' + published.projects[0].slug); await home.getByRole('heading', { name: 'QA project overview', exact: true }).waitFor();

  // Fresh contact submissions appear without signing out, and status survives reload.
  await tab('Inbox');
  const submit = data => context.request.post(base + '/api/messages', { data });
  const message = { name: 'QA Recruiter', email: 'qa+recruiter@example.com', subject: 'Role & research?', message: 'Hello Muaz,\nCould we discuss a backend role?' };
  assert.equal((await submit(message)).status(), 201);
  await page.getByRole('button', { name: 'Refresh inbox' }).click(); await page.locator('.inbox-thread', { hasText: 'QA Recruiter' }).waitFor();
  await page.locator('.inbox-thread', { hasText: 'QA Recruiter' }).click(); await page.getByRole('button', { name: 'Mark unread', exact: true }).waitFor();
  await field(page, 'Your reply').fill('Yes, thank you!\nAvailable this week.');
  const draft = new URL(await page.locator('.inbox-reply-link').getAttribute('href'));
  assert.equal(draft.hostname, 'mail.google.com'); assert.equal(draft.searchParams.get('to'), message.email); assert.equal(draft.searchParams.get('su'), 'Re: ' + message.subject); assert.ok(draft.searchParams.get('body').includes('Available this week.')); assert.ok(draft.searchParams.get('body').includes(message.message));
  await page.getByRole('button', { name: 'Mark unread', exact: true }).click(); await page.getByRole('button', { name: 'Mark read', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Archive message', exact: true }).click(); await page.getByRole('button', { name: 'Move to inbox', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Archived', exact: true }).click(); assert.equal(await page.locator('.inbox-thread').count(), 1);
  await page.reload({ waitUntil: 'networkidle' }); await tab('Inbox'); await page.getByRole('button', { name: 'Archived', exact: true }).click(); await page.locator('.inbox-thread', { hasText: 'QA Recruiter' }).waitFor();
  await page.getByRole('button', { name: 'Move to inbox', exact: true }).click(); await page.getByRole('button', { name: 'Inbox', exact: true }).click();
  await field(page, 'Search messages').fill('missing sender'); assert.equal(await page.locator('.inbox-thread').count(), 0); await field(page, 'Search messages').fill('research'); await page.locator('.inbox-thread', { hasText: 'QA Recruiter' }).waitFor();
  await page.route('**/api/messages', route => route.request().method() === 'GET' ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'QA temporary inbox failure' }) }) : route.continue());
  await page.getByRole('button', { name: 'Refresh inbox' }).click(); await page.getByRole('alert').filter({ hasText: 'QA temporary inbox failure' }).waitFor();
  await page.unroute('**/api/messages'); await page.getByRole('button', { name: 'Try again' }).click(); await page.locator('.inbox-error').waitFor({ state: 'hidden' });
  assert.equal((await (await context.request.get(base + '/api/auth/session')).json()).authenticated, true);
  await page.screenshot({ path: join(output, 'desktop-inbox.png') });
  await page.setViewportSize({ width: 375, height: 812 }); await page.getByLabel('Editor section', { exact: true }).selectOption('inbox');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await page.screenshot({ path: join(output, 'mobile-inbox.png'), fullPage: true });

  const saved = await (await context.request.get(base + '/api/content')).json();
  for (const invalid of [ { ...saved, site: { ...saved.site, navigation: 'bad' } }, { ...saved, sections: { ...saved.sections, skills: { ...saved.sections.skills, groups: [{ id: 'bad', name: 'Bad', icon: 'x', items: 'not a list' }] } } }, { ...saved, projects: saved.projects.map((p, i) => i ? p : { ...p, walkthroughSteps: [{ id: 'bad', title: 'Bad', detail: '', tech: [], payload: '[1,2]' }] }) } ]) assert.equal((await context.request.put(base + '/api/content', { data: invalid })).status(), 400);
  const inbox = await (await context.request.get(base + '/api/messages')).json(); assert.equal(inbox.length, 1); assert.equal(inbox[0].archivedAt, undefined); assert.equal(inbox[0].readAt, undefined);
  assert.equal((await context.request.patch(base + '/api/messages', { data: { id: inbox[0].id, action: 'delete' } })).status(), 400);
  assert.equal((await context.request.patch(base + '/api/messages', { data: { id: 'missing', action: 'read' } })).status(), 404);
  assert.equal((await fetch(base + '/api/messages', { method: 'PATCH', body: '{}' })).status, 401);
  assert.deepEqual(errors, []);
  assert.equal(await readFile(join(root, 'data/portfolio-content.json'), 'utf8'), ownerContent);
  console.log('Editable sections, skills, education, brand/navigation, hero, research, capabilities, dynamic walkthroughs, public routes, inbox refresh/search/status/reload/error recovery, Gmail draft encoding, validation: PASS');
} catch (error) { await page?.screenshot({ path: join(output, 'failure.png'), fullPage: true }).catch(() => {}); throw error; }
finally {
  await browser?.close();
  if (server && server.exitCode === null) { const done = once(server, 'exit'); server.kill(); await done; }
  for (const name of ['.next', 'node_modules', 'public']) await rm(join(fixture, name), { force: true });
  assert.ok(resolve(fixture).startsWith(resolve(tmpdir()) + sep)); await rm(fixture, { recursive: true, force: true });
}
