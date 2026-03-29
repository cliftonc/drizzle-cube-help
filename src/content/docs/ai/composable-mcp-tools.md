---
title: Composable MCP Tools
description: Add drizzle-cube analytics tools to your existing MCP server
---

If you already have an MCP server (e.g., a [PostgREST MCP](https://github.com/semantius/postgrest-mcp) providing CRUD tools), you can add drizzle-cube's analytics tools alongside your existing tools — no need to run a separate MCP server.

The `drizzle-cube/mcp` export provides composable tool definitions and handlers that work with any MCP server, including [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk).

## Installation

```bash
npm install drizzle-cube
```

No additional dependencies required — `drizzle-cube/mcp` has zero dependency on `@modelcontextprotocol/sdk`. It just produces objects that match the MCP spec.

## Quick Start

```typescript
import { getCubeTools } from 'drizzle-cube/mcp'
import { createDrizzleSemanticLayer } from 'drizzle-cube/server'

// 1. Create your semantic layer
const semanticLayer = createDrizzleSemanticLayer({ drizzle: db, schema })
semanticLayer.registerCube(ordersCube)
semanticLayer.registerCube(customersCube)

// 2. Get composable tools
const cubeTools = getCubeTools({
  semanticLayer,
  getSecurityContext: async (meta) => ({
    orgId: meta?.authInfo?.orgId ?? 'default'
  })
})

// 3. Use them however you like
cubeTools.definitions  // tool schemas for tools/list
cubeTools.handle(name, args)  // tool executor for tools/call
cubeTools.handles(name)  // check if a tool name is ours
cubeTools.prompts  // MCP prompts for prompts/list
cubeTools.resources  // MCP resources for resources/list
cubeTools.toolNames  // list of registered tool names
```

## With @modelcontextprotocol/sdk

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js'
import { getCubeTools } from 'drizzle-cube/mcp'
import { createDrizzleSemanticLayer } from 'drizzle-cube/server'

const semanticLayer = createDrizzleSemanticLayer({ drizzle: db, schema })
semanticLayer.registerCube(ordersCube)

const cubeTools = getCubeTools({
  semanticLayer,
  getSecurityContext: async (meta) => ({
    orgId: meta?.authInfo?.orgId
  })
})

const server = new Server(
  { name: 'my-analytics-server', version: '1.0.0' },
  { capabilities: { tools: {}, prompts: {}, resources: {} } }
)

// Merge cube tools with your own tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [...myExistingTools, ...cubeTools.definitions]
}))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (cubeTools.handles(req.params.name)) {
    return cubeTools.handle(req.params.name, req.params.arguments, req)
  }
  return handleMyTools(req)
})

// Optionally expose prompts and resources
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: cubeTools.prompts.map(p => ({ name: p.name, description: p.description }))
}))

server.setRequestHandler(GetPromptRequestSchema, async (req) => {
  const prompt = cubeTools.prompts.find(p => p.name === req.params.name)
  if (!prompt) throw new Error('Prompt not found')
  return { name: prompt.name, description: prompt.description, messages: prompt.messages }
})
```

## With PostgREST MCP (Hono)

Combine CRUD and analytics tools on a single MCP server:

```typescript
import { Hono } from 'hono'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StreamableHTTPTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { getCubeTools } from 'drizzle-cube/mcp'
import { createDrizzleSemanticLayer } from 'drizzle-cube/server'
import { postgrestTools } from './postgrest-tools'

// Set up semantic layer
const semanticLayer = createDrizzleSemanticLayer({ drizzle: db, schema })
semanticLayer.registerCube(ordersCube)
semanticLayer.registerCube(customersCube)

const cubeTools = getCubeTools({
  semanticLayer,
  getSecurityContext: async (meta) => ({
    orgId: meta?.authInfo?.orgId
  })
})

const app = new Hono()

