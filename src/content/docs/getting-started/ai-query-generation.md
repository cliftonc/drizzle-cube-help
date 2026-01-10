---
title: AI Query Generation
---

Convert natural language questions into analytical queries using AI assistance. Drizzle Cube's AI Query Generation uses a multi-stage flow that fetches actual dimension values from your database, ensuring accurate filter values that match your real data.

## Overview

The AI Query Generation feature provides:

- **Natural Language Queries**: Ask questions like "Show me the PR funnel from created to merged" or "What are sales trends this quarter?"
- **Multi-Stage Intelligence**: A 3-step process that analyzes query shape, fetches real data, and generates accurate queries
- **Security-Aware Lookups**: Dimension value fetching respects your security context for multi-tenant isolation
- **Funnel Query Support**: Automatic detection and generation of funnel analysis queries

## Multi-Stage Query Generation Flow

The AI generation uses an intelligent multi-stage process with different models optimized for each step:

```
  User                        Server                          AI Models
   │                            │                               │
   │  "Show PR funnel from      │                               │
   │   created to merged"       │                               │
   │ ──────────────────────────►│                               │
   │                            │                               │
   │                            │   STEP 0: Validate Input      │
   │                            │   (gemini-2.0-flash-lite)     │
   │                            │ ─────────────────────────────►│
   │                            │                               │
   │                            │   { isValid: true }           │
   │                            │ ◄─────────────────────────────│
   │                            │                               │
   │                            │   STEP 1: Analyze Shape       │
   │                            │   (gemini-2.0-flash-lite)     │
   │                            │ ─────────────────────────────►│
   │                            │                               │
   │                            │   { queryType: "funnel",      │
   │                            │     dimensionsNeedingValues:  │
   │                            │     ["PREvents.eventType"] }  │
   │                            │ ◄─────────────────────────────│
   │                            │                               │
   │    ┌───────────────────────┴───────────────────────┐       │
   │    │  STEP 2: Fetch Dimension Values               │       │
   │    │  (with Security Context!)                     │       │
   │    │                                               │       │
   │    │  SELECT DISTINCT "eventType"                  │       │
   │    │  FROM pr_events                               │       │
   │    │  WHERE organisation_id = $1  ◄── Tenant       │       │
   │    │                                  Isolation    │       │
   │    │  Returns: ["created", "review_requested",     │       │
   │    │            "approved", "merged", "closed"]    │       │
   │    └───────────────────────┬───────────────────────┘       │
   │                            │                               │
   │                            │   STEP 3: Generate Query      │
   │                            │   (gemini-2.5-flash)          │
   │                            │ ─────────────────────────────►│
   │                            │                               │
   │   Final Query JSON         │   Uses REAL filter values     │
   │ ◄──────────────────────────│ ◄─────────────────────────────│
   │                            │                               │
```

### Why Multi-Stage?

Without fetching real values, the AI would have to guess filter values. For example:
- User asks: "Show funnel from opened to done"
- AI might guess: `"opened"` and `"done"` as filter values
- But your actual data has: `"created"` and `"merged"`

The multi-stage flow ensures the AI uses your actual data values, eliminating hallucinated or incorrect filters.

## How It Works

### Step 0: Input Validation

Before any query processing, the AI validates the input for security and relevance:

```json
// Example Step 0 output
{
  "isValid": true,
  "rejectionReason": null,
  "explanation": "Valid data analysis request"
}
```

Step 0 rejects inputs that are:
- **Injection attempts**: "ignore previous instructions", "you are now", encoded text
- **Security violations**: requests for other users' data, raw SQL, schema details
- **Off-topic**: unrelated to data analysis (weather, jokes, general chat)
- **Unclear**: too vague to understand

> **Tip**: Step 0 uses a fast, cheap model (gemini-2.0-flash-lite by default) since it's a simple classification task.

### Step 1: Query Shape Analysis

The AI analyzes your request to determine:
1. **Query Type**: Is this a regular query or a funnel analysis?
2. **Dimensions Needing Values**: Which dimensions require real categorical values for filtering?

```json
// Example Step 1 output
{
  "queryType": "funnel",
  "dimensionsNeedingValues": ["PREvents.eventType"],
  "reasoning": "Funnel query detected. Need event type values to define the steps."
}
```

### Step 2: Dimension Value Lookup

For each dimension identified in Step 1, the server fetches distinct values from your database:

