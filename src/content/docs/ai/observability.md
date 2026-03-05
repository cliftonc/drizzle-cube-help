---
title: Observability (Langfuse)
description: Add LLM observability, tracing, and user feedback scoring to agent notebooks with Langfuse
---

Agent notebooks support observability hooks that let you trace every LLM call, tool execution, and user feedback score. This guide shows how to integrate with [Langfuse](https://langfuse.com), but the hook-based architecture works with any observability platform.

## What You Get

When observability is enabled, each agent chat session produces:

| Langfuse Concept | What It Captures |
|------------------|-----------------|
| **Trace** | One per chat request — user message, session grouping, total duration |
| **Generation** | One per LLM turn — model, token usage, latency, stop reason |
| **Span** | One per tool call — tool name, duration, success/error |
| **Score** | User feedback (thumbs up/down) attached to a trace |

Sessions group all traces from the same conversation, so you can follow multi-turn interactions.

## Architecture

```
Agent Chat Request
    ↓
handleAgentChat() ──→ onChatStart()     → Langfuse Trace
    ↓
Claude API Call   ──→ onGenerationEnd()  → Langfuse Generation
    ↓
Tool Execution    ──→ onToolEnd()        → Langfuse Span
    ↓
Response Complete ──→ onChatEnd()        → Trace Update + Flush
    ↓
User Feedback     ──→ Score Endpoint     → Langfuse Score
```

All hooks are fire-and-forget — errors in observability never break the agent.

## Prerequisites

1. A [Langfuse](https://langfuse.com) account (cloud or self-hosted)
2. Working [agent notebooks](/ai/agent-notebooks/) configuration
3. Your Langfuse public and secret keys

## Environment Variables

```bash
LANGFUSE_ENABLED=true
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com  # Optional, defaults to cloud
```

## Server Setup

### 1. Create a Langfuse Tracer

The tracer batches events in memory and flushes them to the Langfuse Ingestion API in a single POST. No heavy SDK required — just `fetch()`.

```typescript
// langfuse.ts
import type { AgentObservabilityHooks } from 'drizzle-cube'

interface LangfuseConfig {
  publicKey: string
  secretKey: string
  baseUrl?: string
  environment?: string
}

interface IngestionEvent {
  id: string
  type: 'trace-create' | 'generation-create' | 'span-create' | 'score-create'
  timestamp: string
  body: Record<string, unknown>
}

export class LangfuseTracer {
  private batch: IngestionEvent[] = []
  private publicKey: string
  private secretKey: string
  private baseUrl: string
  private environment: string | undefined

  constructor(config: LangfuseConfig) {
    this.publicKey = config.publicKey
    this.secretKey = config.secretKey
    this.baseUrl = (config.baseUrl ?? 'https://cloud.langfuse.com').replace(/\/+$/, '')
    this.environment = config.environment
  }

  createTrace(params: {
    id: string
    name: string
    timestamp?: Date
    input?: unknown
    output?: unknown
    metadata?: Record<string, unknown>
    sessionId?: string
    userId?: string
    tags?: string[]
  }): void {
    this.batch.push({
      id: crypto.randomUUID(),
      type: 'trace-create',
      timestamp: new Date().toISOString(),
      body: {
        id: params.id,
        name: params.name,
        timestamp: (params.timestamp ?? new Date()).toISOString(),
        ...(this.environment && { environment: this.environment }),
        ...(params.input !== undefined && { input: params.input }),
        ...(params.output !== undefined && { output: params.output }),
        ...(params.metadata && { metadata: params.metadata }),
        ...(params.sessionId && { sessionId: params.sessionId }),
        ...(params.userId && { userId: params.userId }),
        ...(params.tags && params.tags.length > 0 && { tags: params.tags }),
      },
    })
  }

  createGeneration(params: {
    traceId: string
    name: string
    model: string
    provider: string
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
    startTime: Date
    endTime: Date
    metadata?: Record<string, unknown>
  }): void {
    this.batch.push({
      id: crypto.randomUUID(),
      type: 'generation-create',
      timestamp: new Date().toISOString(),
      body: {
        id: crypto.randomUUID(),
        traceId: params.traceId,
        name: params.name,
        model: params.model,
        modelParameters: { provider: params.provider },
        ...(params.usage && { usage: params.usage }),
        startTime: params.startTime.toISOString(),
        endTime: params.endTime.toISOString(),
        ...(this.environment && { environment: this.environment }),
        level: 'DEFAULT',
        ...(params.metadata && { metadata: params.metadata }),
      },
    })
  }

  createSpan(params: {
    traceId: string
    name: string
    startTime: Date
    endTime: Date
    level?: 'DEFAULT' | 'ERROR'
    metadata?: Record<string, unknown>
  }): void {
    this.batch.push({
      id: crypto.randomUUID(),
      type: 'span-create',
      timestamp: new Date().toISOString(),
      body: {
        id: crypto.randomUUID(),
        traceId: params.traceId,
        name: params.name,
        startTime: params.startTime.toISOString(),
        endTime: params.endTime.toISOString(),
        level: params.level ?? 'DEFAULT',
        ...(this.environment && { environment: this.environment }),
        ...(params.metadata && { metadata: params.metadata }),
      },
    })
  }

  createScore(params: {
    traceId: string
    name: string
    value: number
    dataType?: 'NUMERIC' | 'CATEGORICAL' | 'BOOLEAN'
    comment?: string
  }): void {
    this.batch.push({
      id: crypto.randomUUID(),
      type: 'score-create',
      timestamp: new Date().toISOString(),
      body: {
        id: crypto.randomUUID(),
        traceId: params.traceId,
        name: params.name,
        value: params.value,
        ...(params.dataType && { dataType: params.dataType }),
        ...(params.comment && { comment: params.comment }),
      },
    })
  }

  async flush(): Promise<void> {
    if (this.batch.length === 0) return
    const events = this.batch.splice(0)
    try {
      const auth = Buffer.from(`${this.publicKey}:${this.secretKey}`).toString('base64')
      await fetch(`${this.baseUrl}/api/public/ingestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({ batch: events }),
      })
    } catch {
      // Tracing must never break the app
    }
  }
}
```

### 2. Create Observability Hooks

Wire the tracer to the `AgentObservabilityHooks` interface that the agent handler expects:

```typescript
// langfuse.ts (continued)

