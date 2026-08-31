---
title: Custom Adapters
---

Drizzle Cube ships official adapters for Express, Fastify, Hono, and Next.js. If you need a different runtime or framework, you can build a small adapter layer yourself using the shared adapter utilities.

## Overview

A custom adapter is responsible for:
- Creating a `SemanticLayerCompiler`
- Extracting a `SecurityContext` from each request
- Routing `/cubejs-api/v1/*` endpoints
- Returning Cube.js-compatible responses
- Setting `Cache-Control: private, no-store` on every REST response

The core request handling logic is already implemented in `drizzle-cube/adapters/utils`.

## Building Blocks

```ts
import { SemanticLayerCompiler } from 'drizzle-cube/server'
import type { SecurityContext } from 'drizzle-cube/server'
import {
  handleLoad,
  handleDryRun,
  formatMetaResponse,
  formatSqlResponse,
  formatErrorResponse,
} from 'drizzle-cube/adapters/utils'
import { REST_CACHE_CONTROL } from 'drizzle-cube/adapters/core'
```

- `handleLoad` executes queries and returns `{ data, annotation, query }`.
- `handleDryRun` generates SQL + analysis without executing.
- `formatMetaResponse` and `formatSqlResponse` shape responses to Cube.js expectations.
- `REST_CACHE_CONTROL` is the `Cache-Control` value every REST response must carry (see [Tenant scoping](#tenant-scoping)).

## Example: Fetch-Style Adapter

This pattern works for Cloudflare Workers, standard `fetch` handlers, or any framework that uses `Request`/`Response`.

```ts
import { SemanticLayerCompiler } from 'drizzle-cube/server'
import type { SecurityContext } from 'drizzle-cube/server'
import {
  handleLoad,
  handleDryRun,
  formatMetaResponse,
  formatSqlResponse,
  formatErrorResponse,
} from 'drizzle-cube/adapters/utils'
import { REST_CACHE_CONTROL } from 'drizzle-cube/adapters/core'
import { cubes } from './cubes'
import { drizzle } from './db'
import { schema } from './schema'

async function extractSecurityContext(request: Request): Promise<SecurityContext> {
  // Your auth logic here
  return { organisationId: 'default' }
}

const semanticLayer = new SemanticLayerCompiler({
  drizzle,
  schema,
  engineType: 'postgres'
})

cubes.forEach((cube) => semanticLayer.registerCube(cube))

// Every REST body is tenant-scoped, so no shared cache may store it.
function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': REST_CACHE_CONTROL }
  })
}

export async function handler(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url)
    const path = url.pathname
    const securityContext = await extractSecurityContext(request)

    if (path.endsWith('/meta')) {
      // Tenant-scoped: getMetadata returns only this caller's cubes.
      const metadata = semanticLayer.getMetadata(securityContext)
      return json(formatMetaResponse(metadata))
    }

    if (path.endsWith('/sql')) {
      const query = JSON.parse(url.searchParams.get('query') ?? '{}')
      const validation = semanticLayer.validateQuery(query, securityContext)
      if (!validation.isValid) {
        return json(
          formatErrorResponse(`Query validation failed: ${validation.errors.join(', ')}`, 400),
          400
        )
      }

      const firstMember = query.measures?.[0] || query.dimensions?.[0]
      if (!firstMember) {
        return json(
          formatErrorResponse('No measures or dimensions specified', 400),
          400
        )
      }

      const cubeName = firstMember.split('.')[0]
      const sqlResult = await semanticLayer.generateSQL(cubeName, query, securityContext)
      return json(formatSqlResponse(query, sqlResult))
    }

    if (path.endsWith('/dry-run')) {
      const body = await request.json()
      const query = body.query ?? body
      const result = await handleDryRun(query, securityContext, semanticLayer)
      return json(result)
    }

    if (path.endsWith('/load')) {
      const body = await request.json()
      const result = await handleLoad(semanticLayer, securityContext, { query: body.query ?? body })
      return json(result)
    }

    return new Response('Not Found', { status: 404 })
  } catch (error) {
    return json(formatErrorResponse(error as Error), 400)
  }
}
```

## Tenant scoping

Cube definitions can differ per tenant since 0.8 ([per-tenant cube sets](/semantic-layer/cube-sets/)), so every method that resolves cubes takes a required `SecurityContext`. Resolve the context before you route, and pass it through:

```ts
semanticLayer.getMetadata(securityContext)
semanticLayer.validateQuery(query, securityContext)
semanticLayer.getCube(name, securityContext)
semanticLayer.hasCube(name, securityContext)
semanticLayer.getAllCubes(securityContext)
semanticLayer.getAllCubesMap(securityContext)
semanticLayer.getCubeNames(securityContext)
```

`/meta` is included: it returns only the caller's cubes, so a custom adapter must not serve it without a context. If your deployment genuinely has no tenancy, say so explicitly:

```ts
import { SINGLE_TENANT_CONTEXT } from 'drizzle-cube/server'

const metadata = semanticLayer.getMetadata(SINGLE_TENANT_CONTEXT)
```

The AI-discovery helpers take the context as their second argument, matching `handleLoad`: `handleDiscover(semanticLayer, securityContext, body)`, `handleSuggest(...)` and `handleValidate(...)`.

### Cache headers

Every REST response is tenant-scoped, so all of `/meta`, `/load`, `/sql`, `/dry-run`, `/batch` and `/explain` must carry `Cache-Control: private, no-store` — exported as `REST_CACHE_CONTROL` from `drizzle-cube/adapters/core`. Without it a shared cache or CDN may store a response heuristically and cross-serve one tenant's cubes or data to another. Stamp it on error responses too.

### If you build on `HttpPort`

Adapters written against the framework-agnostic core rather than `drizzle-cube/adapters/utils` implement `HttpPort` (or `McpHttpPort` for MCP). In 0.8 `setHeader(name, value)` moved from `McpHttpPort` to the base `HttpPort` and is **required**, so the core can stamp the cache header on every REST response. `withRestCacheHeaders(port)` wraps a port to do exactly that:

```ts
import { withRestCacheHeaders } from 'drizzle-cube/adapters/core'
import type { HttpPort } from 'drizzle-cube/adapters/core'

const headers = new Headers()

const port: HttpPort<Response> = {
  getHeader: (name) => request.headers.get(name) ?? undefined,
  getBody: () => request.json(),
  getQueryParam: (name) => url.searchParams.get(name) ?? undefined,
  setHeader: (name, value) => { headers.set(name, value) }, // required since 0.8
  send: (status, body) => Response.json(body, { status, headers })
}

// Every response this port sends now carries `Cache-Control: private, no-store`.
const restPort = withRestCacheHeaders(port)
```

## Notes

- For Express/Fastify/Hono/Next.js, use the official adapters in `drizzle-cube/adapters/*` instead of rolling your own.
- If you need more endpoints (batching, AI discovery, validation), see the adapter utilities in `drizzle-cube/adapters/utils` and the reference adapters in the source tree.

## Next Steps

- Review the adapter source for your closest framework in `drizzle-cube/src/adapters/*`.
- Consider copying the adapter and trimming it down for your runtime.
