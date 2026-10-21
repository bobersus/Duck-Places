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
- `script.js`: catalogue configuration. Add only `placeId` and `universeId`; names are loaded from Roblox, and links are generated from the API's `rootPlaceId` (with the configured `placeId` as a fallback). No manual `name` or `robloxUrl` is needed. Run `npm run refresh-games` after adding games to update the immediate-loading snapshot.
- `client.js`: cards, search, sorting, navigation, caching and background updates.
- Date sorting offers Newest first and Oldest first using the Roblox API's `created` timestamp. This is the experience creation date, not a guaranteed public release date. Dates are included in the snapshot for GitHub Pages; unknown dates sort last in both directions.
- `api/game-thumbnails.js`: fetches the first Roblox thumbnail (`countPerUniverse=1`, 768×432 WebP). Cards use wide 16:9 images. Pending or missing thumbnails keep the saved cover or the local placeholder; game icons are not used as a fallback.
- `assets/games-data.js`: saved snapshot of the configured games and their first thumbnails. URLs reference Roblox CDN; external images need a network connection. Refresh with `npm run refresh-games`. The Refresh game catalogue workflow also regenerates and commits this file when script.js changes on main, and requests a rebuild if the site uses branch-based GitHub Pages.

The saved catalogue renders immediately, then requests current statistics and thumbnails in the background. Browser storage preserves the latest successful values. If the API fails, cards remain usable without displaying an error banner. GitHub Pages does not run the Node.js API functions: it needs the saved snapshot. For live updates, host the site and its /api routes on Vercel and point the domain there.

Validation: `npm test`. The local browser check `node scripts/check-local.cjs` uses this machine's bundled Playwright and installed Microsoft Edge; its screenshots are saved in `preview/`. Screenshots and local helpers are excluded from deployment.

`node scripts/check-refinements.cjs` checks first-visit system theme, saved preferences, resetting to System, keyboard and pointer interactions with the sort menu, reduced motion, updated content and both themes at desktop/tablet/mobile sizes. These UI changes are still local only.