```typescript
// Executed with your security context
const values = await semanticLayer.execute({
  dimensions: ["PREvents.eventType"],
  limit: 100,
  order: { "PREvents.eventType": "asc" }
}, securityContext)  // Tenant isolation enforced
```

This ensures:
- Only values from your tenant's data are returned
- The AI can only use values that actually exist
- No cross-tenant data leakage

### Step 3: Final Query Generation

The AI generates the final query using the actual dimension values:

```json
{
  "query": {
    "funnel": {
      "bindingKey": "PREvents.prNumber",
      "timeDimension": "PREvents.timestamp",
      "steps": [
        {
          "name": "Created",
          "filter": [
            { "member": "PREvents.eventType", "operator": "equals", "values": ["created"] },
            { "member": "PREvents.timestamp", "operator": "inDateRange", "values": ["last 6 months"] }
          ]
        },
        {
          "name": "Merged",
          "filter": { "member": "PREvents.eventType", "operator": "equals", "values": ["merged"] }
        }
      ],
      "includeTimeMetrics": true
    }
  },
  "chartType": "funnel"
}
```

### Fallback: Single-Step Generation

When no dimension values are needed (e.g., simple aggregations, date-only filters), the system uses a single-step generation for efficiency:

```typescript
// If Step 1 returns empty dimensionsNeedingValues
if (!step1Result.dimensionsNeedingValues?.length) {
  // Skip Step 2, go directly to generation
  const query = await generateSingleStep(userPrompt, cubeSchema)
}
```

## Prompt Files

The AI prompts are maintained as separate TypeScript modules for easy customization:

