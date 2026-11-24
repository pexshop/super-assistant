const TARGETS = {
  cloudflare: "https://www.cloudflare.com/cdn-cgi/trace",
  ipify: "https://api.ipify.org?format=json",
  speed: "https://speed.cloudflare.com/__down?bytes=100000"
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
      headers: { "user-agent": "VPN-Super-Assistant-Probe/1.0" }
    });

    return json({
      ok: upstream.ok,
      target,
      upstreamStatus: upstream.status,
      latencyMs: Date.now() - started,
      edgeColo: request.cf?.colo || null,
      country: request.cf?.country || null,
      checkedAt: new Date().toISOString()
    }, upstream.ok ? 200 : 502);
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
