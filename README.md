# Muaz Ibne Ashraf — Portfolio

Personal portfolio built with Next.js, React, TypeScript, and CSS. The homepage introduces Muaz, shows his projects and research, and ends with capabilities and contact details.

## Development

Use Node.js 22.13 or later. Run `npm ci`, copy `.env.example` to `.env.local`, set `ADMIN_PASSWORD` and a random `AUTH_SECRET`, then run `npm run dev`.

For production, run `npm run build` followed by `npm start`. The optional Sites/Vinext configuration is retained for the existing hosting integration.

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

## Interactive exploration

- **Hero network:** three accessible buttons reveal backend routing, synchronized web peers, and a neural network within the globe. Each selected network sends a signal toward its project preview; the original globe stays mounted.
- **Homepage intro:** plays on a fresh visit; browser refresh opens the homepage directly, including when refreshed during typing. The refresh decision runs before the first paint to avoid an intro flash. Completion is kept only in memory so client-side navigation does not replay it. Skip is available during playback and disappears as the homepage starts fading in. Escape also finishes playback; reduced motion shows the homepage immediately. Text reserves its final dimensions, and the existing canvases stay mounted through the transition.
- **Project walkthrough:** the homepage traces the main stages in each project using the workflow steps managed in the admin studio.
- **Technology ticker:** continues through hover and click; the explicit motion control and reduced-motion preference still pause it. `node tests/marquee.browser.mjs` verifies those behaviors.
- **Skills and capabilities:** each skill category and capability has its own technical illustration. Scenes pause outside the viewport, when the tab is hidden, and with the site's motion controls.
- **Research:** the thesis illustration moves through five stages while visible. Hover, tap, or keyboard navigation inspects a stage; inspection, reduced motion, and the motion control stop automatic progression.
- **About:** the portrait frame draws once, its card responds subtly to a mouse pointer, and education milestones connect in sequence. Section headings and grouped content remain visible without entrance animations.
- **Projects:** category changes animate the selection indicator and card arrangement. Supported browsers carry named artwork and titles between cards and case studies; the All projects link reverses the transition. Browser history restores the original route and scroll position immediately.
- **Transition continuity:** the background canvas stays mounted in the root layout across public routes. Shared project artwork uses one opaque snapshot, and summary/actions enter within that same browser transition. Browser restoration uses instant scroll positioning; navigation links and Back to top request smooth scrolling explicitly.
- **Contact and résumé:** contact fields trace their focus border and show progress, error, success, and copy feedback. The résumé animates its outer frame into reading mode, preserves the reading position, and renders PDF text at its final resolution.

With the development app on port 3001, `node tests/site-motion.browser.mjs` checks static section headings, the new scenes, profile behavior, keyboard access, pause/reduced motion, and layouts from 320 to 1920px. Contact requests and clipboard writes are intercepted so the check does not add inbox messages or change the system clipboard. Set `TEST_BASE_URL` for another port.

`node tests/transition-continuity.browser.mjs` checks every project on desktop and mobile, samples rendered frames during navigation and browser Back, verifies exact scroll restoration, keeps the same painted background canvas, and checks opaque artwork, archive filters, and reduced motion.

`tests/experience.browser.mjs` runs the interactive checks against an isolated production server. After building, set `PLAYWRIGHT_MODULE` to an installed Playwright module (or install Playwright in your tooling environment) and run `node tests/experience.browser.mjs`. `BROWSER_CHANNEL` defaults to `msedge`. It covers the hero nodes, workflow controls, responsive layouts, admin saves, and URL validation.
