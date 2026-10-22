# Local visual refresh

These changes are local only. The existing Vercel deployment has not been updated.

The footer now uses sun / monitor / moon theme icons (Light / System / Dark), with accessible names and tooltips. Decorative section labels, statistics timestamps and API failure messages are removed. Contact Us is orange in both themes. Privacy Policy links now open privacy-policy.html, a complete HTML conversion of the original PDF with a table of contents and a link to the unchanged PDF. Content fidelity is checked by tests/policy-content.py using the bundled Python runtime.

Run from this folder (Node.js 22 or later):

```powershell
npm run dev
```

Open http://127.0.0.1:4173. No dependency installation is necessary. The local server serves the pages and the same API handlers used by Vercel; opening index.html directly as a file will not provide the API.

- `design.css`: refreshed shared visual style and responsive layouts. The original `style.css` is retained as a reference and is no longer loaded by the pages.
- `refinements.css`: stronger typography, colored button shadows, refreshed studio and careers layouts, both color themes and the animated sort menu.
- `theme.js`: runs before styles load, defaults to the system theme, follows system changes until an explicit choice is made, and stores manual light/dark preferences across reloads and pages. Footer controls include System to reset the preference.
- `effects.js`: shared SVG arrows for links that previously had glyph arrows, measured header height for the full-viewport home hero, a scale-down intro only on that hero, and scroll reveals that keep already-seen cards stable across API refreshes. Reduced-motion preferences disable intros and reveals; content stays visible without JavaScript. The old Scroll Down control is removed. `node scripts/check-motion.cjs` checks motion behavior, viewport sizing, search-icon alignment and hover effects.
- The home hero background uses its own decorative layer: a gentle 1.12× → 1× intro over 2.3 seconds, followed by scroll parallax at 10% of the scroll distance, capped at 56 px on desktop and 32 px on mobile. Extra image coverage prevents exposed edges. Updates are limited to animation frames on scroll/resize; reduced-motion mode keeps the background still.
- `script.js`: catalogue configuration. Add only `placeId` and `universeId`; names are loaded from Roblox, and links are generated from the API's `rootPlaceId` (with the configured `placeId` as a fallback). No manual `name` or `robloxUrl` is needed. Run `npm run refresh-games` after adding games to update the immediate-loading snapshot.
- `client.js`: cards, search, sorting, navigation, caching and background updates.
- Date sorting offers Newest first and Oldest first using the Roblox API's `created` timestamp. This is the experience creation date, not a guaranteed public release date. Dates are included in the snapshot for GitHub Pages; unknown dates sort last in both directions.
- `api/game-thumbnails.js`: fetches the first Roblox thumbnail (`countPerUniverse=1`, 768×432 WebP). Cards use wide 16:9 images. Pending or missing thumbnails keep the saved cover or the local placeholder; game icons are not used as a fallback.
- `assets/games-data.js`: saved snapshot of the configured games and their first thumbnails. URLs reference Roblox CDN; external images need a network connection. Refresh with `npm run refresh-games`. The Refresh game catalogue workflow also regenerates and commits this file when script.js changes on main, and requests a rebuild if the site uses branch-based GitHub Pages.

The saved catalogue renders immediately, then requests current statistics and thumbnails in the background every 60 seconds. On duckplaces.com, www.duckplaces.com and bobersus.github.io, the client uses https://duckplaces.vercel.app/api because GitHub Pages cannot execute Node.js API handlers. Local and Vercel previews use their own /api routes. The public read-only backend sends CORS headers and caches successful responses for 60 seconds with 60 seconds of stale-while-revalidate. Hero and card counters show full numbers so small visit increases remain visible. Browser storage preserves the latest successful values during API outages without displaying an error banner.

`node scripts/check-live-statistics.cjs` checks actual cross-origin API responses on production, exact totals, the minute refresh timer, updates to both hero and catalogue cards, and mobile overflow. Set CANDIDATE_CLIENT=1 to test the local client against the production page before publishing it.

Validation: `npm test`. The local browser check `node scripts/check-local.cjs` uses this machine's bundled Playwright and installed Microsoft Edge; its screenshots are saved in `preview/`. Screenshots and local helpers are excluded from deployment.

`node scripts/check-refinements.cjs` checks first-visit system theme, saved preferences, resetting to System, keyboard and pointer interactions with the sort menu, reduced motion, updated content and both themes at desktop/tablet/mobile sizes. These UI changes are still local only.
