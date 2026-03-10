import { Hono } from "hono";
import { services } from "./registry";

// TODO: OAuth 2.1 via Authentik (like Gandalf ADR-042)
// 1. Add /.well-known/oauth-protected-resource endpoint → points to Authentik
// 2. Add JWT validation middleware (Authentik JWKS, scopes: mcp:read, mcp:tools)
// 3. Create Authentik Application: "AI Hub MCP" (public client, PKCE S256)
// 4. Config: MCP_OAUTH_ISSUER, MCP_OAUTH_JWKS_URL, MCP_OAUTH_AUDIENCE
// 5. Downstream services trust gateway — no individual auth needed
// See: Gandalf docs/architecture/adr-042-mcp-oauth-21-authentication.md
// See: https://github.com/cloudflare/workers-oauth-provider

type Env = {
  Bindings: Record<string, string>;
};

const app = new Hono<Env>();

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    services: Object.keys(services),
    timestamp: new Date().toISOString(),
  });
});

// List available MCP services with their tools
app.get("/services", (c) => {
  return c.json(
    Object.entries(services).map(([key, s]) => ({
      key,
      name: s.name,
      description: s.description,
      mcp: `${s.url}/mcp`,
      skills: s.skills,
      agents: s.agents,
    })),
  );
});

// Proxy MCP requests to downstream services
app.all("/:service/mcp", async (c) => {
  const serviceKey = c.req.param("service");
  const service = services[serviceKey];

  if (!service) {
    return c.json(
      { error: `Unknown service: ${serviceKey}`, available: Object.keys(services) },
      404,
    );
  }

  const targetUrl = `${service.url}/mcp`;
  const headers = new Headers(c.req.raw.headers);
  headers.set("Host", new URL(service.url).host);

  const res = await fetch(targetUrl, {
    method: c.req.method,
    headers,
    body: c.req.method !== "GET" ? c.req.raw.body : undefined,
  });

  return new Response(res.body, {
    status: res.status,
    headers: res.headers,
  });
});

// SSE proxy for MCP streaming
app.all("/:service/sse", async (c) => {
  const serviceKey = c.req.param("service");
  const service = services[serviceKey];

  if (!service) {
    return c.json({ error: `Unknown service: ${serviceKey}` }, 404);
  }

  const targetUrl = `${service.url}/sse`;
  const res = await fetch(targetUrl, {
    method: c.req.method,
    headers: c.req.raw.headers,
    body: c.req.method !== "GET" ? c.req.raw.body : undefined,
  });

  return new Response(res.body, {
    status: res.status,
    headers: res.headers,
  });
});

app.get("/", (c) => {
  return c.json({
    name: "Promova AI Hub Gateway",
    version: "0.1.0",
    docs: "GET /services — list MCP servers, skills, agents. GET /health — status.",
  });
});

export default app;