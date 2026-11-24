const COUNTRIES = {
  NL: "Netherlands",
  US: "United States",
  DE: "Germany",
  SG: "Singapore",
  JP: "Japan"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, authorization"
    }
  });
}

function validPublicTarget(value) {
  if (typeof value !== "string" || value.length > 253) return false;
  const target = value.trim().toLowerCase();
  if (!target || target.includes("://") || target.includes("/") || target.includes("@")) return false;
  if (/^(localhost|.*\.localhost|.*\.local|.*\.internal)$/.test(target)) return false;

  const ipv4 = target.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const octets = ipv4.slice(1).map(Number);
    if (octets.some(n => n > 255)) return false;
    const [a, b] = octets;
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    return true;
  }

  if (target.length > 253 || !target.includes(".")) return false;
  return target.split(".").every(label =>
    label.length >= 1 && label.length <= 63 &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
  );
}

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization"
  }});
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  if (!env.VPN_SUPER_API_KEY || !env.RIPE_ATLAS_API_KEY) {
    return json({ ok: false, error: "Server setup required: configure VPN_SUPER_API_KEY and RIPE_ATLAS_API_KEY in Cloudflare Pages settings." }, 503);
  }

  const auth = request.headers.get("authorization") || "";
  if (auth !== "Bearer " + env.VPN_SUPER_API_KEY) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "Invalid JSON body" }, 400); }

  const target = typeof body.target === "string" ? body.target.trim().toLowerCase() : "";
  const countries = Array.isArray(body.countries) ? [...new Set(body.countries)] : [];
  if (!validPublicTarget(target)) return json({ ok: false, error: "Enter a public IPv4 address or hostname (no URL, private IP, or local hostname)." }, 400);
  if (!countries.length || countries.length > 5 || countries.some(code => !Object.hasOwn(COUNTRIES, code))) {
    return json({ ok: false, error: "Select between 1 and 5 supported countries.", supportedCountries: Object.keys(COUNTRIES) }, 400);
  }

  const created = [];
  const failures = [];
  for (const code of countries) {
    try {
      const upstream = await fetch("https://atlas.ripe.net/api/v2/measurements/", {
        method: "POST",
        headers: {
          "authorization": "Key " + env.RIPE_ATLAS_API_KEY,
          "content-type": "application/json",
          "accept": "application/json"
        },
        body: JSON.stringify({
          definitions: [{
            target,
            description: "VPN Super regional probe " + code + " " + new Date().toISOString(),
            type: "ping",
            af: 4,
            packets: 3
          }],
          probes: [{ requested: 3, type: "countries", value: code }]
        })
      });

      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok || !Array.isArray(data.measurements) || !data.measurements[0]) {
        failures.push({ country: code, name: COUNTRIES[code], status: upstream.status, error: data.detail || data.error || "RIPE Atlas rejected the measurement" });
      } else {
        created.push({ country: code, name: COUNTRIES[code], measurementId: data.measurements[0] });
      }
    } catch {
      failures.push({ country: code, name: COUNTRIES[code], error: "RIPE Atlas request failed" });
    }
  }

  return json({
    ok: created.length > 0,
    target,
    created,
    failures,
    note: "RIPE Atlas measurements run from participating probes in the selected countries. Results may take time to appear. Measurement creation consumes RIPE Atlas credits according to its current credit rules."
  }, created.length ? 200 : 502);
}
