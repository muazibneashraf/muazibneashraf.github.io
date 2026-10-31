# Muaz Ibne Ashraf — Portfolio

Personal portfolio built with Next.js, React, TypeScript, and CSS. The homepage introduces Muaz, shows his projects and research, and ends with capabilities and contact details.

## Development

Use Node.js 22.13 or later. Run `npm ci`, copy `.env.example` to `.env.local`, set `ADMIN_PASSWORD` and a random `AUTH_SECRET`, then run `npm run dev`.

For production, run `npm run build` followed by `npm start`. The optional Sites/Vinext configuration is retained for the existing hosting integration.

`npm run export:pages` snapshots public routes for GitHub Pages, restores the original request-time route settings afterward, and checks that the homepage, Projects archive, and case studies were actually exported before deployment.

## Editing content

Sign in at `/admin`. Fourteen focused sections manage identity and résumé, logos and navigation, page text, homepage and globe, biography and qualifications, skill categories, projects and animated diagrams, research, walkthrough stages, capabilities, job experience, leadership, contact, and the inbox. Collections can be added, removed and reordered. Save publishes changes; the preview link opens the corresponding public section. Clicking the studio logo refreshes `/admin`. Export creates a content backup; imported content must pass validation before it can be saved. The studio shares the website's colors and fonts through `lib/theme.ts`; appearance controls are removed.

Local content lives in `data/portfolio-content.json`. `data/editorial-defaults.json` supplies initial values for fields added to older exports; saved values take precedence. Empty work experience is supported. Technical diagrams and walkthroughs use saved labels, descriptions, stages and project links. The About disclosure expands the remaining biography and languages inline on the homepage.