export function createLangfuseObservability(tracer: LangfuseTracer): AgentObservabilityHooks {
  return {
    onChatStart(event) {
      tracer.createTrace({
        id: event.traceId,
        name: 'notebook-agent',
        timestamp: new Date(),
        input: { message: event.message },
        sessionId: event.sessionId,
        tags: ['notebook'],
        metadata: {
          model: event.model,
          historyLength: event.historyLength,
        },
      })
    },

    onGenerationEnd(event) {
      tracer.createGeneration({
        traceId: event.traceId,
        name: `notebook-turn-${event.turn}`,
        model: event.model,
        provider: 'anthropic',
        usage: {
          promptTokens: event.inputTokens ?? 0,
          completionTokens: event.outputTokens ?? 0,
          totalTokens: (event.inputTokens ?? 0) + (event.outputTokens ?? 0),
        },
        startTime: new Date(Date.now() - event.durationMs),
        endTime: new Date(),
        metadata: { stopReason: event.stopReason },
      })
      tracer.flush()
    },

    onToolEnd(event) {
      const endTime = new Date()
      tracer.createSpan({
        traceId: event.traceId,
        name: `tool:${event.toolName}`,
        startTime: new Date(endTime.getTime() - event.durationMs),
        endTime,
        level: event.isError ? 'ERROR' : 'DEFAULT',
        metadata: { toolUseId: event.toolUseId, turn: event.turn },
      })
    },

    onChatEnd(event) {
      tracer.createTrace({
        id: event.traceId,
        name: 'notebook-agent',
        output: {
          totalTurns: event.totalTurns,
          durationMs: event.durationMs,
          ...(event.error && { error: event.error }),
        },
      })
      tracer.flush()
    },
  }
}
```

### 3. Wire Into Your Adapter

```typescript
// app.ts
import { createCubeApp } from 'drizzle-cube/adapters/hono'
import { LangfuseTracer, createLangfuseObservability } from './langfuse'

// Initialize tracer (returns null if env vars not set)
const langfuseTracer = process.env.LANGFUSE_ENABLED === 'true'
  && process.env.LANGFUSE_PUBLIC_KEY
  && process.env.LANGFUSE_SECRET_KEY
  ? new LangfuseTracer({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL,
      environment: process.env.NODE_ENV || 'development',
    })
  : null

