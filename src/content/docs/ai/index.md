---
title: AI Features Overview
description: Enhance your analytics with AI-powered query generation and execution plan analysis
---

Drizzle Cube provides utilities and example implementations to help you add AI-powered features to your analytics. These features help users interact with your data through natural language and optimize query performance.

> **Important**: AI endpoints (`/api/ai/*`) are **not included** in the drizzle-cube package. You must implement them yourself in your server. We provide prompt templates, type definitions, and a complete reference implementation - but we intentionally don't bundle AI routes because:
>
> - **Provider Choice**: You may want to use OpenAI, Anthropic, Google Gemini, or other AI providers
> - **Cost Control**: You control API keys, rate limiting, and billing
> - **Customization**: You can modify prompts, add domain-specific context, and tune behavior

## What Drizzle Cube Provides

| Component | Included | Description |
|-----------|----------|-------------|
| `/cubejs-api/v1/explain` | ✅ Built-in | Execution plan endpoint (in all adapters) |
| Prompt templates | ✅ Exported | `buildStep0Prompt`, `buildStep1Prompt`, etc. |
| Type definitions | ✅ Exported | `Step0Result`, `Step1Result`, `AIExplainAnalysis` |
| `/api/ai/*` endpoints | ❌ You build | Reference implementation provided |

## Reference Implementation

See our complete working implementation in the dev server:

- **[ai-routes.ts](https://github.com/cliftonc/drizzle-cube/blob/main/dev/server/ai-routes.ts)** - Complete AI endpoints (800+ lines)
- **[app.ts](https://github.com/cliftonc/drizzle-cube/blob/main/dev/server/app.ts)** - How to mount AI routes with middleware

## Available AI Features

### Natural Language Query Generation

Convert questions like "Show me sales by region this quarter" into properly structured semantic queries. The multi-stage generation pipeline fetches actual dimension values from your database, ensuring accurate filter values.

[Learn more about Query Generation →](/ai/query-generation/)

### Query Execution Analysis

Analyze query execution plans with AI-powered recommendations. Get insights into:
- Sequential scans that might benefit from indexes
- Missing index opportunities
- Query optimization suggestions
- Performance assessments (good / warning / critical)

[Learn more about Query Analysis →](/ai/query-analysis/)

## Prerequisites

To use AI features, you need:

1. **Google Gemini API Key** - Get one free at [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Server-side AI Routes** - AI endpoints must be implemented in your server (not included in adapters)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Your Application                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐      ┌─────────────────────────────┐  │
│  │  Cube API       │      │  AI Routes (you implement)  │  │
│  │  /cubejs-api/v1 │      │  /api/ai                    │  │
│  │                 │      │                             │  │
│  │  • /load        │      │  • /generate                │  │
│  │  • /meta        │      │  • /explain/analyze         │  │
│  │  • /explain     │      │  • /health                  │  │
│  └─────────────────┘      └─────────────────────────────┘  │
│           │                          │                      │
│           └──────────┬───────────────┘                      │
│                      │                                      │
│              ┌───────▼───────┐                              │
│              │ Semantic Layer │                              │
│              │ + Security Ctx │                              │
│              └───────────────┘                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Security Model

AI features respect your security context at every step:

- **Dimension value lookups** use your security context - users only see values from their tenant's data
- **Generated queries** are executed with the same security context
- **Input validation** (Step 0) rejects injection attempts, off-topic requests, and malicious prompts
- **Rate limiting** prevents abuse of server API keys

## Quick Start

1. [Set up AI endpoints](/ai/adding-ai-endpoints/) in your server
2. Configure the client to use AI features:

```typescript
<CubeProvider
  apiOptions={{ apiUrl: '/cubejs-api/v1' }}
  features={{
    enableAI: true,
    aiEndpoint: '/api/ai/generate'
  }}
>
  <AnalysisBuilder />
</CubeProvider>
```

## Next Steps

- [Claude Code Plugin](/ai/claude-code-plugin/) - Query your semantic layer with natural language from Claude Code
- [Query Generation](/ai/query-generation/) - Deep dive into natural language query generation
- [Query Analysis](/ai/query-analysis/) - Learn about EXPLAIN plan analysis
- [Adding AI Endpoints](/ai/adding-ai-endpoints/) - Implement AI routes in your server