The default CV is `public/Muaz_Ibne_Ashraf_CV_Finalized.pdf`. Admin → Identity accepts a PDF up to 4 MB; Save publishes its versioned URL across the website. Résumé links open a themed [PDF.js](https://mozilla.github.io/pdf.js/) canvas reader with a full-page opening view, click/tap enlargement, continuous scrolling, and a download control. `/resume` also works as a direct link. The preview renders the current PDF without a browser PDF toolbar or a separate preview image. Dev and build hooks copy the pinned PDF.js worker, fonts, and decoding assets into `public/pdfjs/`.

## Storage and authentication

Local writes are stored on disk. Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for persistent content and inbox storage on serverless hosting. Vercel requires that remote store for writes. Deployment environment variables must be configured separately from `.env.local`.

Admin sessions use signed, HTTP-only cookies. Production login requires an explicitly configured password. Keep `.env.local` private; it is ignored by Git. Rotating `AUTH_SECRET` invalidates existing sessions.

The contact form saves messages to the admin inbox (`data/messages.json` locally); it does not send an email. The inbox refreshes on focus and every 30 seconds, supports search, read/unread status and archiving, and keeps the selected message visible while its status changes. Reply in Gmail opens a draft with the sender, subject, written reply and quoted original message; the administrator sends it from Gmail. Public email links open Gmail addressed to the saved contact address.

## Checks

- `npm run lint`
- `npm test` — production build and isolated API regression tests
- `npm audit` — dependency security audit

The API tests use a temporary content store and leave the owner's portfolio unchanged. They cover public routes, authenticated edits, invalid input, resume assets, login, and the contact inbox. Browser checks should also cover mobile overflow, admin collection editors, project filters, motion controls, and the resume modal.

With the app running, `node tests/refresh-and-smoothness.browser.mjs` checks the intro sequence, repeated document reloads, refresh during typing, Skip/Escape, layout stability at 320–1920px, canvas continuity, reduced motion, and navigation. Set `TEST_BASE_URL` to test a different local port. Screenshots, a refresh video, and frame/layout measurements are saved in `tmp/refresh-verification/`.

After building, `node tests/admin-studio.browser.mjs` checks all fourteen studio sections and publishing tools; `node tests/editorial-inbox.browser.mjs` covers the section editors, public publishing, variable walkthrough lengths, inbox status persistence, error recovery and Gmail draft encoding; `node tests/admin-publishing.browser.mjs` covers résumé upload and job experience publishing; `node tests/pdf-viewer.browser.mjs` covers PDF rendering, continuous pages, full-page fit, enlargement, download, and error states; `node tests/navigation.browser.mjs` checks section landing positions and the logo's return to the top. Browser tests use Edge by default and isolated data stores.

`node tests/scroll-and-navigation.browser.mjs` checks the returning background field, progressive navbar opacity, matching résumé hover, smooth section scrolling and the contact page fade, and the CV reader across phone and desktop widths. It saves screenshots and measurements in `tmp/scroll-polish/`. Navbar Projects scrolls to the homepage work section; All projects opens the full project list. The detached CV controls sit at the screen's right edge, and the paper has equal side gutters.

## Content and design

Biographical and project details are based on the supplied CV. Project diagrams illustrate application workflows; they are not screenshots or measured results. The ICU project is an academic prototype, with no clinical validation claimed. The finalized CV PDF is preserved unchanged.

The design keeps the dark background, cyan accents, technical illustrations, and reduced-motion controls. Earlier research references include [Brittany Chiang](https://brittanychiang.com/), [Bruno Simon](https://bruno-simon.com/), and [GitHub's portfolio guidance](https://docs.github.com/en/account-and-profile/tutorials/using-your-github-profile-to-enhance-your-resume).

Typography uses locally served Geist Sans for headings, reading text and interface controls, with Geist Mono for code and technical labels. The variable WOFF2 files come from the official `geist` 1.9.0 distribution; the SIL Open Font License is included in `app/fonts/Geist-OFL.txt`. Legacy saved Manrope and Space Grotesk theme references resolve to Geist Sans, including inside the admin studio and résumé overlay.

## Interactive exploration

- **Neural globe:** a spherical 3D network with an outer circled lattice, dual 3D tilted orbital tracks with orbiting micro-satellite relays, laser telemetry downlinks, ambient space dust, an ethereal holographic Fresnel rim, and an inner volumetric multi-layer neural network core. Organic synapses connect the 7-layer volumetric processing core to the outer sphere; comet-tail data pulses carry AI signals between connected nodes, triggering expanding action-potential ripples and 4-point star lens flares on multi-dimensional hubs. Rotating the globe preserves a crisp circular silhouette with dimensional depth without feeling like a solid ball. On mobile touchscreens, vertical thumb scrolling moves the webpage naturally, while horizontal swipes rotate the globe. Pointer input leaves no focus outline; keyboard focus has a small top marker instead of an outer circle. Drag, inertia, warnings, the burst, and the welcome sequence share the same geometry and light field.
- **Hero network:** three accessible buttons reveal backend routing, synchronized web peers, and a neural network within the globe. Each selected network sends a signal toward its project preview; the original globe stays mounted.
- **Globe Easter egg:** click/hold and drag (or use one finger) to rotate the globe in place. Gesture speed controls rotation; release preserves momentum with gradual friction. There are no visible instructions or progress meter. Sustained fast spinning reveals progressively urgent, playful warnings (with variations on repeated attempts), grows the globe, and triggers a particle burst. “Welcome to My Projects” fades in and holds before revealing `/projects`, which loads beneath the root-layout overlay during the animation. The real network background stays visible throughout; warning capsules share the globe labels' glass treatment, and the intro inherits the saved theme and Projects heading typography. Hover does not steer. Arrow keys rotate and Enter opens Projects; reduced motion and Pause disable inertia, warnings, growth, and the burst. The rest of the page remains scrollable outside the circular drag surface. `node tests/globe.browser.mjs` checks mouse/touch gestures, hidden hints, warnings, momentum, anchored layout, project previews, theme matching, the welcome intro and route handoff, browser Back, and reduced motion. Set `TEST_BASE_URL` for the target server (default port 3002).
- **Homepage intro:** plays on a fresh visit; browser refresh opens the homepage directly, including when refreshed during typing. The refresh decision runs before the first paint to avoid an intro flash. Completion is kept only in memory so client-side navigation does not replay it. Skip is available during playback and disappears as the homepage starts fading in. Escape also finishes playback; reduced motion shows the homepage immediately. Text reserves its final dimensions, and the existing canvases stay mounted through the transition.
- **Project walkthrough:** the homepage traces the main stages in each project using the workflow steps managed in the admin studio.
- **Technology ticker:** continues through hover and click; the explicit motion control and reduced-motion preference still pause it. `node tests/marquee.browser.mjs` verifies those behaviors.
- **Skills:** an interactive evidence map links each selectable technology to projects whose saved stack or walkthrough technology explicitly includes it. Exact normalized names and a small alias list prevent false matches (for example, C does not match CNN). Connections update with admin edits; mobile categories keep the graph close to its controls. It starts neutral; clicking an active technology again or pressing Escape clears the selection. Capabilities retain their technical illustrations and motion controls.
- **Homepage composition:** About precedes Projects, followed by Skills. The first featured project has a wide split composition on desktop, followed by three smaller showcases; narrow screens use a single column. Surfaces share restrained borders, lighting, typography and spacing.
- **Neural continuity:** the same background neurons and signals ease between project clusters, skill layers, a research pipeline, and contact convergence. A critically damped scroll follower and velocity-preserving node motion keep irregular wheel input from jerking the scene; visibility eases on the animation clock instead of snapping to moving content masks. Native document scrolling stays immediate. The globe stays anchored; burst particles unfurl into two asymmetrical ribbons of cyan and lilac filaments around the Projects welcome, then drift into the page reveal. Reading areas have a feathered protection field.
- **Job experience:** an empty collection hides both the homepage section and public navigation link. The empty archive redirects home. Adding and saving a job in admin restores the section, link and archive; deleting the final job hides them again.
- **Research:** the thesis illustration moves through five stages while visible. Hover, tap, or keyboard navigation inspects a stage; inspection, reduced motion, and the motion control stop automatic progression.
- **About:** the portrait frame draws once, its card responds subtly to a mouse pointer, and education milestones connect in sequence. Section headings and grouped content remain visible without entrance animations.
- **Projects:** category changes animate the selection indicator and card arrangement. Supported browsers carry named artwork and titles between cards and case studies; the All projects link reverses the transition. Browser history restores the original route and scroll position immediately.
- **Transition continuity:** the background canvas stays mounted in the root layout across public routes. Shared project artwork uses one opaque snapshot, and summary/actions enter within that same browser transition. Browser restoration uses instant scroll positioning; navigation links and Back to top request smooth scrolling explicitly.
- **Contact and résumé:** contact fields trace their focus border and show progress, error, success, and copy feedback. The résumé animates its outer frame into reading mode, preserves the reading position, and renders PDF text at its final resolution.
- **Contact finale:** confirmed delivery sends a short cyan signal from the send action to its receipt. Failures retain the error state. The compact footer reuses the same editable monogram and crop as the header, with a brief reveal once in view; reduced motion shows it immediately.

After `npm run build`, `node tests/neural-design.browser.mjs` verifies the evidence graph with mouse, keyboard and touch, continuous background identities, reduced motion, the real Contact API and inbox, and adding/removing the final job through admin. It uses isolated local storage and blocks external message forwarding. Screenshots are saved to `tmp/neural-design-verified/`.

With the development app on port 3001, `node tests/site-motion.browser.mjs` checks static section headings, the new scenes, profile behavior, keyboard access, pause/reduced motion, and layouts from 320 to 1920px. Contact requests and clipboard writes are intercepted so the check does not add inbox messages or change the system clipboard. Set `TEST_BASE_URL` for another port.

`node tests/transition-continuity.browser.mjs` checks every project on desktop and mobile, samples rendered frames during navigation and browser Back, verifies exact scroll restoration, keeps the same painted background canvas, and checks opaque artwork, archive filters, and reduced motion.

`tests/experience.browser.mjs` runs the interactive checks against an isolated production server. After building, set `PLAYWRIGHT_MODULE` to an installed Playwright module (or install Playwright in your tooling environment) and run `node tests/experience.browser.mjs`. `BROWSER_CHANNEL` defaults to `msedge`. It covers the hero nodes, workflow controls, responsive layouts, admin saves, and URL validation.
