# VPN Super Assistant

A free, mobile-first static website with browser-based network diagnostics for iPhone Safari.

## Deploy with Cloudflare Pages

1. Open https://dash.cloudflare.com/
2. Go to **Workers & Pages** → **Create application** → **Pages**.
3. Choose **Connect to Git** and select `pexshop/super-assistant`.
4. Framework preset: **None**.
5. Build command: leave empty.
6. Build output directory: `.` (repository root).
7. Click **Save and Deploy**. Wait for the deployment status to show **Success** before testing.

The site is a static `index.html`; no build step, server, paid API key, or database is required.

## Included browser tools

- Public IPv4 lookup
- IPv4 / IPv6 reachability checks
- WebRTC ICE candidate inspection
- HTTPS endpoint request timing
- HTTPS connectivity check
- Page-open connectivity monitoring
- Diagnostic report export
- Local troubleshooting guide
- 50-item tool directory with capability/limitation notes

## Important limitations

This is an independent helper, not an official VPN Super product. A website cannot read or control VPN Super's private server list, inspect the iOS system VPN status, force reconnection, keep a system VPN tunnel alive, or guarantee background monitoring. iOS Safari may suspend timers when backgrounded or locked. Browser HTTPS timings are not ICMP ping or VPN-node latency. DNS notes are not a certified DNS-leak audit.

Some tests contact public third-party endpoints. Their availability, CORS policies, rate limits, and privacy practices may change. Do not enter VPN passwords, private keys, or configuration secrets.

## Cloudflare Pages Functions API

The `functions/api/probe.js` endpoint adds a server-side probe API when the repository is deployed as a **Cloudflare Pages** project with Functions enabled (the standard Git-connected Pages deployment supports this automatically).

Examples:

- `/api/probe` — probe Cloudflare's public trace endpoint
- `/api/probe?target=ipify` — check reachability of the public IP lookup endpoint
- `/api/probe?target=speed` — request a small Cloudflare speed-test sample

The response includes request latency and the Cloudflare edge colo/country that handled this request, when available. This is a single edge-location test, **not** a global multi-region test and not a test of private VPN nodes. Only fixed allowlisted upstream targets are accepted; arbitrary URLs cannot be submitted, which helps prevent server-side request forgery.

After connecting this repository to Cloudflare Pages, test `https://YOUR-PAGES-DOMAIN/api/probe`. The existing `workers.dev` URL is a separate Worker deployment and will not automatically receive Pages Functions from this repository. Do not test the Pages Function on the old `workers.dev` hostname unless you separately deploy the API to that Worker.

### If deployment fails

- Framework preset: **None**.
- Build command: leave blank.
- Build output directory: `.`.
- Root directory: `/` (repository root), if the dashboard asks for it separately.
- Confirm the selected production branch is `main`.
- In the latest deployment details, inspect the build log; a GitHub commit alone does not trigger a deployment unless the Pages project is connected to this repository.


## VPN Super API v1.0

The repository includes a read-only API layer:

- `GET /api/health` — service status and version.
- `GET /api/probe?target=cloudflare` — one fixed allowlisted upstream probe.
- `GET /api/diagnostics` — all seven allowlisted checks in parallel.
- `docs/vpn-super-api.md` — endpoint usage, deployment and security notes.
- `openapi.yaml` — OpenAPI 3.1 description.

After deployment, test `/api/health` and `/api/diagnostics` on the Pages domain. Configure Cloudflare WAF/rate limiting for public `/api/*` endpoints. Checks originate from the Cloudflare edge and do not inspect private VPN provider nodes or iOS system VPN state.



## Multi-region probing (Globalping)

- POST /api/regions/start — create one-off ping measurements from Globalping public probes in NL, US, DE, SG, and/or JP (up to 3 probes requested per country).
- GET /api/regions/results?ids=...&countries=... — retrieve measurement status and available per-probe results.
- Configure only the encrypted Cloudflare Pages secret VPN_SUPER_API_KEY to protect the site's endpoints. No Globalping API key or account is required.
- Globalping's unauthenticated public API documents a free limit of 250 tests/hour and up to 50 probes per measurement; rate limits may change.
- See docs/multi-region-probing.md for setup and limitations.
