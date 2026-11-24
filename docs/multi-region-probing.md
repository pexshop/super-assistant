# VPN Super Assistant — Multi-region probing

## Globalping public probe network

This feature uses the public Globalping API to run distributed ping measurements from volunteer probes in selected countries. Supported country codes: NL, US, DE, SG, JP. Each country requests up to three probes. Actual availability depends on online volunteers in each location.

### Cloudflare Pages secret

In Cloudflare Dashboard → Workers & Pages → your Pages project → Settings → Variables and Secrets, configure one encrypted secret:

- VPN_SUPER_API_KEY: a long random application key used to protect this site's measurement endpoints.

No Globalping API key, account, or payment setup is required. Globalping's unauthenticated public API currently documents a free rate limit of 250 measurement tests/hour and up to 50 probes per measurement. Limits may change; handle HTTP 429 responses and avoid repeated refreshes.

### Endpoints

POST /api/regions/start

Header: Authorization: Bearer YOUR_VPN_SUPER_API_KEY

Body:
```json
{
  "target": "example.com",
  "countries": ["NL", "US", "SG"]
}
```

Creates one Globalping ping measurement per selected country and returns measurement IDs.

GET /api/regions/results?ids=ID1,ID2&countries=NL,US

Header: Authorization: Bearer YOUR_VPN_SUPER_API_KEY

Returns measurement status, probe metadata and available RTT summaries.

### Safety and limitations

- Only public hostnames and public IPv4 addresses are accepted; local and private targets are rejected.
- Up to five countries and three requested probes per country per request.
- Globalping measurements are asynchronous; poll results responsibly.
- The site's own VPN_SUPER_API_KEY remains server-side; no Globalping provider key is used.
- Results show reachability from Globalping volunteer probes to the target. They do not test VPN provider private nodes or the user's iPhone VPN tunnel.
- Probe availability, rate limits and API operation are controlled by Globalping.
- Globalping measurement details and results may be publicly accessible to anyone with the measurement ID. Never test private hostnames or include credentials, tokens, or sensitive data in a target.

Official API specification: https://github.com/jsdelivr/globalping/blob/master/public/v1/spec.yaml
Public API root: https://api.globalping.io
