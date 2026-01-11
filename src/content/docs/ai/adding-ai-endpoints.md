---
title: Adding AI Endpoints
description: Implement AI routes in your server for query generation and execution plan analysis
---

AI endpoints (`/api/ai/*`) are **not included** in drizzle-cube. You must implement them yourself. This guide shows you how, using our reference implementation as a starting point.

> **Key Point**: We provide prompt templates, type definitions, and a complete working example - but you own the AI integration. This gives you full control over which AI provider you use, how you handle API keys, rate limiting, and costs.

## Reference Implementation

**Start here** - our dev server contains a complete, production-ready implementation:

| File | Lines | Description |
|------|-------|-------------|
| **[ai-routes.ts](https://github.com/cliftonc/drizzle-cube/blob/main/dev/server/ai-routes.ts)** | 800+ | Complete AI endpoints with multi-stage flow, rate limiting, security |
| **[app.ts](https://github.com/cliftonc/drizzle-cube/blob/main/dev/server/app.ts)** | ~250 | How to mount AI routes with middleware injection |

You can copy these files directly into your project and adapt them to your needs.

## Why You Build This Yourself

AI endpoints are intentionally **not bundled** with the framework adapters because:

1. **Provider Choice** - Use Google Gemini, OpenAI, Anthropic, or any AI provider you prefer
2. **Cost Control** - You manage API keys, rate limiting, and billing
3. **Customization** - Modify prompts, add domain-specific context, tune behavior
4. **Security** - You control how API keys are stored and accessed

## Prerequisites

Before implementing AI routes, you need:

1. **Google Gemini API Key** - Get one free at [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Working Cube API** - Your semantic layer and adapter should already be functional
3. **Security Context** - A function to extract user identity from requests

## Environment Variables

```bash
# Required
GEMINI_API_KEY=your-gemini-api-key

# Optional
GEMINI_MODEL=gemini-2.5-flash                    # Or comma-delimited for per-step models
MAX_GEMINI_CALLS=100                             # Daily rate limit for server key
```

## Implementation Guide (Hono)

This example shows a complete implementation using Hono. The pattern adapts easily to other frameworks.

### Step 1: Create AI Routes File

Create a new file `ai-routes.ts` in your server directory:

```typescript
import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { SemanticLayerCompiler, createDatabaseExecutor } from 'drizzle-cube/server'
import {
  buildStep0Prompt,
  buildSystemPrompt,
  buildStep1Prompt,
  buildStep2Prompt,
  buildExplainAnalysisPrompt,
  formatCubeSchemaForExplain,
  formatExistingIndexes
} from 'drizzle-cube/server'
import type { Step0Result, Step1Result } from 'drizzle-cube/server'

// Your database and cube imports
import { db, schema } from './database'
import { allCubes } from './cubes'

interface SecurityContext {
  organisationId: number
  userId?: number
}

interface Variables {
  db: typeof db
  extractSecurityContext: (c: any) => Promise<SecurityContext>
}

const aiApp = new Hono<{ Variables: Variables }>()

export default aiApp
```

### Step 2: Implement Helper Functions

Add helper functions for calling Gemini and formatting cube metadata:

```typescript
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

// Call Gemini API
async function callGemini(prompt: string, apiKey: string, model: string): Promise<string> {
  const response = await fetch(
    `${GEMINI_BASE_URL}/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'X-goog-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// Parse JSON from AI response (handles markdown code blocks)
function parseAIResponse(text: string): any {
  return JSON.parse(
    text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  )
}

// Format cube schema for AI prompts
function formatCubeSchemaForAI(db: typeof database): string {
  const semanticLayer = new SemanticLayerCompiler({
    drizzle: db,
    schema,
    engineType: 'postgres'
  })

  allCubes.forEach(cube => semanticLayer.registerCube(cube))
  const metadata = semanticLayer.getMetadata()

  // Format for AI consumption
  const cubes: Record<string, any> = {}
  for (const cube of metadata) {
    cubes[cube.name] = {
      title: cube.title,
      description: cube.description,
      measures: Object.fromEntries(
        cube.measures.map(m => [m.name, { type: m.type, title: m.title }])
      ),
      dimensions: Object.fromEntries(
        cube.dimensions.filter(d => d.type !== 'time')
          .map(d => [d.name, { type: d.type, title: d.title }])
      ),
      timeDimensions: Object.fromEntries(
        cube.dimensions.filter(d => d.type === 'time')
          .map(d => [d.name, { type: d.type, title: d.title }])
      )
    }

    // Include eventStream for funnel support
    if (cube.meta?.eventStream) {
      cubes[cube.name].eventStream = cube.meta.eventStream
    }
  }

  return JSON.stringify({ cubes }, null, 2)
}

// Query distinct values for a dimension
async function getDistinctValues(
  db: typeof database,
  fieldName: string,
  securityContext: SecurityContext
): Promise<string[]> {
  const semanticLayer = new SemanticLayerCompiler({
    drizzle: db,
    schema,
    engineType: 'postgres'
  })

  allCubes.forEach(cube => semanticLayer.registerCube(cube))

  const result = await semanticLayer.execute({
    dimensions: [fieldName],
    limit: 100,
    order: { [fieldName]: 'asc' }
  }, securityContext)

  return result.data
    .map((row: any) => row[fieldName])
    .filter((v: any) => v != null && v !== '')
}
```

### Step 3: Implement /generate Endpoint

The main query generation endpoint with multi-stage flow:

```typescript
aiApp.post('/generate', async (c) => {
  const db = c.get('db')
  const extractSecurityContext = c.get('extractSecurityContext')

  // Get API key (user-provided or server)
  const userApiKey = c.req.header('X-API-Key')
  const serverApiKey = process.env.GEMINI_API_KEY
  const apiKey = userApiKey || serverApiKey

  if (!apiKey) {
    return c.json({ error: 'No API key available' }, 400)
  }

  try {
    const { text } = await c.req.json()

    // Basic validation
    if (!text || text.length > 500) {
      return c.json({ error: 'Invalid prompt' }, 400)
    }

    const cubeSchema = formatCubeSchemaForAI(db)
    const securityContext = await extractSecurityContext(c)

    // STEP 0: Validate input
    const step0Prompt = buildStep0Prompt(text)
    const step0Response = await callGemini(step0Prompt, apiKey, 'gemini-2.0-flash-lite')
    const step0Result: Step0Result = parseAIResponse(step0Response)

    if (!step0Result.isValid) {
      return c.json({
        error: 'Request rejected',
        reason: step0Result.rejectionReason
      }, 400)
    }

    // STEP 1: Analyze query shape
    const step1Prompt = buildStep1Prompt(cubeSchema, text)
    const step1Response = await callGemini(step1Prompt, apiKey, 'gemini-2.0-flash-lite')
    const step1Result: Step1Result = parseAIResponse(step1Response)

    // If no dimensions need values, use single-step
    if (!step1Result.dimensionsNeedingValues?.length) {
      const prompt = buildSystemPrompt(cubeSchema, text)
      const query = await callGemini(prompt, apiKey, 'gemini-2.5-flash')
      return c.json({ query })
    }

    // STEP 2: Fetch dimension values (with security context!)
    const dimensionValues: Record<string, string[]> = {}
    for (const dim of step1Result.dimensionsNeedingValues) {
      dimensionValues[dim] = await getDistinctValues(db, dim, securityContext)
    }

    // STEP 3: Generate final query
    const step2Prompt = buildStep2Prompt(cubeSchema, text, dimensionValues)
    const query = await callGemini(step2Prompt, apiKey, 'gemini-2.5-flash')

    return c.json({ query })

  } catch (error) {
    return c.json({
      error: 'Failed to generate query',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})
```

### Step 4: Implement /explain/analyze Endpoint

The AI-powered execution plan analysis:

```typescript
aiApp.post('/explain/analyze', async (c) => {
  const db = c.get('db')
  const apiKey = c.req.header('X-API-Key') || process.env.GEMINI_API_KEY

  if (!apiKey) {
    return c.json({ error: 'No API key available' }, 400)
  }

  try {
    const { explainResult, query } = await c.req.json()

    if (!explainResult || !query) {
      return c.json({ error: 'Missing explainResult or query' }, 400)
    }

    // Get cube metadata for context
    const semanticLayer = new SemanticLayerCompiler({
      drizzle: db,
      schema,
      engineType: 'postgres'
    })
    allCubes.forEach(cube => semanticLayer.registerCube(cube))

    const metadata = semanticLayer.getMetadata()
    const cubeSchema = formatCubeSchemaForExplain(metadata)

    // Get existing indexes
    const executor = createDatabaseExecutor(db, schema, 'postgres')
    const tableNames = extractTableNames(explainResult.sql.sql)
    const existingIndexes = await executor.getTableIndexes(tableNames)
    const formattedIndexes = formatExistingIndexes(existingIndexes)

    // Build and send analysis prompt
    const prompt = buildExplainAnalysisPrompt(
      explainResult.summary.database,
      cubeSchema,
      JSON.stringify(query, null, 2),
      explainResult.sql.sql,
      JSON.stringify(explainResult.operations, null, 2),
      explainResult.raw,
      formattedIndexes
    )

    const response = await callGemini(prompt, apiKey, 'gemini-2.5-flash')
    const analysis = parseAIResponse(response)

    return c.json(analysis)

  } catch (error) {
    return c.json({
      error: 'Failed to analyze explain plan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Helper to extract table names from SQL
function extractTableNames(sql: string): string[] {
  const pattern = /(?:FROM|JOIN)\s+["']?(\w+)["']?/gi
  const tables = new Set<string>()
  let match
  while ((match = pattern.exec(sql)) !== null) {
    tables.add(match[1].toLowerCase())
  }
  return Array.from(tables)
}
```

### Step 5: Implement Health Check

```typescript
aiApp.get('/health', (c) => {
  return c.json({
    status: 'ok',
    provider: 'Google Gemini',
    serverKeyConfigured: !!process.env.GEMINI_API_KEY,
    endpoints: {
      'POST /api/ai/generate': 'Generate semantic query from natural language',
      'POST /api/ai/explain/analyze': 'Analyze execution plan with AI',
      'GET /api/ai/health': 'This endpoint'
    }
  })
})
```

### Step 6: Mount Routes in Main App

In your main server file:

```typescript
import { Hono } from 'hono'
import { createCubeApp } from 'drizzle-cube/adapters/hono'
import aiApp from './ai-routes'
import { db, schema } from './database'
import { allCubes } from './cubes'

const app = new Hono()

// Security context extractor
async function extractSecurityContext(c: any) {
  const authHeader = c.req.header('Authorization')
  // In production: decode JWT, verify session, etc.
  return { organisationId: 1, userId: 1 }
}

// Mount Cube API
const cubeApp = createCubeApp({
  drizzle: db,
  schema,
  cubes: allCubes,
  extractSecurityContext
})
app.route('/cubejs-api/v1', cubeApp)

// Mount AI routes with database and security context
app.use('/api/ai/*', async (c, next) => {
  c.set('db', db)
  c.set('extractSecurityContext', extractSecurityContext)
  await next()
})
app.route('/api/ai', aiApp)

export default app
```

## Adapting to Other Frameworks

### Express

```typescript
import express from 'express'
import { buildStep0Prompt, buildStep1Prompt, buildStep2Prompt } from 'drizzle-cube/server'

const router = express.Router()

router.post('/generate', async (req, res) => {
  const { text } = req.body
  const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY

  // ... same logic as Hono example

  res.json({ query })
})

// In main app
app.use('/api/ai', router)
```

### Fastify

```typescript
import Fastify from 'fastify'
import { buildStep0Prompt, buildStep1Prompt, buildStep2Prompt } from 'drizzle-cube/server'

fastify.post('/api/ai/generate', async (request, reply) => {
  const { text } = request.body
  const apiKey = request.headers['x-api-key'] || process.env.GEMINI_API_KEY

  // ... same logic as Hono example

  return { query }
})
```

### Next.js (App Router)

```typescript
// app/api/ai/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { buildStep0Prompt, buildStep1Prompt, buildStep2Prompt } from 'drizzle-cube/server'

export async function POST(request: NextRequest) {
  const { text } = await request.json()
  const apiKey = request.headers.get('x-api-key') || process.env.GEMINI_API_KEY

  // ... same logic as Hono example

  return NextResponse.json({ query })
}
```

## Available Prompt Utilities

Drizzle Cube exports these prompt builders:

```typescript
import {
  // Prompt builders
  buildStep0Prompt,      // Input validation
  buildSystemPrompt,     // Single-step query generation
  buildStep1Prompt,      // Query shape analysis
  buildStep2Prompt,      // Final query with dimension values
  buildExplainAnalysisPrompt,  // EXPLAIN plan analysis

  // Formatting helpers
  formatCubeSchemaForExplain,  // Format metadata for EXPLAIN context
  formatExistingIndexes,        // Format database indexes for AI

  // Types
  type Step0Result,
  type Step1Result,
  type DimensionValues
} from 'drizzle-cube/server'
```

## Rate Limiting

Implement rate limiting to protect your API costs:

```typescript
// Simple daily counter using your database
const CALLS_KEY = 'gemini-ai-calls'
const MAX_CALLS = parseInt(process.env.MAX_GEMINI_CALLS || '100')

async function checkRateLimit(db: Database, usingUserKey: boolean): Promise<boolean> {
  if (usingUserKey) return true  // User keys bypass limits

  const usage = await db.select().from(settings)
    .where(eq(settings.key, CALLS_KEY))
    .limit(1)

  const count = usage.length > 0 ? parseInt(usage[0].value) : 0
  return count < MAX_CALLS
}

async function incrementCounter(db: Database): Promise<void> {
  // Update or insert counter
  // Reset at midnight (implement your own logic)
}
```

## Testing Your Endpoints

### Health Check

```bash
curl http://localhost:3000/api/ai/health
```

### Query Generation

```bash
curl -X POST http://localhost:3000/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "Show employee count by department"}'
```

### EXPLAIN Analysis

```bash
# First get an explain result
curl -X POST http://localhost:3000/cubejs-api/v1/explain \
  -H "Content-Type: application/json" \
  -d '{"query": {"measures": ["Employees.count"]}}'

# Then analyze it
curl -X POST http://localhost:3000/api/ai/explain/analyze \
  -H "Content-Type: application/json" \
  -d '{"explainResult": {...}, "query": {...}}'
```

## Next Steps

- [Query Generation](/ai/query-generation/) - Detailed documentation on the multi-stage flow
- [Query Analysis](/ai/query-analysis/) - How to interpret execution plans
- [Security](/semantic-layer/security/) - Multi-tenant security model
