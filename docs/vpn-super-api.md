# VPN Super API

Version: 1.0.0  
Runtime: Cloudflare Pages Functions  
Base URL: the origin where this repository is deployed.

This API adds real server-side checks to the VPN Super Assistant website. It uses a fixed upstream allowlist and does not accept arbitrary destination URLs.

## Endpoints

### GET /api/health

Returns service status, API version, timestamp, Cloudflare edge location, and endpoint list.

Example:
```bash
curl https://YOUR-DOMAIN/api/health
```

### GET /api/probe

Runs one allowlisted upstream check. The optional `target` parameter must be one of:

- `cloudflare`
- `google`
- `ipify`
- `ipapi`
- `doh_cloudflare`
- `doh_google`
- `speed`

Example:
```bash
curl "https://YOUR-DOMAIN/api/probe?target=ipify"
```

### GET /api/diagnostics

Runs all seven allowlisted checks and returns a summary plus per-service results.

Example:
```bash
curl https://YOUR-DOMAIN/api/diagnostics
```

## Response fields

- `ok`: whether the endpoint or check succeeded.
- `latencyMs`: server-side elapsed time in milliseconds.
- `httpStatus`: upstream HTTP status, when available.
- `edge.colo` / `edge.country`: Cloudflare edge metadata for the request.
- DNS checks include `dnsStatus` and `dnsAnswers`.

## Deployment

1. Connect `pexshop/super-assistant` to Cloudflare Pages.
2. Production branch: `main`.
3. Framework preset: None.
4. Build command: leave empty.
5. Build output directory: repository root (`.`).
6. Deploy and wait for a successful Pages deployment.
7. Test `/api/health`, then `/api/probe` and `/api/diagnostics`.

Pages Functions are not automatically deployed to a separate `workers.dev` Worker. The API must be deployed with this Pages project, or separately adapted and deployed as a Worker.

## Security and operating limits

- Only fixed upstream destinations are allowed. Do not add a user-controlled URL fetch parameter.
- No API secret is required for the public read-only diagnostics endpoints.
- For a public production deployment, configure Cloudflare WAF/rate-limiting rules for `/api/*`; do not rely on in-memory counters in Workers.
- Upstream requests have short timeouts. Third-party outages, rate limits, or changes may affect results.
- CORS is open for read-only GET/OPTIONS endpoints. Do not add credentialed or state-changing routes without authentication and CSRF protections.
- Never send VPN passwords, private keys, subscription URLs, or account tokens to these endpoints.

## What this API cannot do

A Cloudflare Pages Function cannot inspect the iPhone's system VPN state, control a VPN application, force a tunnel reconnect, or access a provider's private node inventory without an authorized provider API. These endpoints are external-service reachability checks from the Cloudflare edge, not global VPN-node tests. Browser-based WebRTC checks remain in the website and do not prove the absence of DNS or IP leaks.
