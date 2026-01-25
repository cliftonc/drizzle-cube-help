---
title: AI Features Overview
description: Enhance your analytics with AI-powered query generation and execution plan analysis
---

Drizzle Cube provides two approaches for AI-powered analytics:

1. **Built-in MCP Endpoints** - Zero-config AI readiness using server-side NLU (no LLM required)
2. **Custom AI Endpoints** - Full LLM-powered query generation (you implement with your preferred provider)

## Built-in MCP Server

All framework adapters include a **built-in MCP server** at `/mcp` that lets AI agents discover and query your data:

| Tool | Purpose |
|------|---------|
| `drizzle_cube_discover` | Find relevant cubes based on topic or intent |
| `drizzle_cube_validate` | Validate queries and get auto-corrections |
| `drizzle_cube_load` | Execute queries and return results |

Connect Claude, ChatGPT, n8n, or any MCP-compatible client to your semantic layer.

[Learn more about the MCP Server →](/ai/mcp-endpoints/)

---

## Custom AI Endpoints

For more sophisticated natural language understanding, you can implement custom AI endpoints using an LLM provider like Google Gemini.

> **Note**: Custom AI endpoints (`/api/ai/*`) are **not included** in the drizzle-cube package. You must implement them yourself. We provide prompt templates, type definitions, and a complete reference implementation.

## What Drizzle Cube Provides

| Component | Included | Description |
|-----------|----------|-------------|
| `/mcp/*` endpoints | ✅ Built-in | MCP endpoints for AI agents (all adapters) |
| `/cubejs-api/v1/explain` | ✅ Built-in | Execution plan endpoint (all adapters) |
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
┌────────────────────────────────────────────────────────────────────┐
│                        Your Application                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────┐ │
│  │  Cube API       │  │  MCP Server      │  │  AI Routes        │ │
│  │  /cubejs-api/v1 │  │  /mcp (built-in) │  │  /api/ai (custom) │ │
│  │                 │  │                  │  │                   │ │
│  │  • /load        │  │  • meta          │  │  • /generate      │ │
│  │  • /meta        │  │  • discover      │  │  • /explain/...   │ │
│  │  • /explain     │  │  • validate      │  │  • /health        │ │
│  │  • /batch       │  │  • load          │  │                   │ │
│  └─────────────────┘  └──────────────────┘  └───────────────────┘ │
│           │                    │                     │             │
│           └────────────────────┴─────────────────────┘             │
│                                │                                   │
│                       ┌────────▼────────┐                          │
│                       │ Semantic Layer  │                          │
│                       │ + Security Ctx  │                          │
│                       └─────────────────┘                          │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐        ┌──────────────────┐
  │   MCP Endpoints │        │  Custom AI       │
  │   (Built-in)    │        │  (You implement) │
  ├─────────────────┤        ├──────────────────┤
  │ • No LLM needed │        │ • LLM required   │
  │ • Zero config   │        │ • Customizable   │
  │ • Server-side   │        │ • Provider choice│
  │   NLU           │        │ • Full control   │
  └─────────────────┘        └──────────────────┘
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

### Getting Started with AI
- [MCP Endpoints](/ai/mcp-endpoints/) - Built-in AI-ready endpoints (no LLM required)
- [Adding Semantic Metadata](/ai/semantic-metadata/) - Make your cubes AI-friendly
- [Connect Claude Desktop](/ai/claude-desktop-setup/) - Step-by-step connection guide

### Advanced AI Features
- [Claude Code Plugin](/ai/claude-code-plugin/) - Query your semantic layer from Claude Code
- [Query Generation](/ai/query-generation/) - LLM-powered natural language query generation
- [Query Analysis](/ai/query-analysis/) - EXPLAIN plan analysis with AI recommendations
- [Adding AI Endpoints](/ai/adding-ai-endpoints/) - Implement custom AI routes
