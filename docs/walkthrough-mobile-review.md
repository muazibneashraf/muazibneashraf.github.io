# Walkthrough and mobile update — 1 November 2026

Approved for publication on 1 November 2026. Live admin content was fetched before
publishing and copied verbatim into the repository. Local backup snapshots are
kept under ignored `tmp/sync-2026-11-01/`. The release does not write to the live
content store.

## Walkthrough

The walkthrough keeps its open two-column structure, with dedicated animations
for all 45 steps across 11 projects. These are separate from project-card artwork.
Scenes show source-to-token conversion, file allocation, report extraction,
shared image features, classifier comparison, community chat, database relations,
content publishing and graphics operations. Their labels explain each operation;
they do not execute the projects or manufacture performance scores.

“Inspect this step” swaps the scene for a scrollable example within the same
fixed-height area. The explanation and timeline stay in place. Stage changes reset
the view to its animation. The project picker is a searchable list with category
icons, step counts and keyboard navigation, presented as a sheet on mobile.

Titles, descriptions, technologies and stage counts still come from editable
portfolio content. Examples match the project slug and stage title, so a renamed
or custom stage falls back to its saved stage data instead of showing another
stage's illustration. The original LifeLine and thesis project records are unchanged.

Stage selection, keyboard arrows/Home/End, previous/next boundaries, project links,
playback and reset when switching projects have browser coverage. Playback stops
on the final stage and can be replayed. Motion stops when hidden, offscreen, paused
globally or reduced by user preference.

## Mobile

- The profile card precedes About in document order. Desktop placement is preserved.
- About navigation lands before the profile card on mobile.
- The project chooser becomes a scrollable sheet, with close/backdrop/Escape actions.
- Workflow stages form a horizontal strip with the active stage brought into view.
- Navigation opens smoothly and closes on selection, Escape, outside press or blur.
- Skill controls and navigation actions have larger touch targets.
- Profile, project and section spacing is adjusted for narrow screens.
- Offscreen project-card animations pause; the mobile background canvas caps its
  pixel ratio at 1.35, matching the existing hero canvas budget.

## Verification

- `npm test`: production build and 23 existing automated tests passed.
- `node tests/walkthrough-mobile.browser.mjs`: all 11 projects / 45 stages;
  keyboard, playback, boundaries, links, reduced motion and offscreen behavior passed.
- Responsive browser checks: 320, 360, 390, 430, 768, 1024, 1440 and 1920 pixels.
- 45 mobile route checks: 15 routes at 320, 390 and 768 pixels, without page overflow.
- Skills results, archive filters, original one-page CV, and homepage expansion /
  collapse position passed on the local production server.
- `npm run export:pages`: static export passed for every project detail route.
- Changed TypeScript files passed ESLint; `git diff --check` passed.

Screenshots and browser reports are under ignored `tmp/walkthrough-mobile-review/`.
These are browser-emulated mobile checks, not measurements on physical phones.

## Overflow correction and content synchronization

The API request panel is wide enough for `PUT /api/content`. The saved-content
panel is widened, and the desktop/mobile rendering panels no longer overlap.
Review and saved-recipe panels also have sufficient space for their foreign keys.
`tests/walkthrough-overflow.browser.mjs` checks every text node against its own
panel and checks inspector height across all 45 stages at 1440 and 390 pixels.

The live snapshot includes 51 edited fields across About, projects, activities,
contact and section copy. The local API was compared deeply with the live API,
and the selected original CV link was preserved.

## Mobile viewport update — 2 November 2026

The mobile workflow now puts numbered stage buttons above the scene and keeps
playback, inspection and previous/next actions in one touch-sized row directly
below it. The selected step's title and description stay above the animation.
The scene adapts to available viewport height, rather than stacking a long text
panel between the scene and its controls. Step selection resets inspection and
preserves page position; Play restores the animation from inspection.

Desktop centres only the scene/explanation composition, using balanced columns.
The heading and project picker remain left aligned, playback stays on the left,
and previous/next controls remain on the right. Inspect sits beneath the desktop
explanation; on mobile it stays beside playback. The panel is capped at 1320 pixels
with a smaller scene and more space around the composition.

`tests/walkthrough-viewport.browser.mjs` checks all 45 stages at 390×844 and
320×568: the picker, steps, animation and controls stay in the same viewport,
touch targets remain at least 44 pixels, and inspection/step changes preserve
position. Live admin content is backed up locally and preserved during deployment.
