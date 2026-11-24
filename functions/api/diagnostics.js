const TARGETS = [
  ["cloudflare", "https://www.cloudflare.com/cdn-cgi/trace"],
  ["google", "https://www.google.com/generate_204"],
  ["ipify", "https://api.ipify.org?format=json"],
  ["ipapi", "https://ipapi.co/json/"],
  ["doh_cloudflare", "https://cloudflare-dns.com/dns-query?name=example.com&type=A"],
  ["doh_google", "https://dns.google/resolve?name=example.com&type=A"],
  ["speed", "https://speed.cloudflare.com/__down?bytes=100000"]
];

function reply(data, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}

async function checkTarget(id, url) {
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "VPN-Super-API/1.0",
        ...(id.startsWith("doh_") ? { accept: "application/dns-json" } : {})
      }
    });

    let dnsStatus = null;
    let dnsAnswers = null;
    if (id.startsWith("doh_") && response.ok) {
      const result = await response.json();
      dnsStatus = Number.isInteger(result.Status) ? result.Status : null;
      dnsAnswers = Array.isArray(result.Answer) ? result.Answer.length : 0;
    }

    const ok = response.ok && (dnsStatus === null || dnsStatus === 0);
    return {
      id,
      ok,
      httpStatus: response.status,
      latencyMs: Date.now() - started,
      ...(id.startsWith("doh_") ? { dnsStatus, dnsAnswers } : {})
    };
  } catch (error) {
    return {
      id,
      ok: false,
      latencyMs: Date.now() - started,
      error: error?.name === "AbortError" ? "timeout" : "upstream_request_failed"
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function onRequest({ request }) {
  if (request.method === "OPTIONS") return reply({}, 204);
  if (request.method !== "GET") return reply({ ok: false, error: "Method not allowed" }, 405);

  const started = Date.now();
  const results = await Promise.all(TARGETS.map(([id, url]) => checkTarget(id, url)));
  const passed = results.filter(item => item.ok).length;

  return reply({
    ok: passed === results.length,
    service: "VPN Super API",
    checkedAt: new Date().toISOString(),
    edge: {
      colo: request.cf?.colo || null,
      country: request.cf?.country || null
    },
    summary: {
      total: results.length,
      passed,
      failed: results.length - passed,
      durationMs: Date.now() - started
    },
    results,
    limitations: [
      "Checks run from the Cloudflare edge handling this request, not from worldwide probe locations.",
      "These checks do not reveal private VPN provider nodes or prove that a VPN tunnel is active.",
      "DNS checks query public DNS-over-HTTPS services for example.com; they are not a device DNS-leak audit."
    ]
  }, passed === results.length ? 200 : 207);
}
