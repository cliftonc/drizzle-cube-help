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
```

- `handleLoad` executes queries and returns `{ data, annotation, query }`.
- `handleDryRun` generates SQL + analysis without executing.
- `formatMetaResponse` and `formatSqlResponse` shape responses to Cube.js expectations.

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

export async function handler(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url)
    const path = url.pathname
    const securityContext = await extractSecurityContext(request)

    if (path.endsWith('/meta')) {
      const metadata = semanticLayer.getMetadata()
      return Response.json(formatMetaResponse(metadata))
    }

    if (path.endsWith('/sql')) {
      const query = JSON.parse(url.searchParams.get('query') ?? '{}')
      const validation = semanticLayer.validateQuery(query)
      if (!validation.isValid) {
        return Response.json(
          formatErrorResponse(`Query validation failed: ${validation.errors.join(', ')}`, 400),
          { status: 400 }
        )
      }

      const firstMember = query.measures?.[0] || query.dimensions?.[0]
      if (!firstMember) {
        return Response.json(
          formatErrorResponse('No measures or dimensions specified', 400),
          { status: 400 }
        )
      }

      const cubeName = firstMember.split('.')[0]
      const sqlResult = await semanticLayer.generateSQL(cubeName, query, securityContext)
      return Response.json(formatSqlResponse(query, sqlResult))
    }

    if (path.endsWith('/dry-run')) {
      const body = await request.json()
      const query = body.query ?? body
      const result = await handleDryRun(query, securityContext, semanticLayer)
      return Response.json(result)
    }

    if (path.endsWith('/load')) {
      const body = await request.json()
      const result = await handleLoad(semanticLayer, securityContext, { query: body.query ?? body })
      return Response.json(result)
    }

    return new Response('Not Found', { status: 404 })
  } catch (error) {
    return Response.json(formatErrorResponse(error as Error), { status: 400 })
  }
}
```

## Notes

- For Express/Fastify/Hono/Next.js, use the official adapters in `drizzle-cube/adapters/*` instead of rolling your own.
- If you need more endpoints (batching, AI discovery, validation), see the adapter utilities in `drizzle-cube/adapters/utils` and the reference adapters in the source tree.

## Next Steps

- Review the adapter source for your closest framework in `drizzle-cube/src/adapters/*`.
- Consider copying the adapter and trimming it down for your runtime.
