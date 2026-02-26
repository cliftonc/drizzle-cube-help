---
title: Agent Notebooks
description: Enable agentic AI notebooks with built-in data discovery, query execution, and visualization
---

Agent Notebooks add an agentic AI chat interface to your application. Users ask questions in natural language, and the agent autonomously discovers cubes, executes queries, and creates chart and markdown blocks — all within a notebook canvas.

The agent uses Claude (via `@anthropic-ai/sdk`) and streams results back to the client via Server-Sent Events (SSE). All queries run through your existing security context, so multi-tenant isolation is preserved automatically.

## How It Works

```
User Message → Adapter Endpoint → Claude (Anthropic API)
                     ↓                    ↓
            Security Context        Tool Use Loop
                     ↓                    ↓
              Semantic Layer ← discover / query / visualize
                     ↓
              SSE Stream → Client Notebook
```

The agent has access to five tools:

| Tool | Purpose |
|------|---------|
| `discover_cubes` | Find relevant cubes by topic or intent |
| `get_cube_metadata` | Get detailed cube schema (measures, dimensions, joins) |
| `execute_query` | Run a semantic query and return results |
| `add_portlet` | Create a chart visualization block |
| `add_markdown` | Create a text/analysis block |

## Prerequisites

1. **An Anthropic API key** — Get one at [console.anthropic.com](https://console.anthropic.com/)
2. **Working Cube API** — Your semantic layer and adapter should already be functional
3. **Install the Anthropic SDK** (optional peer dependency):

```bash
npm install @anthropic-ai/sdk
```

## Server Configuration

Add the `agent` option to your adapter configuration. This enables the `POST /cubejs-api/v1/agent/chat` endpoint, which runs behind your existing `extractSecurityContext` — no new auth surface is exposed.

### AgentConfig Options

```typescript
interface AgentConfig {
  /** Server-side Anthropic API key */
  apiKey?: string

  /** Model to use (default: 'claude-sonnet-4-6') */
  model?: string

  /** Maximum agentic turns per request (default: 25) */
  maxTurns?: number

  /** Maximum tokens per response (default: 4096) */
  maxTokens?: number

  /** Allow X-Agent-Api-Key header to override server apiKey */
  allowClientApiKey?: boolean
}
```

### Hono

```typescript
import { createCubeApp } from 'drizzle-cube/adapters/hono'

const app = createCubeApp({
  cubes: allCubes,
  drizzle: db,
  schema,
  extractSecurityContext: async (c) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '')
    const decoded = await verifyJWT(token)
    return { organisationId: decoded.orgId }
  },
  // Enable agent notebooks
  agent: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-6',
    maxTurns: 25
  }
})
```

### Express

```typescript
import { createCubeRouter } from 'drizzle-cube/adapters/express'

const router = createCubeRouter({
  cubes: allCubes,
  drizzle: db,
  schema,
  extractSecurityContext: async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    const decoded = await verifyJWT(token)
    return { organisationId: decoded.orgId }
  },
  agent: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-6',
    maxTurns: 25
  }
})

app.use('/', router)
```

### Fastify

```typescript
import { cubePlugin } from 'drizzle-cube/adapters/fastify'

await fastify.register(cubePlugin, {
  cubes: allCubes,
  drizzle: db,
  schema,
  extractSecurityContext: async (request) => {
    const token = request.headers.authorization?.replace('Bearer ', '')
    const decoded = await verifyJWT(token)
    return { organisationId: decoded.orgId }
  },
  agent: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-6',
    maxTurns: 25
  }
})
```

### Next.js (App Router)

```typescript
// lib/cube.ts
import { createCubeHandlers } from 'drizzle-cube/adapters/nextjs'

export const handlers = createCubeHandlers({
  cubes: allCubes,
  drizzle: db,
  schema,
  extractSecurityContext: async (request) => {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    const decoded = await verifyJWT(token)
    return { organisationId: decoded.orgId }
  },
  agent: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-6',
    maxTurns: 25
  }
})
```

Then wire the handler in your route file:

```typescript
// app/api/cubejs-api/v1/agent/chat/route.ts
import { handlers } from '@/lib/cube'

export const POST = handlers.agentChat
```

## API Key Management

There are two ways to provide the Anthropic API key:

### Server-Side Key (Recommended for Production)

Set the key in your adapter config. All requests use this key:

```typescript
agent: {
  apiKey: process.env.ANTHROPIC_API_KEY
}
```

### Client-Side Key Override (Development / Demo)

Allow the client to send its own API key via the `X-Agent-Api-Key` header. Useful for development or demo sites where users bring their own key:

```typescript
agent: {
  apiKey: process.env.ANTHROPIC_API_KEY,  // Fallback
  allowClientApiKey: true                  // Allow header override
}
```

The client sends the key as a header:

```typescript
<AgenticNotebook agentApiKey="sk-ant-..." />
```

:::caution
Only enable `allowClientApiKey` when you trust the client environment. In production, prefer server-side keys to avoid exposing API credentials.
:::

## CORS Configuration

If your client runs on a different origin, make sure `X-Agent-Api-Key` is in your CORS allowed headers:

```typescript
cors: {
  origin: ['http://localhost:5173'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Agent-Api-Key'],
  credentials: true
}
```

## Security Model

Agent notebooks inherit your existing security architecture:

1. **Authentication** — Every request to `/agent/chat` passes through `extractSecurityContext`, the same function used by `/load`, `/meta`, and all other endpoints
2. **Multi-tenant isolation** — The security context is passed to every tool call. When the agent runs `execute_query`, the query is filtered by your cube's `sql` function just like any other query
3. **API key gating** — Requests without a valid Anthropic API key return `401`
4. **Turn limits** — `maxTurns` prevents runaway agent loops (default: 25)

## SSE Event Types

The `/agent/chat` endpoint streams Server-Sent Events. Each event is a JSON object with `type` and `data` fields:

| Event | Description |
|-------|-------------|
| `text_delta` | Streaming text from the agent |
| `tool_use_start` | Agent is calling a tool (name + input) |
| `tool_use_result` | Tool returned a result |
| `add_portlet` | Agent created a chart visualization |
| `add_markdown` | Agent created a text/analysis block |
| `turn_complete` | An agentic turn finished (multi-turn conversations) |
| `done` | Agent finished, includes `sessionId` for follow-up |
| `error` | An error occurred |

## Environment Variables

```bash
# Required for agent notebooks
ANTHROPIC_API_KEY=sk-ant-api03-...
```

## Disabling the Endpoint

The agent endpoint is **only registered** when you provide the `agent` config. If you omit it, no new routes are added:

```typescript
// No agent endpoint — omit the agent option
const router = createCubeRouter({
  cubes: allCubes,
  drizzle: db,
  schema,
  extractSecurityContext
  // No agent option = no /agent/chat endpoint
})
```

## Troubleshooting

### "No API key configured" (401)

The endpoint requires an Anthropic API key. Either:
- Set `agent.apiKey` in your server config
- Enable `agent.allowClientApiKey` and send `X-Agent-Api-Key` header from the client

### "@anthropic-ai/sdk not found"

Install the optional peer dependency:

```bash
npm install @anthropic-ai/sdk
```

### Agent responses are slow

- Try a faster model: `model: 'claude-haiku-4-5-20251001'`
- Reduce `maxTurns` to limit the number of tool-use rounds
- Reduce `maxTokens` to limit response length

### Agent can't find my cubes

Make sure your cubes have descriptive `title` and `description` fields. The agent uses [semantic metadata](/ai/semantic-metadata/) to understand your data:

```typescript
const salesCube = defineCube('Sales', {
  title: 'Sales Transactions',
  description: 'Revenue data including orders, refunds, and discounts',
  // ...
})
```

## Next Steps

- [Client Integration](/client/agent-notebooks/) — Add the `AgenticNotebook` component to your React app
- [Semantic Metadata](/ai/semantic-metadata/) — Make your cubes AI-friendly with titles and descriptions
- [MCP Endpoints](/ai/mcp-endpoints/) — Alternative AI integration using the MCP protocol
