# VPN Super API — Multi-region probing

## Real multi-region measurements

This feature uses RIPE Atlas public probes to run one-off IPv4 ICMP ping measurements from selected countries to a public hostname or IPv4 target.

Supported country codes: NL, US, DE, SG, JP. Each selected country requests up to 3 probes. Probe availability varies; a country may return fewer probes or no results. Results are asynchronous and may take time to appear.

### Cloudflare Pages secrets

In Cloudflare Dashboard → Workers & Pages → your Pages project → Settings → Variables and Secrets, add these as **encrypted secrets** for the production environment:

- `VPN_SUPER_API_KEY`: generate a long random application key. This protects the measurement endpoints.
- `RIPE_ATLAS_API_KEY`: your RIPE Atlas API key with permission to create measurements.

Do not put either value in GitHub, source code, a public Pages variable, or a screenshot. The RIPE Atlas key is kept server-side. The browser asks for the application key when starting or retrieving a measurement; it is not saved by this website.

RIPE Atlas measurement creation requires an API key with measurement-creation permission. It uses RIPE Atlas credits; review your balance and current credit rules before running measurements.

### Endpoints

`POST /api/regions/start`

Headers: `Authorization: Bearer YOUR_VPN_SUPER_API_KEY`, `Content-Type: application/json`

Body:
```json
{
  "target": "example.com",
  "countries": ["NL", "US", "SG"]
}
```

The endpoint creates one measurement per selected country and returns RIPE Atlas measurement IDs.

`GET /api/regions/results?ids=123,456&countries=NL,US`

Header: `Authorization: Bearer YOUR_VPN_SUPER_API_KEY`

Returns latest probe results, packet RTT samples, average RTT and probe IDs.

### Safety and limits

- Only public hostnames and public IPv4 addresses are accepted. URLs, local hostnames and private/reserved IPv4 ranges are rejected.
- Maximum five countries and three requested probes per country per request.
- Measurements are one-off; no recurring schedule is created.
- The application key protects these endpoints. Rotate it if exposed.
- The browser must not receive the RIPE Atlas API key.
- These measurements show network reachability from RIPE Atlas probes to the specified target. They do not test a commercial VPN provider's private nodes or the user's iPhone tunnel.
- RIPE Atlas probe availability, result timing, quotas and credit costs are controlled by RIPE Atlas.

Official references:
- https://atlas.ripe.net/docs/apis/rest-api-manual/measurements/creating-measurements/
- https://atlas.ripe.net/docs/apis/rest-api-reference/measurements/measurements_latest/