const app = createCubeApp({
  cubes: allCubes,
  drizzle: db,
  schema,
  extractSecurityContext,
  agent: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-6',
    // Conditionally add observability hooks
    ...(langfuseTracer && {
      observability: createLangfuseObservability(langfuseTracer),
    }),
  },
})
```

:::note
Make sure your environment variables are loaded **before** importing your app module. With ES modules, static imports are hoisted, so use `dotenv.config()` followed by a dynamic `await import('./app.js')` in your entry point.
:::

## User Feedback Scoring

The `AgenticNotebook` component has built-in thumbs up/down buttons. To connect them to Langfuse, add a score endpoint and pass the `onScore` callback.

### Score Endpoint

```typescript
// In your Hono app
app.post('/api/agent/score', async (c) => {
  const { traceId, value, comment } = await c.req.json()

  if (!traceId || typeof value !== 'number') {
    return c.json({ error: 'traceId and numeric value are required' }, 400)
  }

  if (!langfuseTracer) {
    return c.json({ success: true }) // No-op when Langfuse not configured
  }

  langfuseTracer.createScore({
    traceId,
    name: 'user-feedback',
    value,
    dataType: 'BOOLEAN',
    comment,
  })

  await langfuseTracer.flush()
  return c.json({ success: true })
})
```

### Client Integration

Pass `onScore` to the `AgenticNotebook` component:

```tsx
import { AgenticNotebook } from 'drizzle-cube/client'

function NotebookPage() {
  const handleScore = async (data: { traceId: string; value: number; comment?: string }) => {
    await fetch('/api/agent/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  }

  return (
    <AgenticNotebook
      onScore={handleScore}
      // ... other props
    />
  )
}
```

The component handles the UX automatically — thumbs up/down buttons appear after each agent response, and the `traceId` from the agent's SSE `done` event is passed through.

## Observability Hooks Reference

The `AgentObservabilityHooks` interface provides four lifecycle hooks:

### onChatStart

Called when the agent begins processing a message.

```typescript
onChatStart?(event: {
  traceId: string       // Unique trace ID for this request
  sessionId?: string    // Groups traces in the same conversation
  message: string       // User's message
  model: string         // Model being used
  historyLength: number // Number of prior messages
}): void
```

### onGenerationEnd

Called after each LLM API call completes (once per agentic turn).

```typescript
onGenerationEnd?(event: {
  traceId: string
  turn: number          // Which turn (1-based)
  model: string
  stopReason: string    // 'end_turn', 'tool_use', etc.
  inputTokens?: number
  outputTokens?: number
  durationMs: number
}): void
```

### onToolEnd

Called after each tool execution.

```typescript
onToolEnd?(event: {
  traceId: string
  turn: number
  toolName: string      // e.g. 'execute_query', 'add_portlet'
  toolUseId: string     // Anthropic tool_use block ID
  isError: boolean
  durationMs: number
}): void
```

### onChatEnd

Called when the agent finishes (success or error).

```typescript
onChatEnd?(event: {
  traceId: string
  sessionId?: string
  totalTurns: number
  durationMs: number
  error?: string        // Present if the agent errored
}): void
```

## Using Other Platforms

The observability hooks are platform-agnostic. To use a different provider, implement the same `AgentObservabilityHooks` interface:

```typescript
// Example: simple console logger
const consoleObservability: AgentObservabilityHooks = {
  onChatStart(e)     { console.log(`[chat] ${e.traceId} started`) },
  onGenerationEnd(e) { console.log(`[gen]  turn ${e.turn}: ${e.outputTokens} tokens`) },
  onToolEnd(e)       { console.log(`[tool] ${e.toolName}: ${e.durationMs}ms`) },
  onChatEnd(e)       { console.log(`[chat] ${e.traceId} done in ${e.durationMs}ms`) },
}
```

## Next Steps

- [Agent Notebooks](/ai/agent-notebooks/) — Set up the agent endpoint and client component
- [Semantic Metadata](/ai/semantic-metadata/) — Improve agent accuracy with descriptive cube metadata
- [Langfuse Documentation](https://langfuse.com/docs) — Dashboards, evaluations, and prompt management
