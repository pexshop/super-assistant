# VPN Super Assistant

A free, mobile-first static website with browser-based network diagnostics for iPhone Safari.

## Deploy with Cloudflare Pages

1. Open https://dash.cloudflare.com/
2. Go to **Workers & Pages** → **Create application** → **Pages**.
3. Choose **Connect to Git** and select `pexshop/super-assistant`.
4. Framework preset: **None**.
5. Build command: leave empty.
6. Build output directory: `/` (repository root).
7. Click **Save and Deploy**.

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
