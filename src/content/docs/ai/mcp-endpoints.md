---
title: MCP Server (AI-Ready Data Layer)
description: Connect AI agents to your semantic layer using the Model Context Protocol
---

Drizzle Cube includes a **built-in MCP server** that lets AI agents like Claude, ChatGPT, and n8n query your semantic layer directly. The server follows the [Model Context Protocol specification](https://modelcontextprotocol.io/) and exposes tools for discovering cubes, validating queries, and executing them.

:::caution[No Built-in Authentication]
The MCP server does **not** include built-in authentication. Your application is responsible for authenticating requests before they reach the MCP endpoint, just as with the standard Cube API routes. Without authentication middleware, **all MCP tools are publicly accessible** — including query execution via `drizzle_cube_load`.

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

| Tool | Purpose |
|------|---------|
| `drizzle_cube_discover` | Find relevant cubes based on topic or intent |
| `drizzle_cube_validate` | Validate queries and get auto-corrections |
| `drizzle_cube_load` | Execute queries and return data |
| `drizzle_cube_chart` | Execute queries with interactive chart visualization |

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

When an AI agent connects to your MCP server, it typically follows this workflow:

```
User: "Show me average salary by department"
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  1. drizzle_cube_discover                           │
│     Find cubes related to "salary" and "department" │
│     → Returns: Employees, Departments cubes with    │
│       suggested measures and dimensions             │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  2. AI builds query using metadata                  │
│     The AI uses cube metadata to construct a query  │
│     → Query: { measures: ['Employees.avgSalary'],   │
│                dimensions: ['Departments.name'] }   │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  3. drizzle_cube_validate (optional)                │
│     Check query validity, get corrections if needed │
│     → Returns: { isValid: true, correctedQuery }    │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  4a. drizzle_cube_load                              │
│      Execute query, return data as text             │
│      → Returns: { data: [...], annotation: {...} }  │
│                                                     │
│  4b. drizzle_cube_chart (alternative)               │
│      Execute query + render interactive chart       │
│      → Returns: data + MCP App visualization        │
└─────────────────────────────────────────────────────┘
```

## Tool Reference

### drizzle_cube_discover

Find cubes relevant to a topic or intent.

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
      "suggestedDimensions": ["Employees.department", "Employees.location"]
    }
  ]
}
```

### drizzle_cube_validate

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

### drizzle_cube_load

Execute a query and return results.

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

### drizzle_cube_chart

Execute a query and render an interactive chart. Same query format as `load`, with an optional `chart` hint to control the visualization.

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

### Disabling MCP

If you don't want the MCP server exposed:

```typescript
createCubeRouter({
  // ... other options
  mcp: {
    enabled: false
  }
})
```

### Selective Tool Exposure

Expose only specific MCP tools:

```typescript
createCubeRouter({
  // ... other options
  mcp: {
    enabled: true,
    tools: ['discover', 'validate', 'load', 'chart']  // Only expose these
  }
})
```

### Origin Restrictions

Restrict which origins can connect to your MCP server:

```typescript
createCubeRouter({
  // ... other options
  mcp: {
    enabled: true,
    allowedOrigins: ['https://claude.ai', 'https://chat.openai.com']
  }
})
```

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

- `drizzle_cube_load` and `drizzle_cube_chart` execute queries with the authenticated user's security context
- `drizzle_cube_discover` returns cube metadata (schema information) — access is gated by your auth middleware
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
