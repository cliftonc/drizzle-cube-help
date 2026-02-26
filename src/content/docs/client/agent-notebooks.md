---
title: Agent Notebooks
description: Add an agentic AI notebook component to your React application
---

The `AgenticNotebook` component provides a complete agentic AI notebook experience — a split-panel interface with a canvas of chart and text blocks on the left, and a chat panel on the right. Users ask questions, and the agent creates visualizations and analysis blocks directly in the notebook.

## Prerequisites

Before using the client component, you need:

1. **Server-side agent endpoint enabled** — See [Agent Notebooks (Server)](/ai/agent-notebooks/) for setup instructions
2. **CubeProvider** wrapping your app — The notebook uses the same API context as all other drizzle-cube components

## Installation

The notebook components are included in the main client package. No additional dependencies are needed:

```bash
npm install drizzle-cube react react-dom recharts react-grid-layout
```

Import the CSS (if you haven't already):

```typescript
import 'drizzle-cube/client/styles.css'
```

## Quick Start

```tsx
import { CubeProvider, AgenticNotebook } from 'drizzle-cube/client'
import 'drizzle-cube/client/styles.css'

function App() {
  return (
    <CubeProvider
      apiOptions={{ apiUrl: '/cubejs-api/v1' }}
      token={authToken}
    >
      <AgenticNotebook className="dc:h-screen" />
    </CubeProvider>
  )
}
```

That's it — the notebook handles agent communication, block rendering, and chat state internally.

## AgenticNotebook Props

```typescript
interface AgenticNotebookProps {
  /** Initial config to restore (for saved notebooks) */
  config?: NotebookConfig

  /** Override default agent endpoint (default: apiUrl + '/agent/chat') */
  agentEndpoint?: string

  /** Client-side API key (for demo/try-site use) */
  agentApiKey?: string

  /** Callback when notebook state changes (for persistence) */
  onSave?: (config: NotebookConfig) => void | Promise<void>

  /** Callback when dirty state changes */
  onDirtyStateChange?: (isDirty: boolean) => void

  /** Color palette for charts */
  colorPalette?: ColorPalette

  /** Additional CSS class name */
  className?: string
}
```

## Features

### Split-Panel Layout

The notebook renders as a resizable two-panel layout:

- **Left panel** — Notebook canvas displaying chart and markdown blocks
- **Right panel** — Chat interface for interacting with the agent

Users can resize the split by dragging the divider.

### Block Types

The agent creates two types of blocks in the notebook canvas:

**Chart blocks** — Interactive visualizations powered by `AnalyticsPortlet`. These render the same charts available throughout drizzle-cube (bar, line, area, pie, table, etc.):

```typescript
interface PortletBlock {
  id: string
  type: 'portlet'
  title: string
  query: string           // JSON string of CubeQuery
  chartType: ChartType
  chartConfig?: ChartAxisConfig
  displayConfig?: ChartDisplayConfig
}
```

**Markdown blocks** — Text content for analysis, explanations, and commentary:

```typescript
interface MarkdownBlock {
  id: string
  type: 'markdown'
  title?: string
  content: string         // GitHub-flavored markdown
}
```

### Block Management

Each block has a hover toolbar with controls to:
- **Move up/down** — Reorder blocks in the notebook
- **Remove** — Delete a block from the canvas

### Chat Panel

The chat panel displays the full conversation history including:
- User messages
- Agent responses (streamed in real-time)
- Tool call indicators showing what the agent is doing (discovering cubes, running queries, etc.)

A **Clear** button resets both the chat history and the notebook canvas.

### Multi-Turn Conversations

The agent maintains context across turns using a session ID. Follow-up questions reference previous results:

> **User:** Show me employee count by department
>
> **Agent:** *creates bar chart*
>
> **User:** Now add average salary to that
>
> **Agent:** *updates chart with both measures*

## Persistence

### Saving Notebooks

Pass an `onSave` callback to persist the notebook state. The callback fires 1 second after changes stabilize (debounced):

```tsx
function NotebookPage() {
  const handleSave = async (config: NotebookConfig) => {
    await fetch('/api/notebooks/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
  }

  return (
    <AgenticNotebook
      onSave={handleSave}
      onDirtyStateChange={(isDirty) => {
        // Show unsaved indicator in your UI
      }}
    />
  )
}
```

### Loading Saved Notebooks

Pass a previously saved config to restore the notebook state:

```tsx
function NotebookPage({ savedConfig }: { savedConfig: NotebookConfig }) {
  return (
    <AgenticNotebook
      config={savedConfig}
      onSave={handleSave}
    />
  )
}
```

### NotebookConfig Shape

The persistence format includes blocks and chat messages:

```typescript
interface NotebookConfig {
  blocks: NotebookBlock[]    // Chart and markdown blocks
  messages: ChatMessage[]    // Chat history
}
```

This is a plain JSON object — store it in your database, localStorage, or any persistence layer.

## Client-Side API Key

For development or demo environments, you can pass an API key from the client instead of configuring it on the server:

```tsx
<AgenticNotebook agentApiKey="sk-ant-api03-..." />
```

This requires `allowClientApiKey: true` in your server agent config. See [Server Configuration](/ai/agent-notebooks/#client-side-key-override-development--demo) for details.

## Custom Agent Endpoint

By default, the notebook sends requests to `{apiUrl}/agent/chat` (derived from CubeProvider). Override this if your agent endpoint is at a different path:

```tsx
<AgenticNotebook agentEndpoint="/api/my-custom-agent" />
```

## Advanced: Building a Custom Notebook

If you need full control over the notebook experience, you can use the lower-level building blocks directly instead of the pre-built `AgenticNotebook` component.

### NotebookStoreProvider

The store manages all notebook state (blocks, messages, streaming status). Wrap your custom UI with the provider:

```tsx
import {
  NotebookStoreProvider,
  useNotebookStore,
  selectBlocks,
  selectMessages,
  selectChatActions,
  selectBlockActions
} from 'drizzle-cube/client'
import { useShallow } from 'zustand/react/shallow'

function CustomNotebook() {
  return (
    <NotebookStoreProvider>
      <NotebookCanvas />
      <ChatPanel />
    </NotebookStoreProvider>
  )
}
```

### useNotebookStore

Access store state and actions inside the provider:

```tsx
function NotebookCanvas() {
  const blocks = useNotebookStore(selectBlocks)
  const { removeBlock, moveBlock } = useNotebookStore(useShallow(selectBlockActions))

  return (
    <div>
      {blocks.map(block => (
        <div key={block.id}>
          {block.type === 'portlet' && <AnalyticsPortlet config={block} />}
          {block.type === 'markdown' && <div>{block.content}</div>}
          <button onClick={() => removeBlock(block.id)}>Remove</button>
        </div>
      ))}
    </div>
  )
}
```

### useAgentChat

The chat hook handles SSE communication with the agent endpoint:

```tsx
import { useAgentChat } from 'drizzle-cube/client'

function ChatPanel() {
  const {
    addBlock,
    addMessage,
    appendToLastAssistantMessage,
    addToolCallToLastAssistant,
    updateLastToolCall,
    setIsStreaming,
    setSessionId
  } = useNotebookStore(useShallow(selectChatActions))

  const { sendMessage, isStreaming, abort } = useAgentChat({
    onTextDelta: (text) => appendToLastAssistantMessage(text),
    onToolStart: (id, name, input) =>
      addToolCallToLastAssistant({ id, name, input, status: 'running' }),
    onToolResult: (id, name, result) =>
      updateLastToolCall({ id, status: 'complete', result }),
    onAddPortlet: (data) => addBlock(data),
    onAddMarkdown: (data) => addBlock(data),
    onDone: (sessionId) => {
      setSessionId(sessionId)
      setIsStreaming(false)
    },
    onError: (message) => {
      console.error('Agent error:', message)
      setIsStreaming(false)
    }
  })

  const handleSend = (text: string) => {
    addMessage({ id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() })
    addMessage({ id: crypto.randomUUID(), role: 'assistant', content: '', timestamp: Date.now() })
    setIsStreaming(true)
    sendMessage(text, sessionId)
  }

  // Render your custom chat UI...
}
```

### useAgentChat Options

```typescript
interface UseAgentChatOptions {
  /** Override default agent endpoint */
  agentEndpoint?: string

  /** Client-side API key */
  agentApiKey?: string

  /** Streaming text from the agent */
  onTextDelta: (text: string) => void

  /** Tool call started */
  onToolStart: (id: string, name: string, input?: unknown) => void

  /** Tool call completed */
  onToolResult: (id: string, name: string, result?: unknown) => void

  /** Agent created a chart block */
  onAddPortlet: (data: PortletBlock) => void

  /** Agent created a markdown block */
  onAddMarkdown: (data: MarkdownBlock) => void

  /** Agent finished (returns sessionId for follow-up) */
  onDone: (sessionId: string) => void

  /** An agentic turn completed (between tool-use rounds) */
  onTurnComplete?: () => void

  /** Error occurred */
  onError: (message: string) => void
}

interface UseAgentChatResult {
  /** Send a message to the agent */
  sendMessage: (content: string, sessionId?: string | null) => Promise<void>

  /** Whether the agent is currently streaming */
  isStreaming: boolean

  /** Abort the current stream */
  abort: () => void
}
```

### Store State Reference

Full store state and actions:

```typescript
interface NotebookStore {
  // State
  blocks: NotebookBlock[]
  messages: ChatMessage[]
  isStreaming: boolean
  sessionId: string | null
  inputValue: string

  // Block actions
  addBlock: (block: NotebookBlock) => void
  removeBlock: (id: string) => void
  moveBlock: (id: string, direction: 'up' | 'down') => void

  // Chat actions
  addMessage: (message: ChatMessage) => void
  appendToLastAssistantMessage: (text: string) => void
  addToolCallToLastAssistant: (toolCall: ToolCallRecord) => void
  updateLastToolCall: (update: Partial<ToolCallRecord>) => void

  // Session/UI actions
  setIsStreaming: (streaming: boolean) => void
  setSessionId: (id: string | null) => void
  setInputValue: (value: string) => void

  // Persistence
  save: () => NotebookConfig
  load: (config: NotebookConfig) => void
  reset: () => void
}
```

### Available Selectors

Use selectors with `useShallow` for optimal re-renders:

```typescript
import {
  selectBlocks,        // (state) => state.blocks
  selectMessages,      // (state) => state.messages
  selectIsStreaming,   // (state) => state.isStreaming
  selectSessionId,     // (state) => state.sessionId
  selectInputValue,    // (state) => state.inputValue
  selectChatState,     // (state) => { messages, isStreaming, inputValue }
  selectChatActions,   // (state) => { addMessage, appendTo..., set... }
  selectBlockActions   // (state) => { addBlock, removeBlock, moveBlock }
} from 'drizzle-cube/client'
```

## Theming

The notebook uses the same CSS variable theming as all drizzle-cube components. Customize via `--dc-*` variables:

```css
:root {
  --dc-bg-primary: #1a1a2e;
  --dc-bg-secondary: #16213e;
  --dc-text-primary: #e0e0e0;
  --dc-surface: #1f2937;
  --dc-border: #374151;
  --dc-primary: #6366f1;
}
```

See [Theming](/client/theming/) for the full list of CSS variables.

## Complete Integration Example

```tsx
import React, { useState, useEffect } from 'react'
import {
  CubeProvider,
  AgenticNotebook,
  type NotebookConfig
} from 'drizzle-cube/client'
import 'drizzle-cube/client/styles.css'

function NotebookPage({ notebookId }: { notebookId: string }) {
  const [config, setConfig] = useState<NotebookConfig | undefined>()
  const [isDirty, setIsDirty] = useState(false)

  // Load saved notebook
  useEffect(() => {
    fetch(`/api/notebooks/${notebookId}`)
      .then(res => res.json())
      .then(setConfig)
  }, [notebookId])

  // Save notebook
  const handleSave = async (config: NotebookConfig) => {
    await fetch(`/api/notebooks/${notebookId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
  }

  return (
    <CubeProvider
      apiOptions={{ apiUrl: '/cubejs-api/v1' }}
      token={authToken}
    >
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header>
          <h1>Notebook</h1>
          {isDirty && <span>Unsaved changes</span>}
        </header>
        <AgenticNotebook
          config={config}
          onSave={handleSave}
          onDirtyStateChange={setIsDirty}
          className="dc:flex-1"
        />
      </div>
    </CubeProvider>
  )
}
```

## Next Steps

- [Server Setup](/ai/agent-notebooks/) — Enable the agent endpoint on your server
- [Semantic Metadata](/ai/semantic-metadata/) — Improve agent accuracy with descriptive cube metadata
- [Dashboards](/client/dashboards/) — Traditional dashboard layouts
- [Theming](/client/theming/) — Customize the notebook appearance
