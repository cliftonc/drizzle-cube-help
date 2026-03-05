---
title: Agent Notebooks
description: Enable agentic AI notebooks with built-in data discovery, query execution, and visualization
---

Agent Notebooks add an agentic AI chat interface to your application. Users ask questions in natural language, and the agent autonomously discovers cubes, executes queries, and creates chart and markdown blocks — all within a notebook canvas.

The agent supports multiple LLM providers — **Anthropic Claude**, **OpenAI**, **Google Gemini**, and any **OpenAI-compatible** service (Groq, Together, Mistral, Ollama, etc.). Results stream back to the client via Server-Sent Events (SSE). All queries run through your existing security context, so multi-tenant isolation is preserved automatically.

## How It Works

```
User Message → Adapter Endpoint → LLM Provider (Anthropic / OpenAI / Google)
                     ↓                    ↓
            Security Context        Tool Use Loop
                     ↓                    ↓
              Semantic Layer ← discover / query / visualize
                     ↓
              SSE Stream → Client Notebook
```

The agent has access to six tools:

| Tool | Purpose |
|------|---------|
| `discover_cubes` | Find relevant cubes by topic or intent |
| `get_cube_metadata` | Get detailed cube schema (measures, dimensions, joins) |
| `execute_query` | Run a semantic query and return results |
| `add_portlet` | Create a chart visualization block |
| `add_markdown` | Create a text/analysis block |
| `save_as_dashboard` | Convert notebook portlets into a persistent dashboard layout |

## Prerequisites