| Prompt | Purpose | Model Recommendation | GitHub |
|--------|---------|---------------------|--------|
| **Step 0 Prompt** | Input validation (security, relevance) | Fast/cheap (flash-lite) | [step0-validation-prompt.ts](https://github.com/cliftonc/drizzle-cube/blob/main/src/server/prompts/step0-validation-prompt.ts) |
| **Step 1 Prompt** | Analyze query shape, identify dimensions needing values | Fast/cheap (flash-lite) | [step1-shape-prompt.ts](https://github.com/cliftonc/drizzle-cube/blob/main/src/server/prompts/step1-shape-prompt.ts) |
| **Step 2 Prompt** | Generate final query with actual dimension values | Capable (flash/pro) | [step2-complete-prompt.ts](https://github.com/cliftonc/drizzle-cube/blob/main/src/server/prompts/step2-complete-prompt.ts) |
| **Single-Step Prompt** | Complete query generation when no values needed | Capable (flash/pro) | [single-step-prompt.ts](https://github.com/cliftonc/drizzle-cube/blob/main/src/server/prompts/single-step-prompt.ts) |

### Importing Prompts

The prompts are exported from the server package:

```typescript
import {
  buildStep0Prompt,
  buildSystemPrompt,
  buildStep1Prompt,
  buildStep2Prompt
} from 'drizzle-cube/server'

import type { Step0Result, Step1Result, DimensionValues } from 'drizzle-cube/server'
```

## Implementation

### Server-Side AI Routes

Here's a complete implementation using Hono:

```typescript
import { Hono } from 'hono'
import { SemanticLayerCompiler } from 'drizzle-cube/server'
import {
  buildSystemPrompt,
  buildStep1Prompt,
  buildStep2Prompt
} from 'drizzle-cube/server'
import type { Step1Result } from 'drizzle-cube/server'

const aiApp = new Hono()

aiApp.post('/generate', async (c) => {
  const { text } = await c.req.json()
  const apiKey = process.env.GEMINI_API_KEY
  const securityContext = await extractSecurityContext(c)

  // Get cube schema
  const cubeSchema = formatCubeSchemaForAI(db)

  // STEP 1: Analyze query shape
  const step1Prompt = buildStep1Prompt(cubeSchema, text)
  const step1Response = await callGemini(step1Prompt, apiKey)
  const step1Result: Step1Result = JSON.parse(step1Response)

  // If no dimensions need values, use single-step
  if (!step1Result.dimensionsNeedingValues?.length) {
    const prompt = buildSystemPrompt(cubeSchema, text)
    const query = await callGemini(prompt, apiKey)
    return c.json({ query })
  }

  // STEP 2: Fetch dimension values (with security context!)
  const dimensionValues: Record<string, string[]> = {}
  for (const dim of step1Result.dimensionsNeedingValues) {
    const values = await getDistinctValues(db, dim, securityContext)
    dimensionValues[dim] = values
  }

  // STEP 3: Generate final query with actual values
  const step2Prompt = buildStep2Prompt(cubeSchema, text, dimensionValues)
  const query = await callGemini(step2Prompt, apiKey)

  return c.json({ query })
})
```

### Client Integration

Enable AI in your React application:

```typescript
import { CubeProvider, AnalysisBuilder } from 'drizzle-cube/client'

function App() {
  return (
    <CubeProvider
      apiOptions={{ apiUrl: '/cubejs-api/v1' }}
      features={{
        enableAI: true,
        aiEndpoint: '/api/ai/generate'  // Your AI endpoint
      }}
    >
      <AnalysisBuilder />
    </CubeProvider>
  )
}
```

## Security Context Integration

The multi-stage flow respects your security context at every step:

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Context Flow                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Request arrives with auth token                         │
│     └─► Extract security context (organisationId, userId)   │
│                                                             │
│  2. Step 2: Dimension value lookup                          │
│     └─► semanticLayer.execute({...}, securityContext)       │
│         └─► SQL: WHERE organisation_id = $1                 │
│                                                             │
│  3. Only tenant's values returned to AI                     │
│     └─► No cross-tenant data leakage                        │
│                                                             │
│  4. Generated query executed with same context              │
│     └─► Results also filtered by security context           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key for server-side generation | Required |
| `GEMINI_MODEL` | Model(s) to use - see multi-model config below | Per-step defaults |
| `MAX_GEMINI_CALLS` | Daily rate limit for server key usage | `100` |

### Multi-Model Configuration

The `GEMINI_MODEL` environment variable supports comma-delimited values to use different models for each step:

```bash
# Single model for all steps
GEMINI_MODEL="gemini-2.5-flash"

# Two models: first for step0/1 (validation/shape), second for step2/3 (generation)
GEMINI_MODEL="gemini-2.0-flash-lite,gemini-2.5-flash"

# Three models: one for each step (step0, step1, step2/3)
GEMINI_MODEL="gemini-2.0-flash-lite,gemini-2.0-flash-lite,gemini-2.5-flash-preview-05-20"
```

**Default models by step:**

| Step | Default Model | Purpose |
|------|---------------|---------|
| Step 0 | `gemini-2.0-flash-lite` | Fast validation (cheap) |
| Step 1 | `gemini-2.0-flash-lite` | Shape analysis (cheap) |
| Step 2/3 | `gemini-2.5-flash-preview-05-20` | Query generation (capable) |

This allows you to optimize for cost by using cheaper models for simple classification tasks (Steps 0-1) while reserving more capable models for the actual query generation.

### Client Features Config

```typescript
interface FeaturesConfig {
  enableAI?: boolean      // Enable/disable AI (default: true)
  aiEndpoint?: string     // Custom endpoint (default: '/api/ai/generate')
}
```

## Rate Limiting

The AI endpoint includes built-in rate limiting to prevent abuse:

### Server Key Limits

When using the shared server API key:
- Daily limit (configurable via `MAX_GEMINI_CALLS`)
- Counter resets at midnight
- Shows usage information in response

### Bypassing Limits

Users can provide their own API key to bypass server limits:

```typescript
// Client can pass their own key
const response = await fetch('/api/ai/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'user-gemini-api-key'  // Bypass rate limit
  },
  body: JSON.stringify({ text: userPrompt })
})
```

## Custom AI Routes

The AI routes are **not included** in the drizzle-cube package - you implement them in your own server. The package exports prompt templates and types as building blocks.

### What's Exported

```typescript
import {
  // Prompt templates (raw strings)
  STEP0_VALIDATION_PROMPT,
  SYSTEM_PROMPT_TEMPLATE,
  STEP1_SYSTEM_PROMPT,
  STEP2_SYSTEM_PROMPT,

  // Prompt builders (with placeholder replacement)
  buildStep0Prompt,
  buildSystemPrompt,
  buildStep1Prompt,
  buildStep2Prompt,

  // Types
  type Step0Result,
  type Step1Result,
  type DimensionValues
} from 'drizzle-cube/server'
```

### Implementing Your Own AI Routes

Use the exported prompts as a foundation for your own implementation:

```typescript
import { Hono } from 'hono'
import {
  buildStep0Prompt,
  buildStep1Prompt,
  buildStep2Prompt,
  buildSystemPrompt
} from 'drizzle-cube/server'

const aiRoutes = new Hono()

aiRoutes.post('/generate', async (c) => {
  const { text } = await c.req.json()
  const cubeSchema = formatYourCubeSchema()

  // Add your own domain-specific rules
  const customStep0 = buildStep0Prompt(text) + `
    ADDITIONAL RULES FOR YOUR DOMAIN:
    - Accept queries about "widgets" and "gadgets"
  `

  // Call your AI provider
  const validation = await callAI(customStep0)
  // ... continue with your flow
})
```

### Customizing Cube Schema

The schema formatting is entirely up to you. Add domain context, examples, or business rules:

```typescript
function formatCubeSchemaForAI(semanticLayer: SemanticLayerCompiler): string {
  const metadata = semanticLayer.getMetadata()

  return JSON.stringify({
    cubes: metadata,
    // Add your own context
    businessRules: [
      "Fiscal year starts April 1st",
      "Active employees excludes contractors"
    ],
    exampleQueries: [
      "Show sales by region this quarter",
      "Employee headcount trend by department"
    ]
  }, null, 2)
}
```

> **Note**: See the [example implementations](https://github.com/cliftonc/drizzle-cube/tree/main/dev/server/ai-routes.ts) for a complete reference.

## Best Practices

### For Users

1. **Be Specific**: "Employee count by department this year" works better than "show employees"
2. **Use Business Terms**: The AI understands your cube schema, so use the same terminology
3. **Start Simple**: Begin with basic queries and add complexity gradually
4. **Mention Time**: Include time context for better date range handling

### For Developers

1. **Keep Prompts Server-Side**: Never expose system prompts to the client
2. **Implement Rate Limiting**: Protect your AI API costs
3. **Test Security Context**: Verify tenant isolation in dimension lookups
4. **Add Descriptive Cube Metadata**: Better descriptions lead to better queries

## Troubleshooting

### AI Button Not Showing

```typescript
// Ensure AI is enabled in features
<CubeProvider features={{ enableAI: true }}>
```

### Rate Limit Errors

```json
{
  "error": "Daily quota exceeded",
  "message": "You've used all 100 free AI requests for today.",
  "suggestion": "Add your own Gemini API key for unlimited access."
}
```

### Invalid Queries Generated

1. Check your cube schema formatting in the system prompt
2. Ensure dimension/measure names are clearly defined
3. Verify eventStream metadata is present for funnel queries

### Debug Information

The AI endpoint returns debug info when using multi-stage:

```json
{
  "query": "...",
  "_debug": {
    "multiStep": true,
    "dimensionsQueried": ["PREvents.eventType"]
  }
}
```

### Health Check

Test your AI configuration:

```bash
curl http://localhost:3000/api/ai/health
```

```json
{
  "status": "ok",
  "provider": "Google Gemini",
  "models": {
    "step0": { "model": "gemini-2.0-flash-lite", "purpose": "Input validation (fast/cheap)" },
    "step1": { "model": "gemini-2.0-flash-lite", "purpose": "Query shape analysis (fast/cheap)" },
    "step2": { "model": "gemini-2.5-flash-preview-05-20", "purpose": "Query generation (capable)" }
  },
  "pipeline": [
    "Step 0: Validate input for security/relevance",
    "Step 1: Analyze query shape, identify dimensions needing values",
    "Step 2: Fetch dimension values from DB (with security context)",
    "Step 3: Generate final query with actual values"
  ],
  "server_key_configured": true,
  "rateLimit": {
    "dailyLimit": 100,
    "note": "Bypass by providing X-API-Key header"
  }
}
```

## Funnel Query Detection

The AI automatically detects funnel queries when your prompt includes:

- "funnel", "conversion", "journey", "flow"
- "step by step", "multi-step", "progression"
- "drop off", "dropoff", "abandon", "churn"
- "sign up to purchase", "registration to conversion"
- "how many users go from X to Y"

> **Note**: Funnel queries require cubes with `eventStream` metadata. Without it, the AI generates regular queries instead.

## Next Steps

- [Analysis Builder](/client/analysis-builder/) - Learn about the query builder UI
- [Funnel Analysis](/client/funnel-analysis/) - Deep dive into funnel queries
- [Security](/semantic-layer/security/) - Multi-tenant security model