app.post('/mcp', async (c) => {
  const authToken = c.req.header('Authorization')?.replace('Bearer ', '')

  const server = new Server(
    { name: 'my-api', version: '1.0.0' },
    { capabilities: { tools: {} } }
  )

  // One MCP server, both CRUD and analytics tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [...postgrestTools, ...cubeTools.definitions]
  }))

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    if (cubeTools.handles(req.params.name)) {
      return cubeTools.handle(req.params.name, req.params.arguments, {
        authInfo: { orgId: authToken }
      })
    }
    return handlePostgrestTool(req)
  })

  const transport = new StreamableHTTPTransport({ sessionIdGenerator: undefined })
  await server.connect(transport)
  return transport.handleRequest(c.req.raw)
})
```

## API Reference

### getCubeTools(options)

Creates a composable tools object.

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `semanticLayer` | `SemanticLayerCompiler` | *required* | Semantic layer with registered cubes |
| `getSecurityContext` | `(meta?) => SecurityContext` | *required* | Extracts security context for `load` tool |
| `toolPrefix` | `string` | `'drizzle_cube_'` | Prefix for tool names |
| `tools` | `string[]` | `['discover', 'validate', 'load']` | Which tools to expose |
| `prompts` | `MCPPrompt[]` | built-in | Custom MCP prompts |
| `resources` | `MCPResource[]` | built-in | Custom MCP resources |

#### Returns: CubeTools

| Property | Type | Description |
|----------|------|-------------|
| `definitions` | `MCPToolDefinition[]` | Tool schemas for `tools/list` |
| `handle(name, args, meta?)` | `Promise<MCPToolResult>` | Execute a tool call |
| `handles(name)` | `boolean` | Check if name is a cube tool |
| `prompts` | `MCPPrompt[]` | Prompts for `prompts/list` |
| `resources` | `MCPResource[]` | Resources for `resources/list` |
| `toolNames` | `string[]` | Registered tool names |

### Tool Names

By default, tools are prefixed with `drizzle_cube_`:

| Tool | Default Name |
|------|-------------|
| discover | `drizzle_cube_discover` |
| validate | `drizzle_cube_validate` |
| load | `drizzle_cube_load` |

Customize the prefix:

```typescript
// No prefix
const cubeTools = getCubeTools({ ..., toolPrefix: '' })
// → discover, validate, load

// Custom prefix
const cubeTools = getCubeTools({ ..., toolPrefix: 'analytics_' })
// → analytics_discover, analytics_validate, analytics_load
```

The `handles()` and `handle()` methods accept tool names both with and without the prefix.

### Selective Tools

Expose only specific tools:

```typescript
const cubeTools = getCubeTools({
  semanticLayer,
  getSecurityContext,
  tools: ['discover', 'load']  // no validate
})
```

## Security

The `getSecurityContext` callback is called every time the `load` tool executes. It receives whatever `meta` argument you pass to `handle()`, so you can thread auth info through from your MCP server's request handling:

```typescript
const cubeTools = getCubeTools({
  semanticLayer,
  getSecurityContext: async (meta) => {
    // meta is whatever you pass as the 3rd arg to handle()
    const user = await validateToken(meta?.authToken)
    return { orgId: user.orgId, userId: user.id }
  }
})

// In your tool handler, pass auth context as meta
cubeTools.handle(name, args, { authToken: request.headers.authorization })
```

The `discover` and `validate` tools don't execute queries, so they don't invoke `getSecurityContext`. Access to these tools is gated by whatever authentication your MCP server applies.

## Compared to Built-in MCP Server

| Feature | Built-in (`/mcp` endpoint) | Composable (`drizzle-cube/mcp`) |
|---------|---------------------------|--------------------------------|
| Setup | Zero-config with any adapter | Manual registration |
| Use case | Standalone MCP server | Add to existing MCP server |
| Tools | Same 3 tools | Same 3 tools |
| Prompts & Resources | Included | Included |
| Protocol handling | Built-in JSON-RPC, SSE | You provide (or use SDK) |
| Auth | Framework middleware | Your MCP server's auth |

## Next Steps

- [MCP Endpoints](/ai/mcp-endpoints/) — Built-in MCP server (zero-config alternative)
- [Adding Semantic Metadata](/ai/semantic-metadata/) — Make your cubes more discoverable
- [Security](/semantic-layer/security/) — Multi-tenant isolation
