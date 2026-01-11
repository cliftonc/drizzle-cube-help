---
title: AI Query Generation
description: Convert natural language questions into analytical queries using AI
---

Convert natural language questions into analytical queries using AI assistance. The multi-stage generation flow fetches actual dimension values from your database, ensuring accurate filter values that match your real data.

> **Note**: The `/api/ai/generate` endpoint is **not included** in drizzle-cube - you implement it yourself using our prompt templates and reference implementation. See [Adding AI Endpoints](/ai/adding-ai-endpoints/) for the complete guide and [ai-routes.ts](https://github.com/cliftonc/drizzle-cube/blob/main/dev/server/ai-routes.ts) for a working example.

## Overview

The AI Query Generation feature provides:

- **Natural Language Queries**: Ask questions like "Show me the PR funnel from created to merged" or "What are sales trends this quarter?"
- **Multi-Stage Intelligence**: A 4-step process that validates input, analyzes query shape, fetches real data, and generates accurate queries
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

## Client Integration

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

## Rate Limiting

The AI endpoint includes built-in rate limiting to prevent abuse:

### Server Key Limits

When using the shared server API key:
- Daily limit (configurable via `MAX_GEMINI_CALLS`, default: 100)
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

## Funnel Query Detection

The AI automatically detects funnel queries when your prompt includes:

- "funnel", "conversion", "journey", "flow"
- "step by step", "multi-step", "progression"
- "drop off", "dropoff", "abandon", "churn"
- "sign up to purchase", "registration to conversion"
- "how many users go from X to Y"

> **Note**: Funnel queries require cubes with `eventStream` metadata. Without it, the AI generates regular queries instead.

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

## Next Steps

- [Query Analysis](/ai/query-analysis/) - Learn about EXPLAIN plan analysis
- [Adding AI Endpoints](/ai/adding-ai-endpoints/) - Implement AI routes in your server
- [Analysis Builder](/client/analysis-builder/) - Learn about the query builder UI
- [Funnel Analysis](/client/funnel-analysis/) - Deep dive into funnel queries
