# Duck Places — Vercel

Local visual changes made after this deployment are not published. See LOCAL-PREVIEW.md for the current local version. File comparisons in check-deployment.cjs are intended to run after publishing the corresponding local version.

Production: https://duckplaces.vercel.app
Project: https://vercel.com/bobersus-projects/duckplaces
Team: bobersus-projects
Project ID: prj_OO6sepU1mGx1jsKWomFAdZm3X1XH
Deployment ID: dpl_EpQqzdhdCtKeD5XeNLrWDKGEUAW5

Deployed directly through Vercel API from local source files. No Git provider is connected and nothing was pushed to GitHub. The HTML, CSS and image assets are unchanged. Only the frontend API base URL changed to the same origin. The existing `/api/games` and `/api/game-icons` response formats are preserved by two Node.js functions, replacing the external Render backend. Successful Roblox responses are cached by Vercel for 120 seconds, with 300 seconds of stale-while-revalidate. Errors are not cached. No API key is required for these public Roblox endpoints.

## DNS cutover still required

DNS is managed by REG.RU (`ns1.reg.ru`, `ns2.reg.ru`). Current apex A records point to GitHub Pages and the www CNAME points to bobersus.github.io. Both custom domains have been added and verified in the Vercel project. DNS has not been changed.

In REG.RU DNS settings, replace only the website records:

| Type | Name | Value |
| --- | --- | --- |
| A | @ | 216.198.79.1 |
| A | @ | 64.29.17.1 |
| CNAME | www | 89564624fe052650.vercel-dns-017.com. |

Remove the old apex A values 185.199.108.153, 185.199.109.153, 185.199.110.153 and 185.199.111.153 when replacing them. Replace the old www CNAME bobersus.github.io. Preserve mail records and all unrelated records. Nameservers do not need to change. These values are the rank-1 recommendations returned by Vercel for this project on 2026-10-21; recheck the project's Domains page if applying them much later.

www.duckplaces.com is configured to redirect to duckplaces.com. Once DNS propagates, verify HTTPS and both API endpoints on the custom domain. Leave the old Render service running until the domain migration and cached older clients have settled; then it can be retired separately.

## Updating without GitHub

The local .vercel/project.json links this folder to the project. With Vercel CLI installed and signed in to the correct account:

```powershell
vercel project inspect --non-interactive
vercel deploy --prod --scope bobersus-projects
```

.vercelignore excludes local tests, helper scripts, Apache configuration and the old CNAME file. Vercel handles extensionless URLs and the custom 404 page.

## Validation

```powershell
node --test tests/hosting.test.js
node scripts/check-deployment.cjs
```

The first command checks API validation, response compatibility and failure caching. The second checks the public deployment, file hashes against local HTML/CSS/images, redirects, the full game list, icons, CDN cache responses and the custom 404 page.
