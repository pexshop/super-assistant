const TARGETS = {
  cloudflare: "https://www.cloudflare.com/cdn-cgi/trace",
  ipify: "https://api.ipify.org?format=json",
  speed: "https://speed.cloudflare.com/__down?bytes=100000",
  google: "https://www.google.com/generate_204",
  ipapi: "https://ipapi.co/json/",
  doh_cloudflare: "https://cloudflare-dns.com/dns-query?name=example.com&type=A",
  doh_google: "https://dns.google/resolve?name=example.com&type=A"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);

  const url = new URL(request.url);
  const target = url.searchParams.get("target") || "cloudflare";
  const destination = TARGETS[target];
  if (!destination) {
    return json({ ok: false, error: "Unsupported target", allowedTargets: Object.keys(TARGETS) }, 400);
  }

  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const upstream = await fetch(destination, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "VPN-Super-Assistant-Probe/1.0",
        ...(target.startsWith("doh_") ? { "accept": "application/dns-json" } : {})
      }
    });

    let dnsStatus = null;
    let dnsAnswers = null;
    if (target.startsWith("doh_") && upstream.ok) {
      const dnsResult = await upstream.json();
      dnsStatus = Number.isInteger(dnsResult.Status) ? dnsResult.Status : null;
      dnsAnswers = Array.isArray(dnsResult.Answer) ? dnsResult.Answer.length : 0;
    }
    const successful = upstream.ok && (dnsStatus === null || dnsStatus === 0);
    return json({
      ok: successful,
      target,
      upstreamStatus: upstream.status,
      dnsStatus,
      dnsAnswers,
      latencyMs: Date.now() - started,
      edgeColo: request.cf?.colo || null,
      country: request.cf?.country || null,
      checkedAt: new Date().toISOString()
    }, successful ? 200 : 502);
  } catch (error) {
    return json({
      ok: false,
      target,
      error: error?.name === "AbortError" ? "Upstream timeout" : "Upstream request failed",
      latencyMs: Date.now() - started,
      edgeColo: request.cf?.colo || null,
      country: request.cf?.country || null,
      checkedAt: new Date().toISOString()
    }, 502);
  } finally {
    clearTimeout(timeout);
  }
}