1. **An API key** for your chosen provider:
   - **Anthropic** — [console.anthropic.com](https://console.anthropic.com/)
   - **OpenAI** — [platform.openai.com](https://platform.openai.com/)
   - **Google** — [aistudio.google.com](https://aistudio.google.com/)
2. **Working Cube API** — Your semantic layer and adapter should already be functional
3. **Install the provider SDK** (optional peer dependency — install only the one you need):

```bash
# Anthropic (default)
npm install @anthropic-ai/sdk

# OpenAI (also covers Groq, Together, Mistral, Ollama)
npm install openai

# Google Gemini
npm install @google/generative-ai
```

## Server Configuration

Add the `agent` option to your adapter configuration. This enables the `POST /cubejs-api/v1/agent/chat` endpoint, which runs behind your existing `extractSecurityContext` — no new auth surface is exposed.

### AgentConfig Options

```typescript
interface AgentConfig {
  /**
   * LLM provider to use (default: 'anthropic').
   * - 'anthropic': Claude models via @anthropic-ai/sdk
   * - 'openai': OpenAI models via openai SDK (also Groq, Together, Mistral, Ollama via baseURL)
   * - 'google': Gemini models via @google/generative-ai
   */
  provider?: 'anthropic' | 'openai' | 'google'

  /**
   * Base URL for OpenAI-compatible providers.
   * Only used when provider is 'openai'. Examples:
   * - Groq: 'https://api.groq.com/openai/v1'
   * - Together: 'https://api.together.xyz/v1'
   * - Ollama: 'http://localhost:11434/v1'
   */
  baseURL?: string

  /** Server-side API key for the selected provider */
  apiKey?: string

  /**
   * Model to use. Default depends on provider:
   * - Anthropic: 'claude-sonnet-4-6'
   * - OpenAI: 'gpt-4.1-mini'
   * - Google: 'gemini-3-flash-preview'
   */
  model?: string

  /** Maximum agentic turns per request (default: 25) */
  maxTurns?: number

  /** Maximum tokens per response (default: 4096) */
  maxTokens?: number

  /** Allow X-Agent-Api-Key header to override server apiKey */
  allowClientApiKey?: boolean

  /** Build per-request system context from the authenticated security context */
  buildSystemContext?: (securityContext: Record<string, unknown>) => string | undefined
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

### Provider Examples

The examples above all use the default Anthropic provider. Here's how to configure other providers:

```typescript
// OpenAI
agent: {
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4.1-mini',  // optional — this is the default
}

// Google Gemini
agent: {
  provider: 'google',
  apiKey: process.env.GOOGLE_AI_API_KEY,
  model: 'gemini-3-flash-preview',  // optional — this is the default
}

// Groq (OpenAI-compatible)
agent: {
  provider: 'openai',
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
  model: 'llama-3.3-70b-versatile',
}

// Together AI (OpenAI-compatible)
agent: {
  provider: 'openai',
  apiKey: process.env.TOGETHER_API_KEY,
  baseURL: 'https://api.together.xyz/v1',
  model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
}

// Ollama (local, OpenAI-compatible)
agent: {
  provider: 'openai',
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama',  // Ollama doesn't need a real key
  model: 'llama3.1',
}
```

## API Key Management

There are two ways to provide the API key:

### Server-Side Key (Recommended for Production)

Set the key in your adapter config. All requests use this key:

```typescript
agent: {
  apiKey: process.env.ANTHROPIC_API_KEY
}
```

### Client-Side Key Override (Development / Demo)

Allow the client to send its own API key via the `X-Agent-Api-Key` header. Useful for development or demo sites where users bring their own key. The client can also override the provider, model, and base URL via headers (`X-Agent-Provider`, `X-Agent-Model`, `X-Agent-Base-URL`):

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

If your client runs on a different origin, make sure the agent headers are in your CORS allowed headers:

```typescript
cors: {
  origin: ['http://localhost:5173'],
  allowHeaders: [
    'Content-Type', 'Authorization',
    'X-Agent-Api-Key', 'X-Agent-Provider', 'X-Agent-Model', 'X-Agent-Base-URL'
  ],
  credentials: true
}
```

## Security Model

Agent notebooks inherit your existing security architecture:

1. **Authentication** — Every request to `/agent/chat` passes through `extractSecurityContext`, the same function used by `/load`, `/meta`, and all other endpoints
2. **Multi-tenant isolation** — The security context is passed to every tool call. When the agent runs `execute_query`, the query is filtered by your cube's `sql` function just like any other query
3. **API key gating** — Requests without a valid API key for the configured provider return `401`
4. **Turn limits** — `maxTurns` prevents runaway agent loops (default: 25)

## Per-Request System Context

Use `buildSystemContext` to give the agent user-specific context — such as the user's name, role, or preferences — derived from the authenticated security context. The returned string is appended to the LLM system prompt on every request.

```typescript
agent: {
  apiKey: process.env.ANTHROPIC_API_KEY,
  buildSystemContext: (securityContext) =>
    `User: ${securityContext.userName}, Role: ${securityContext.role}, Org: ${securityContext.organisationName}`
}
```

The callback is defined once at startup (static config) but executes per-request with the security context returned by `extractSecurityContext`. This keeps user-specific data out of shared config while giving the agent awareness of who it's talking to.

Common uses:
- **Personalization** — Address the user by name, tailor language to their role
- **Access hints** — Tell the agent which cubes or features the user can access
- **Locale/timezone** — Pass user preferences for date formatting

:::tip
Return `undefined` to skip adding context for a particular request.
:::

## SSE Event Types

The `/agent/chat` endpoint streams Server-Sent Events. Each event is a JSON object with `type` and `data` fields:

| Event | Description |
|-------|-------------|
| `text_delta` | Streaming text from the agent |
| `tool_use_start` | Agent is calling a tool (name + input) |
| `tool_use_result` | Tool returned a result |
| `add_portlet` | Agent created a chart visualization |
| `add_markdown` | Agent created a text/analysis block |
| `dashboard_saved` | Agent saved a dashboard (title, description, config) |
| `turn_complete` | An agentic turn finished (multi-turn conversations) |
| `done` | Agent finished, includes `sessionId` for follow-up |
| `error` | An error occurred |

## Save as Dashboard

The agent can convert a notebook's visualizations into a persistent dashboard. When the user asks to "save as a dashboard", the agent uses the `save_as_dashboard` tool to construct a `DashboardConfig` with proper layout, section headers, and filters.

The dashboard config is emitted to the client via the `dashboard_saved` SSE event. Your client-side code handles persistence — see [Client Integration](/client/agent-notebooks/#save-as-dashboard) for details.

The agent automatically:
- Arranges portlets in a professional grid layout (KPIs at top, charts below)
- Adds section headers as markdown portlets
- Creates universal date filters and dimension filters from the conversation context
- Maps filters to portlets via `dashboardFilterMapping`
- Supports all analysis types (standard query, funnel, flow, retention)

## Conversation History

The agent supports conversation history for session continuity. When a notebook is reloaded from a saved config, the client sends the prior chat messages as `history` in the request body. The server converts this into the provider's message format so the agent has full context of the previous conversation.

This happens automatically when using the `AgenticNotebook` component — no additional server configuration is needed.

## Environment Variables

```bash
# Set the key for your chosen provider
ANTHROPIC_API_KEY=sk-ant-api03-...   # Anthropic
OPENAI_API_KEY=sk-...                # OpenAI
GOOGLE_AI_API_KEY=AIza...            # Google Gemini
GROQ_API_KEY=gsk_...                 # Groq (OpenAI-compatible)
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

The endpoint requires an API key for the configured provider. Either:
- Set `agent.apiKey` in your server config
- Enable `agent.allowClientApiKey` and send `X-Agent-Api-Key` header from the client

### "SDK not found"

Install the optional peer dependency for your provider:

```bash
npm install @anthropic-ai/sdk      # Anthropic
npm install openai                  # OpenAI / OpenAI-compatible
npm install @google/generative-ai   # Google Gemini
```

### Agent responses are slow

- Try a faster/cheaper model: `model: 'claude-haiku-4-5'` (Anthropic), `model: 'gpt-4.1-mini'` (OpenAI), `model: 'gemini-3-flash-preview'` (Google)
- Reduce `maxTurns` to limit the number of tool-use rounds
- Reduce `maxTokens` to limit response length
- Avoid reasoning/thinking models (e.g. `gpt-5-mini`, `o3-mini`) as defaults — they add latency from forced chain-of-thought

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
