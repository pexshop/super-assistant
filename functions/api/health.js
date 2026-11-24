function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {
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

export async function onRequest({ request }) {
  if (request.method === "OPTIONS") return reply({}, 204);
  if (request.method !== "GET") return reply({ ok: false, error: "Method not allowed" }, 405);

  return reply({
    ok: true,
    service: "VPN Super API",
    version: "1.0.0",
    status: "operational",
    timestamp: new Date().toISOString(),
    edge: {
      colo: request.cf?.colo || null,
      country: request.cf?.country || null
    },
    endpoints: ["/api/health", "/api/probe", "/api/diagnostics"]
  });
}
