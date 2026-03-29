---
title: MCP App (Interactive Charts)
description: Return interactive chart visualisations from MCP tool calls using the MCP Apps protocol
---

When AI agents call the `chart` tool, drizzle-cube returns an **interactive chart** directly inside the conversation. The chart renders in a sandboxed iframe using the [MCP Apps protocol](https://modelcontextprotocol.io/docs/extensions/apps), supported by Claude Desktop, Claude.ai, ChatGPT, and other MCP-compatible hosts.

The `load` tool returns data as text only (no chart UI). Use `chart` when you want visualization.

The AI chooses the best chart type based on context — no hardcoded rules needed.

## How It Works

```
AI calls chart tool → data returned + chart hint
                         ↓
Host renders ui://drizzle-cube/visualization.html in iframe
                         ↓
App auto-selects chart type (or uses AI's hint) → interactive chart
                         ↓
User can switch chart types via toolbar
```

The `chart` tool's response includes both:
- **Text content** — JSON data for text-only clients
- **UI resource** — an interactive React app with 20+ chart types

The `load` tool returns text content only — use it when you need raw data without visualization.

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

The `chart` tool accepts an optional `chart` field that lets the AI control the rendered chart. The AI already understands the user's intent and the data shape — it's the best judge of what chart to show.

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

The `chart` tool description includes guidelines so the AI knows when to use each chart type:

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

The MCP App uses the same chart components as the drizzle-cube dashboard, supporting 20+ chart types:

| Type | Best For |
|------|----------|
| `bar` | Comparing categories side-by-side |
| `line` | Trends and time series |
| `area` | Cumulative trends, filled line charts |
| `pie` | Part-of-whole with ≤10 categories |
| `scatter` | Correlation between two measures |
| `bubble` | Three-variable scatter plots |
| `kpiNumber` | Single headline metric |
| `kpiDelta` | Metric with change indicator |
| `table` | Detailed data, many columns |
| `treemap` | Hierarchical size comparison |
| `radar` | Multi-dimensional comparison |
| `funnel` | Conversion funnel stages |
| `waterfall` | Incremental positive/negative values |
| `gauge` | Single value against a target |
| `boxPlot` | Statistical distribution |
| `candlestick` | Financial OHLC data |
| `activityGrid` | Calendar-style activity heatmap |
| `radialBar` | Circular bar comparison |
| `measureProfile` | Statistical measure overview |

Users can switch between available chart types using a dropdown at the top of the chart. Only chart types suitable for the current data shape are enabled.

## Security

- **Security context preserved** — when the MCP App calls `chart` via `callServerTool` for re-queries, it goes through the same MCP endpoint, so `extractSecurityContext` is called as normal
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

For text-only clients (terminals, APIs), use the `load` tool which returns JSON data without UI. The `chart` tool adds visualization as an enhancement.

## Theming

The chart app automatically adapts to the host's theme (light/dark mode, accent colours, fonts) via the MCP Apps styling protocol. Host CSS variables are bridged to drizzle-cube's `--dc-*` theme system.
