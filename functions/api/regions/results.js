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
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "authorization"
    }
  });
}

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "authorization"
  }});
  if (request.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);
  if (!env.VPN_SUPER_API_KEY || !env.RIPE_ATLAS_API_KEY) return json({ ok: false, error: "Server setup required" }, 503);
  if ((request.headers.get("authorization") || "") !== "Bearer " + env.VPN_SUPER_API_KEY) return json({ ok: false, error: "Unauthorized" }, 401);

  const url = new URL(request.url);
  const ids = (url.searchParams.get("ids") || "").split(",").filter(Boolean);
  const countries = (url.searchParams.get("countries") || "").split(",");
  if (!ids.length || ids.length > 5 || ids.some(id => !/^\d{1,12}$/.test(id)) || countries.length !== ids.length || countries.some(code => !Object.hasOwn(COUNTRIES, code))) {
    return json({ ok: false, error: "Provide matching measurement ids and country codes." }, 400);
  }

  const results = await Promise.all(ids.map(async (id, index) => {
    try {
      const response = await fetch("https://atlas.ripe.net/api/v2/measurements/" + id + "/latest/?format=json", {
        headers: { "authorization": "Key " + env.RIPE_ATLAS_API_KEY, "accept": "application/json" }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return { measurementId: id, country: countries[index], countryName: COUNTRIES[countries[index]], ready: false, error: "RIPE Atlas returned HTTP " + response.status };

      const probes = [];
      for (const [probeId, versions] of Object.entries(data || {})) {
        const latest = Array.isArray(versions) ? versions[0] : versions;
        if (!latest) continue;
        const packets = Array.isArray(latest.result) ? latest.result : [];
        const rtts = packets.map(packet => packet.rtt).filter(value => typeof value === "number" && Number.isFinite(value));
        probes.push({
          probeId,
          rttsMs: rtts,
          received: rtts.length,
          packets: packets.length,
          averageRttMs: rtts.length ? Math.round(rtts.reduce((sum, value) => sum + value, 0) / rtts.length * 100) / 100 : null,
          from: latest.from || null,
          timestamp: latest.timestamp || null
        });
      }
      const samples = probes.flatMap(probe => probe.rttsMs);
      return {
        measurementId: id,
        country: countries[index],
        countryName: COUNTRIES[countries[index]],
        ready: probes.length > 0,
        probeCount: probes.length,
        averageRttMs: samples.length ? Math.round(samples.reduce((sum, value) => sum + value, 0) / samples.length * 100) / 100 : null,
        probes
      };
    } catch {
      return { measurementId: id, country: countries[index], countryName: COUNTRIES[countries[index]], ready: false, error: "Unable to retrieve RIPE Atlas results" };
    }
  }));

  return json({
    ok: true,
    checkedAt: new Date().toISOString(),
    results,
    note: "No results yet means probes have not reported or the measurement is still starting. RTT is measured from RIPE Atlas probes to the target, not from your iPhone VPN tunnel."
  });
}
