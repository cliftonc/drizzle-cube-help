---
title: MCP App (Interactive Charts)
description: Return interactive chart visualisations from MCP tool calls using the MCP Apps protocol
---

When AI agents call the `load` tool, drizzle-cube can return an **interactive chart** directly inside the conversation. The chart renders in a sandboxed iframe using the [MCP Apps protocol](https://modelcontextprotocol.io/docs/extensions/apps), supported by Claude Desktop, Claude.ai, ChatGPT, and other MCP-compatible hosts.

The AI chooses the best chart type based on context — no hardcoded rules needed.

## How It Works

```
AI calls load tool → data returned + chart hint
                         ↓
Host renders ui://drizzle-cube/visualization.html in iframe
                         ↓
App auto-selects chart type (or uses AI's hint) → interactive chart
                         ↓
User can switch chart types via toolbar
```

The `load` tool's response includes both:
- **Text content** — JSON data for text-only clients (unchanged)
- **UI resource** — an interactive React app with 8 chart types

## Enabling MCP App

MCP App is **opt-in**. Add `app: true` to your MCP configuration:

### Framework Adapters

```typescript
// Express
const router = createCubeRouter({
  cubes: [ordersCube, customersCube],
  drizzle: db,
  extractSecurityContext,
  mcp: { enabled: true, app: true }  // ← enable MCP App
})

// Hono
const app = createCubeApp({
  cubes, drizzle: db, extractSecurityContext,
  mcp: { enabled: true, app: true }
})

// Fastify
await fastify.register(cubePlugin, {
  cubes, drizzle: db, extractSecurityContext,
  mcp: { enabled: true, app: true }
})

// Next.js
const handlers = createCubeHandlers({
  cubes, drizzle: db, extractSecurityContext,
  mcp: { enabled: true, app: true }
})
```

### Composable MCP Tools

```typescript
import { getCubeTools } from 'drizzle-cube/mcp'

const cubeTools = getCubeTools({
  semanticLayer,
  getSecurityContext: async (meta) => ({ orgId: meta?.authInfo?.orgId }),
  app: true  // ← enable MCP App
})
```

## AI Chart Hints

The `load` tool accepts an optional `chart` field that lets the AI control the rendered chart. The AI already understands the user's intent and the data shape — it's the best judge of what chart to show.

```json
{
  "query": {
    "measures": ["Employees.count"],
    "dimensions": ["Departments.name"]
  },
  "chart": {
    "type": "pie",
    "xAxis": "Departments.name",
    "yAxis": ["Employees.count"],
    "title": "Employees by Department"
  }
}
```

### Chart Hint Fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Chart type: `bar`, `line`, `area`, `pie`, `scatter`, `kpiNumber`, `table`, `treemap` |
| `xAxis` | `string` | Field for X axis (dimension or measure for scatter) |
| `yAxis` | `string[]` | Fields for Y axis (measures) |
| `title` | `string` | Chart title displayed above the chart |

If no `chart` hint is provided, the app auto-selects based on the query shape:

| Data Shape | Auto-selected Chart |
|------------|-------------------|
| Single aggregate (1 row, no dimensions) | KPI Number |
| Time series with granularity | Line |
| Few categories (≤10), single measure | Pie |
| Categories with measures (≤30 rows) | Bar |
| Many rows | Table |

### AI Chart Selection Guidelines

The `load` tool description includes guidelines so the AI knows when to use each chart type:

| Intent | Chart Type | Example |
|--------|-----------|---------|
| Single number / KPI | `kpiNumber` | Total revenue, active users |
| Trend over time | `line` | Monthly sales, daily signups |
| Cumulative trend | `area` | Running total, growth curves |
| Category comparison | `bar` | Revenue by region, counts by status |
| Part-of-whole / share | `pie` | Market share, category breakdown (≤10 items) |
| Correlation between metrics | `scatter` | Salary vs headcount (set both axes to measures) |
| Hierarchical breakdown | `treemap` | Budget allocation, storage usage |
| Raw data / detail | `table` | Transaction logs, employee lists |

## Available Chart Types

The MCP App bundles 8 chart types using [Recharts](https://recharts.org):

| Type | Best For |
|------|----------|
| `bar` | Comparing categories side-by-side |
| `line` | Trends and time series |
| `area` | Cumulative trends, filled line charts |
| `pie` | Part-of-whole with ≤10 categories |
| `scatter` | Correlation between two measures |
| `kpiNumber` | Single headline metric |
| `table` | Detailed data, many columns |
| `treemap` | Hierarchical size comparison |

Users can switch between available chart types using the toolbar at the top of the chart.

## Security

- **Security context preserved** — when the MCP App calls `load` via `callServerTool` for re-queries, it goes through the same MCP endpoint, so `extractSecurityContext` is called as normal
- **Sandboxed iframe** — the app runs in a host-enforced sandboxed iframe with no DOM/cookie access
- **Static HTML** — the chart app is bundled at build time; no user input is used in HTML generation
- **Opt-in only** — `app: false` by default, no behaviour change unless explicitly enabled

## Host Compatibility

The MCP App renders in any host that supports the [MCP Apps protocol](https://modelcontextprotocol.io/docs/extensions/apps):

- Claude Desktop
- Claude.ai
- ChatGPT
- VS Code GitHub Copilot
- Any host implementing the MCP Apps spec

For text-only clients (terminals, APIs), the `load` tool continues to return JSON data as before — the UI is an enhancement, not a replacement.

## Theming

The chart app automatically adapts to the host's theme (light/dark mode, accent colours, fonts) via the MCP Apps styling protocol. Host CSS variables are bridged to drizzle-cube's `--dc-*` theme system.
