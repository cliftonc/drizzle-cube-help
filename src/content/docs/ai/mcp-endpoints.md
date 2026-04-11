---
title: MCP Server (AI-Ready Data Layer)
description: Connect AI agents to your semantic layer using the Model Context Protocol
---

Drizzle Cube includes a **built-in MCP server** that lets AI agents like Claude, ChatGPT, and n8n query your semantic layer directly. The server follows the [Model Context Protocol specification](https://modelcontextprotocol.io/) and exposes tools for discovering cubes, validating queries, and executing them.

:::caution[No Built-in Authentication]
The MCP server does **not** include built-in authentication. Your application is responsible for authenticating requests before they reach the MCP endpoint, just as with the standard Cube API routes. Without authentication middleware, **all MCP tools are publicly accessible** — including query execution via `load`.

See [Security — Authentication Requirements](/semantic-layer/security/#authentication-requirements) and the [framework-specific examples](#protecting-mcp-endpoints) below.
:::

## MCP Server Endpoint

All framework adapters expose an MCP server at `/mcp`:

```
https://your-app.com/mcp
```

This endpoint implements the full MCP specification including:
- **Tools** - Functions the AI can call
- **Prompts** - Pre-built prompts for common tasks
- **Server-Sent Events (SSE)** - For streaming responses

## Available MCP Tools

The built-in `/mcp` endpoint exposes these tools:

| Tool | Purpose |
|------|---------|
| `discover` | Find relevant cubes based on topic or intent. Also returns the full query language reference and date-filtering guide (see [How guidance reaches the model](#how-guidance-reaches-the-model) below). |
| `validate` | Validate queries and get auto-corrections |
| `load` | Execute queries and return data |
| `chart` | Execute queries with interactive chart visualization (only registered when [MCP App](/ai/mcp-app/) is enabled) |

:::note[Tool naming]
These are the names used by the built-in `/mcp` endpoint. If you're using the [composable `getCubeTools()` API](/ai/composable-mcp-tools/) to add cube tools to your own MCP server, the tools default to a `drizzle_cube_` prefix (e.g. `drizzle_cube_discover`) — that prefix is configurable per-deployment.
:::

## How guidance reaches the model

A common surprise: the model often *ignores* MCP prompts and resources. That isn't a Drizzle Cube bug — it's how most clients work. Claude Desktop, Claude Code, and many other MCP clients treat `prompts/*` and `resources/*` as **user-triggered slash commands**, not as actions the LLM can invoke mid-turn. So if you put critical query rules into a prompt and hope the model fetches it, you'll be disappointed.

Drizzle Cube uses two channels that are guaranteed to reach the model:

1. **`InitializeResult.instructions`** — a short, authoritative string returned during the MCP `initialize` handshake. Per the [MCP spec](https://modelcontextprotocol.io/specification/draft/schema#initializeresult-instructions), clients merge this into the LLM system prompt. The default content mandates the discover-first workflow and inlines the most-violated rule (use `inDateRange` for aggregated totals, **not** `timeDimensions`). You can customise it — see the [`instructions` option](#instructions).
2. **The `discover` tool response itself** — `discover` always returns three fields: `cubes`, `queryLanguageReference`, and `dateFilteringGuide`. Because the workflow mandates calling `discover` first, the model receives the full TypeScript DSL on its very first tool call without an extra round-trip:

   ```jsonc
   // tools/call name=discover { topic: "salary" }
   {
     "cubes": [ /* matched cubes with measures, dimensions, joins */ ],
     "queryLanguageReference": "// === DRIZZLE CUBE QUERY LANGUAGE (TypeScript DSL) ===\n…",
     "dateFilteringGuide": "# Date Filtering vs Time Grouping\n…"
   }
   ```

The existing `prompts/*` and `resources/*` endpoints are still exposed for clients (and end-users) that *do* consume them, but query correctness no longer depends on them.

## Connecting AI Tools

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "your-app-analytics": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-remote", "https://your-app.com/mcp"]
    }
  }
}
```

**With authentication** (recommended for production):

```json
{
  "mcpServers": {
    "your-app-analytics": {
      "command": "npx",
      "args": [
        "-y", "@anthropic/mcp-remote",
        "https://your-app.com/mcp",
        "--header", "Authorization: Bearer YOUR_TOKEN"
      ]
    }
  }
}
```

### Claude Code

```bash
claude mcp add --transport http analytics https://your-app.com/mcp \
  --header "Authorization: Bearer YOUR_TOKEN"
```

### Claude.ai (Web)

1. Go to **Settings → Connectors → Add Connector**
2. Enter your MCP server URL: `https://your-app.com/mcp`
3. The tools will be available in your conversations

Claude.ai connectors support **OAuth 2.1** — if your MCP endpoint has an OAuth discovery document, Claude.ai will handle the auth flow automatically. You can also pass an `authorization_token` via the Messages API MCP connector for programmatic access.

### ChatGPT

1. Go to **Settings → Connectors → Advanced → Developer Mode**
2. Add your MCP server URL: `https://your-app.com/mcp`
3. The tools will be available in ChatGPT

:::note
ChatGPT connectors require **OAuth authentication** — static API keys are not supported. Configure an OAuth provider (Auth0, Okta, etc.) for your MCP endpoint.
:::

### n8n

Use the **MCP Client** node:

1. Add an MCP Client node to your workflow
2. Set the server URL: `https://your-app.com/mcp`
3. Connect it to an AI Agent node

See [n8n MCP Client documentation](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.mcpclienttool/) for details.

## The AI Workflow

When an AI agent connects to your MCP server, it follows this workflow (mandated by the default `instructions` and reinforced by every tool description):

```
User: "Show me average salary by department"
         │
         ▼
┌────────────────────────────────────────────────────────┐
│  1. discover  ← MANDATORY first call                   │
│     Find cubes related to "salary" and "department"    │
│     → Returns: matched cubes (measures, dimensions,    │
│       joins) + queryLanguageReference (full DSL)       │
│       + dateFilteringGuide (decision tree)             │
└────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│  2. AI builds query using the discover response        │
│     Uses cube metadata + queryLanguageReference        │
│     → Query: { measures: ['Employees.avgSalary'],      │
│                dimensions: ['Departments.name'] }      │
└────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│  3. validate (optional)                                │
│     Check query validity, get corrections if needed    │
│     → Returns: { isValid: true, correctedQuery }       │
└────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│  4a. load                                              │
│      Execute query, return data as text                │
│      → Returns: { data: [...], annotation: {...} }     │
│                                                        │
│  4b. chart  (when MCP App is enabled)                  │
│      Execute query + render interactive chart          │
│      → Returns: data + MCP App visualization           │
└────────────────────────────────────────────────────────┘
```

## Tool Reference

### `discover`

Find cubes relevant to a topic or intent. **The first call any agent should make** — and the only way the model receives the full query language reference.

```json
// Parameters
{
  "topic": "salary",
  "intent": "I want to analyze compensation",
  "limit": 5,
  "minScore": 0.3
}

// Response
{
  "cubes": [
    {
      "cube": "Employees",
      "relevanceScore": 0.85,
      "matchedOn": ["measure:avgSalary", "measure:totalSalary"],
      "suggestedMeasures": ["Employees.avgSalary", "Employees.totalSalary"],
      "suggestedDimensions": ["Employees.department", "Employees.location"],
      "capabilities": { "query": true, "funnel": false, "flow": false, "retention": false }
    }
  ],
  "queryLanguageReference": "// === DRIZZLE CUBE QUERY LANGUAGE (TypeScript DSL) ===\n…",
  "dateFilteringGuide": "# Date Filtering vs Time Grouping\n…"
}
```

The `queryLanguageReference` and `dateFilteringGuide` fields are always included so the model has the full DSL and the date-filtering decision tree available before constructing a query. See [How guidance reaches the model](#how-guidance-reaches-the-model).

### `validate`

Validate a query and get helpful corrections.

```json
// Parameters
{
  "query": {
    "measures": ["Employees.cont"],
    "dimensions": ["Departments.nam"]
  }
}

// Response
{
  "isValid": false,
  "errors": [
    "Unknown measure 'Employees.cont' - did you mean 'Employees.count'?",
    "Unknown dimension 'Departments.nam' - did you mean 'Departments.name'?"
  ],
  "correctedQuery": {
    "measures": ["Employees.count"],
    "dimensions": ["Departments.name"]
  }
}
```

### `load`

Execute a query and return results. The tool description gates this on `discover` having been called first.

```json
// Parameters
{
  "query": {
    "measures": ["Employees.count", "Employees.avgSalary"],
    "dimensions": ["Departments.name"]
  }
}

// Response
{
  "data": [
    { "Departments.name": "Engineering", "Employees.count": 45, "Employees.avgSalary": 125000 },
    { "Departments.name": "Sales", "Employees.count": 32, "Employees.avgSalary": 85000 }
  ],
  "annotation": {
    "measures": {
      "Employees.count": { "title": "Total Employees", "type": "count" },
      "Employees.avgSalary": { "title": "Average Salary", "type": "avg" }
    },
    "dimensions": {
      "Departments.name": { "title": "Department Name", "type": "string" }
    }
  }
}
```

### `chart`

Execute a query and render an interactive chart. Same query format as `load`, with an optional `chart` hint to control the visualization. Only registered when [MCP App](/ai/mcp-app/) is enabled (`mcp: { app: true }`).

```json
// Parameters
{
  "query": {
    "measures": ["Employees.count"],
    "dimensions": ["Departments.name"]
  },
  "chart": {
    "type": "pie",
    "title": "Employees by Department",
    "chartConfig": {
      "xAxis": ["Departments.name"],
      "yAxis": ["Employees.count"]
    }
  }
}
```

If no `chart` hint is provided, the chart type is auto-selected based on the query shape. See [MCP App](/ai/mcp-app/) for chart types and configuration details.

## Configuration

The built-in MCP server is configured via the `mcp` option on every adapter (`createCubeRouter` for Express, `cubePlugin` for Fastify, `createCubeRoutes` for Hono, `createCubeHandlers` for Next.js). All fields are optional — pass `mcp: { enabled: false }` to disable the endpoint entirely.

### Options reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Disable to remove the `/mcp` endpoint entirely. |
| `basePath` | `string` | `'/mcp'` | URL path the endpoint is mounted at. |
| `tools` | `Array<'discover' \| 'validate' \| 'load'>` | all | Selectively expose tools (the `chart` tool is controlled by the `app` option below). |
| `allowedOrigins` | `string[]` | unrestricted | Origin allowlist enforced per the MCP 2025-11-25 spec. Recommended in production. |
| `serverName` | `string` | `'drizzle-cube'` | Returned in `serverInfo.name` during the MCP `initialize` handshake. Override to match your product branding. |
| `instructions` | `string \| (defaults: string) => string` | built-in | Override or extend the `InitializeResult.instructions` returned during `initialize`. **This is the only string the MCP spec expects clients to merge into the LLM system prompt** — see [Customising the model's instructions](#customising-the-models-instructions). |
| `prompts` | `MCPPrompt[] \| (defaults: MCPPrompt[]) => MCPPrompt[]` | built-in | Override or extend the prompts exposed via `prompts/list` and `prompts/get`. Useful for clients (or end-users) that consume prompts as slash commands. |
| `resources` | `MCPResource[] \| (defaults: MCPResource[]) => MCPResource[]` | built-in | Override or extend the resources exposed via `resources/list` and `resources/read`. The live cube schema (`drizzle-cube://schema`) is appended automatically. |
| `app` | `boolean \| McpAppConfig` | `false` | Enable the [MCP App](/ai/mcp-app/) interactive chart visualisation and register the `chart` tool. Pass an object to set locale options. |
| `resourceMetadataUrl` | `string` | — | OAuth 2.1 Protected Resource Metadata URL ([RFC 9728](https://tools.ietf.org/html/rfc9728)). When set, requests without a Bearer token receive `401` with a `WWW-Authenticate` challenge pointing here. Token validation remains the responsibility of `extractSecurityContext`. |

### Disabling MCP

```typescript
createCubeRouter({
  // ... other options
  mcp: {
    enabled: false
  }
})
```

### Selective tool exposure

```typescript
createCubeRouter({
  // ... other options
  mcp: {
    enabled: true,
    tools: ['discover', 'validate', 'load']  // hide chart, etc.
  }
})
```

### Origin restrictions

Restrict which origins can connect to your MCP server (per MCP 2025-11-25 — required when serving browsers in production):

```typescript
createCubeRouter({
  mcp: {
    enabled: true,
    allowedOrigins: ['https://claude.ai', 'https://chat.openai.com']
  }
})
```

### Branding the server name

```typescript
createCubeRouter({
  mcp: {
    enabled: true,
    serverName: 'Acme Analytics'  // appears as serverInfo.name in initialize
  }
})
```

### Customising the model's instructions

Per the [MCP spec](https://modelcontextprotocol.io/specification/draft/schema#initializeresult-instructions), the server returns an `instructions` string during `initialize` that clients merge into the LLM system prompt. Drizzle Cube ships with sensible defaults that mandate the discover-first workflow and inline the most-violated date-filtering rule, but you'll often want to add **project-specific** guidance (cube semantics, naming conventions, business rules).

**Append to the defaults** (recommended — keeps the built-in workflow rules in place):

```typescript
createCubeRouter({
  mcp: {
    instructions: (defaults) => `${defaults}

## Acme-specific rules
- Always join Sales with Customers via customerId for revenue analysis.
- The "Region" cube has been deprecated — use "Territories" instead.
- Quarterly reports use fiscal-year quarters, not calendar quarters.`
  }
})
```

**Replace the defaults entirely** (advanced — you take full responsibility for telling the model how to use the server):

```typescript
createCubeRouter({
  mcp: {
    instructions: 'You are an analytics agent for Acme. Always call discover first…'
  }
})
```

:::tip[Keep instructions short]
Some clients truncate long instruction blocks. Aim for under ~2 KB. Put the most important rules first. Anything you can't fit here can go in the cube descriptions, the [`semantic-metadata`](/ai/semantic-metadata/) on each measure/dimension, or as a custom MCP prompt.
:::

### Customising prompts and resources

The `prompts/*` and `resources/*` endpoints are useful for clients that surface prompts as user-triggered slash commands (and for introspection). Override or extend them with the same resolver pattern:

```typescript
import type { MCPPrompt, MCPResource } from 'drizzle-cube/adapters/mcp-transport'

createCubeRouter({
  mcp: {
    prompts: (defaults) => [
      ...defaults,
      {
        name: 'acme-revenue-report',
        description: 'Build the standard monthly revenue report',
        messages: [{
          role: 'user',
          content: { type: 'text', text: 'Generate a revenue report grouped by region…' }
        }]
      }
    ],
    resources: (defaults) => [
      ...defaults,
      {
        uri: 'acme://kpis',
        name: 'Acme KPI definitions',
        description: 'Plain-language definitions of every Acme KPI',
        mimeType: 'text/markdown',
        text: '# Acme KPIs\n…'
      }
    ]
  }
})
```

:::caution[Don't rely on prompts for correctness]
Most clients (including Claude Desktop and Claude Code) do **not** forward `prompts/*` content to the model — they expose them as user-triggered slash commands instead. Use prompts for end-user discoverability, but keep your **mandatory** rules in `instructions` (or in the cube metadata) so the model actually sees them. See [How guidance reaches the model](#how-guidance-reaches-the-model).
:::

### Enabling interactive charts (MCP App)

Enable the `chart` tool and serve the interactive visualisation UI to compatible clients:

```typescript
createCubeRouter({
  mcp: {
    enabled: true,
    app: true  // or { defaultLocale: 'nl-NL', detectBrowserLocale: false }
  }
})
```

See [MCP App](/ai/mcp-app/) for the full guide.

### OAuth Protected Resource Metadata

Point clients at your authorisation server via [RFC 9728](https://tools.ietf.org/html/rfc9728):

```typescript
createCubeRouter({
  mcp: {
    enabled: true,
    resourceMetadataUrl: 'https://your-app.com/.well-known/oauth-protected-resource'
  }
})
```

When `resourceMetadataUrl` is set, requests without a `Authorization: Bearer …` token receive `401` with a `WWW-Authenticate` header pointing at the metadata document. Token validation itself is up to your `extractSecurityContext`. See [drizby](https://github.com/cliftonc/drizby) for a complete OAuth 2.1 reference implementation.

## Security & Authentication

> **Important**: The MCP server does **not** include built-in authentication. You are responsible for adding authentication middleware, just like with the standard Cube API routes.

### How It Works

The MCP endpoint (`/mcp`) is just an HTTP POST route — standard auth middleware protects it exactly like any other route. The complete flow is:

1. **Middleware authenticates** the request (validates token, session, etc.)
2. **`extractSecurityContext`** extracts the user's identity and permissions
3. **Cube security filters** scope all data access to the authenticated user's tenant

### Protecting MCP Endpoints

Apply authentication middleware **before** mounting the cube router. Here are examples for each framework:

#### Express

```typescript
import express from 'express'
import { createCubeRouter } from 'drizzle-cube/adapters/express'

const app = express()

// Auth middleware protects ALL routes including /mcp
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  req.user = await validateToken(token)
  next()
})

// Both /cubejs-api/v1/* AND /mcp are now protected
app.use('/', createCubeRouter({
  cubes: [employeesCube],
  drizzle: db,
  schema,
  extractSecurityContext: async (req) => ({
    organisationId: req.user.orgId,
    userId: req.user.id
  })
}))
```

#### Hono

```typescript
import { Hono } from 'hono'
import { createCubeRoutes } from 'drizzle-cube/adapters/hono'

const app = new Hono()

// Auth middleware protects ALL routes including /mcp
app.use('*', async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)
  const user = await validateToken(token)
  c.set('user', user)
  await next()
})

// Cube routes (including MCP) are now protected
app.route('/', createCubeRoutes({
  cubes: [employeesCube],
  drizzle: db,
  schema,
  extractSecurityContext: async (c) => ({
    organisationId: c.get('user').orgId,
    userId: c.get('user').id
  })
}))
```

#### Fastify

```typescript
import Fastify from 'fastify'
import { registerCubeRoutes } from 'drizzle-cube/adapters/fastify'

const fastify = Fastify()

// Auth hook protects ALL routes including /mcp
fastify.addHook('onRequest', async (request, reply) => {
  const token = request.headers.authorization?.replace('Bearer ', '')
  if (!token) return reply.code(401).send({ error: 'Unauthorized' })
  request.user = await validateToken(token)
})

await registerCubeRoutes(fastify, {
  cubes: [employeesCube],
  drizzle: db,
  schema,
  extractSecurityContext: async (req) => ({
    organisationId: req.user.orgId,
    userId: req.user.id
  })
})
```

#### Next.js

```typescript
// In Next.js, validate auth inside extractSecurityContext
// since there's no separate middleware layer for API routes

export const cubeHandlers = createCubeHandlers({
  cubes: [employeesCube],
  drizzle: db,
  schema,
  extractSecurityContext: async (req) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) throw new Error('Unauthorized')
    const user = await validateToken(token)
    return {
      organisationId: user.orgId,
      userId: user.id
    }
  }
})
```

### OAuth 2.1 Authentication (Reference Implementation)

For production MCP servers that need to work with Claude.ai connectors, ChatGPT, or other clients requiring OAuth, see [drizby](https://github.com/cliftonc/drizby) — an open-source analytics app built on drizzle-cube that implements full OAuth 2.1 for MCP authentication.

The implementation includes:

- **OAuth 2.1 with PKCE** (S256 required) via [`@jmondi/oauth2-server`](https://jmondi.dev/oauth2-server/)
- **Dynamic Client Registration** ([RFC 7591](https://tools.ietf.org/html/rfc7591))
- **Authorization Server Metadata** ([RFC 8414](https://tools.ietf.org/html/rfc8414))
- **Protected Resource Metadata** ([RFC 9728](https://tools.ietf.org/html/rfc9728))
- **Token revocation** and **refresh tokens**

Key files:
- [`src/routes/oauth.ts`](https://github.com/cliftonc/drizby/blob/main/src/routes/oauth.ts) — OAuth endpoints (authorize, token, register, revoke)
- [`src/auth/oauth-repositories.ts`](https://github.com/cliftonc/drizby/blob/main/src/auth/oauth-repositories.ts) — Drizzle-backed token/client storage
- [`src/auth/middleware.ts`](https://github.com/cliftonc/drizby/blob/main/src/auth/middleware.ts) — Unified auth middleware (OAuth Bearer + session cookies)
- [`app.ts`](https://github.com/cliftonc/drizby/blob/main/app.ts) — MCP + OAuth integration with `extractSecurityContext`

### Security Context Enforcement

All MCP tools respect your security context:

- `load` and `chart` execute queries with the authenticated user's security context
- `discover` returns cube metadata (schema information) — access is gated by your auth middleware
- Multi-tenant isolation is enforced on all data access via cube `sql` filters

## Enhancing AI Discovery

The MCP tools work best when your cubes have rich semantic metadata. See [Adding Semantic Metadata](/ai/semantic-metadata/) for how to add:

- **Descriptions** for cubes, measures, and dimensions
- **Synonyms** for alternate names ("revenue" → "sales", "income")
- **Example questions** that help AI understand the cube's purpose

## Try It Live

Connect to the demo MCP server to try it out:

```
https://try.drizzle-cube.dev/mcp
```

## Adding Tools to an Existing MCP Server

If you already have an MCP server (e.g., a PostgREST MCP for CRUD operations) and want to add drizzle-cube's analytics tools alongside your existing tools, see [Composable MCP Tools](/ai/composable-mcp-tools/). This lets you register `discover`, `validate`, `load`, and `chart` on any MCP server without running the built-in `/mcp` endpoint.

## Next Steps

- [Composable MCP Tools](/ai/composable-mcp-tools/) - Add cube tools to your own MCP server
- [Adding Semantic Metadata](/ai/semantic-metadata/) - Make your cubes more discoverable
- [Claude Desktop Setup](/ai/claude-desktop-setup/) - Connect Claude Desktop to your data
- [Claude Code Plugin](/ai/claude-code-plugin/) - Query from Claude Code
