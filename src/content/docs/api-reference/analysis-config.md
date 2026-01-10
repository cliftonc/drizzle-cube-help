---
title: AnalysisConfig Reference
description: Complete reference for the AnalysisConfig format used for persisting analysis state
---

The `AnalysisConfig` type is the canonical format for persisting analysis state in drizzle-cube. It's used for:

- **localStorage persistence** (standalone AnalysisBuilder)
- **Share URLs** (compressed config in URL hash)
- **Dashboard portlets** (via `analysisConfig` field)

## Design Principles

1. **Executable queries** - The `query` field can be sent directly to the server without transformation
2. **Per-mode chart config** - Each analysis mode (query, funnel) has independent chart settings
3. **No transient state** - UI state like `activeQueryIndex` is not persisted
4. **Version tracking** - The `version` field enables future migrations

## AnalysisConfig Union Type

```typescript
type AnalysisConfig = QueryAnalysisConfig | FunnelAnalysisConfig
```

The discriminator field is `analysisType`:
- `'query'` → `QueryAnalysisConfig`
- `'funnel'` → `FunnelAnalysisConfig`

## QueryAnalysisConfig

For standard queries and multi-query analysis:

```typescript
interface QueryAnalysisConfig {
  /** Always 1 for current version */
  version: 1

  /** Discriminator for query mode */
  analysisType: 'query'

  /** Active view preference */
  activeView: 'table' | 'chart'

  /** Per-mode chart configuration */
  charts: {
    query?: ChartConfig
    funnel?: ChartConfig
  }

  /**
   * The executable query.
   * - CubeQuery: Single query with measures, dimensions, filters
   * - MultiQueryConfig: Multiple queries with merge strategy
   */
  query: CubeQuery | MultiQueryConfig
}
```

### Single Query Example

```typescript
const config: QueryAnalysisConfig = {
  version: 1,
  analysisType: 'query',
  activeView: 'chart',
  charts: {
    query: {
      chartType: 'bar',
      chartConfig: {
        xAxis: ['Employees.departmentName'],
        yAxis: ['Employees.count']
      },
      displayConfig: {
        showLegend: true
      }
    }
  },
  query: {
    measures: ['Employees.count'],
    dimensions: ['Employees.departmentName'],
    filters: [
      {
        member: 'Employees.isActive',
        operator: 'equals',
        values: [true]
      }
    ]
  }
}
```

### Multi-Query Example

```typescript
const config: QueryAnalysisConfig = {
  version: 1,
  analysisType: 'query',
  activeView: 'chart',
  charts: {
    query: {
      chartType: 'line',
      chartConfig: {
        xAxis: ['Productivity.date'],
        yAxis: ['Productivity.totalLinesOfCode']
      },
      displayConfig: {}
    }
  },
  query: {
    queries: [
      {
        measures: ['Productivity.totalLinesOfCode'],
        timeDimensions: [{
          dimension: 'Productivity.date',
          granularity: 'month'
        }],
        filters: [
          { member: 'Employees.departmentName', operator: 'equals', values: ['Engineering'] }
        ]
      },
      {
        measures: ['Productivity.totalLinesOfCode'],
        timeDimensions: [{
          dimension: 'Productivity.date',
          granularity: 'month'
        }],
        filters: [
          { member: 'Employees.departmentName', operator: 'equals', values: ['Design'] }
        ]
      }
    ],
    mergeStrategy: 'concat',
    queryLabels: ['Engineering', 'Design']
  }
}
```

## FunnelAnalysisConfig

For funnel analysis with sequential step filtering:

```typescript
interface FunnelAnalysisConfig {
  /** Always 1 for current version */
  version: 1

  /** Discriminator for funnel mode */
  analysisType: 'funnel'

  /** Active view preference */
  activeView: 'table' | 'chart'

  /** Per-mode chart configuration */
  charts: {
    query?: ChartConfig
    funnel?: ChartConfig
  }

  /**
   * Server funnel query - executable as-is.
   * Contains bindingKey, timeDimension, steps[], and options.
   */
  query: ServerFunnelQuery
}
```

### Funnel Example

```typescript
const config: FunnelAnalysisConfig = {
  version: 1,
  analysisType: 'funnel',
  activeView: 'chart',
  charts: {
    funnel: {
      chartType: 'funnel',
      chartConfig: {},
      displayConfig: {
        showPercentages: true
      }
    }
  },
  query: {
    funnel: {
      bindingKey: 'Events.userId',
      timeDimension: 'Events.timestamp',
      steps: [
        {
          name: 'Page View',
          filter: { member: 'Events.eventType', operator: 'equals', values: ['page_view'] }
        },
        {
          name: 'Add to Cart',
          filter: { member: 'Events.eventType', operator: 'equals', values: ['add_to_cart'] },
          timeToConvert: 'P7D'
        },
        {
          name: 'Purchase',
          filter: { member: 'Events.eventType', operator: 'equals', values: ['purchase'] },
          timeToConvert: 'P1D'
        }
      ],
      includeTimeMetrics: true
    }
  }
}
```

## ChartConfig

Shared chart configuration used across all analysis types:

```typescript
interface ChartConfig {
  /** Chart visualization type */
  chartType: ChartType

  /** Axis field mappings */
  chartConfig: ChartAxisConfig

  /** Display preferences */
  displayConfig: ChartDisplayConfig
}
```

### ChartType Values

```typescript
type ChartType =
  | 'bar'
  | 'line'
  | 'area'
  | 'pie'
  | 'scatter'
  | 'bubble'
  | 'radar'
  | 'table'
  | 'kpiNumber'
  | 'kpiTrend'
  | 'funnel'
```

### ChartAxisConfig

```typescript
interface ChartAxisConfig {
  xAxis?: string[]      // Dimension fields for X axis
  yAxis?: string[]      // Measure fields for Y axis
  series?: string[]     // Fields for series/grouping
  sizeField?: string    // Bubble size field
  colorField?: string   // Bubble color field
}
```

### ChartDisplayConfig

```typescript
interface ChartDisplayConfig {
  showLegend?: boolean
  showGrid?: boolean
  showTooltip?: boolean
  colors?: string[]
  orientation?: 'horizontal' | 'vertical'
  stacked?: boolean
  showPercentages?: boolean
  // ... additional chart-specific options
}
```

## Charts Map Pattern

The `charts` field uses a mode-indexed map to store independent chart configurations for each analysis mode:

```typescript
charts: {
  query?: ChartConfig   // Chart settings for query mode
  funnel?: ChartConfig  // Chart settings for funnel mode
}
```

This pattern enables:
- **Mode switching** preserves chart settings
- **Different visualizations** per mode (e.g., bar chart for queries, funnel chart for funnels)
- **Clean data model** without mode-specific prefixes

### Accessing Current Mode's Chart Config

```typescript
// Get current mode's chart config
const chartConfig = config.charts[config.analysisType]

// Or with defaults
const chartConfig = config.charts[config.analysisType] ?? {
  chartType: 'bar',
  chartConfig: {},
  displayConfig: {}
}
```

## AnalysisWorkspace (localStorage)

For localStorage persistence, `AnalysisWorkspace` preserves ALL modes to prevent state loss when switching:

```typescript
interface AnalysisWorkspace {
  /** Always 1 for current version */
  version: 1

  /** Currently active analysis type */
  activeType: AnalysisType

  /** Per-mode configurations */
  modes: {
    query?: QueryAnalysisConfig
    funnel?: FunnelAnalysisConfig
  }
}
```

### Key Differences

| Format | Use Case | Preserves |
|--------|----------|-----------|
| `AnalysisConfig` | Share URLs, Portlets | Single mode |
| `AnalysisWorkspace` | localStorage | All modes |

## Type Guards

Use these helper functions to safely work with configs:

```typescript
import {
  isValidAnalysisConfig,
  isValidAnalysisWorkspace,
  isQueryConfig,
  isFunnelConfig,
  isMultiQuery,
  isSingleQuery
} from 'drizzle-cube/client'

// Validate unknown config
if (isValidAnalysisConfig(data)) {
  // data is AnalysisConfig
  if (isQueryConfig(data)) {
    // data is QueryAnalysisConfig
    if (isMultiQuery(data)) {
      // data.query is MultiQueryConfig
    }
  } else if (isFunnelConfig(data)) {
    // data is FunnelAnalysisConfig
  }
}

// Validate workspace
if (isValidAnalysisWorkspace(data)) {
  // data is AnalysisWorkspace
}
```

## Default Factories

Create empty configs with sensible defaults:

```typescript
import {
  createDefaultQueryConfig,
  createDefaultFunnelConfig,
  createDefaultConfig,
  createDefaultWorkspace
} from 'drizzle-cube/client'

// Empty query config
const queryConfig = createDefaultQueryConfig()

// Empty funnel config
const funnelConfig = createDefaultFunnelConfig()

// Config by type
const config = createDefaultConfig('funnel')

// Full workspace with both modes
const workspace = createDefaultWorkspace()
```

## ServerFunnelQuery Structure

The funnel query format sent to the server:

```typescript
interface ServerFunnelQuery {
  funnel: {
    /**
     * The dimension linking funnel steps together.
     * Simple: "Events.userId"
     * Cross-cube: [{ cube: "Signups", dimension: "userId" }, ...]
     */
    bindingKey: string | { cube: string; dimension: string }[]

    /**
     * Time dimension for step sequencing.
     * Same format options as bindingKey.
     */
    timeDimension: string | { cube: string; dimension: string }[]

    /** Ordered funnel steps */
    steps: ServerFunnelStep[]

    /** Include avg/median/p90 time metrics */
    includeTimeMetrics?: boolean

    /** Global time window (ISO 8601 duration) */
    globalTimeWindow?: string
  }
}

interface ServerFunnelStep {
  /** Step display name */
  name: string

  /** Optional cube override for cross-cube funnels */
  cube?: string

  /**
   * Step filter (dimension filters only).
   * Single filter or { and: [...] } / { or: [...] } groups.
   */
  filter?: Filter | { and: Filter[] } | { or: Filter[] }

  /** Max time from previous step (ISO 8601 duration, e.g., "P7D") */
  timeToConvert?: string
}
```

## URL Sharing

Configs are compressed for URL sharing:

```typescript
import {
  generateShareUrl,
  parseShareUrl,
  compressAndEncode,
  decodeAndDecompress
} from 'drizzle-cube/client'

// Generate share URL
const url = generateShareUrl(config)
// Result: "https://app.com/analysis#share=eJy..."

// Parse from current URL
const config = parseShareUrl()

// Manual compression
const encoded = compressAndEncode(config)
const decoded = decodeAndDecompress(encoded)
```

### Size Limits

Share URLs have practical size limits (~2000 chars for safe browser handling). Large configs may be truncated:

```typescript
import { isShareableSize } from 'drizzle-cube/client'

const { ok, size, maxSize } = isShareableSize(config)
if (!ok) {
  console.warn(`Config too large: ${size} > ${maxSize}`)
}
```

## Store Integration

The `AnalysisBuilderStore` provides `save()` and `load()` methods:

```typescript
// Inside component with AnalysisBuilderStoreProvider
const save = useAnalysisBuilderStore(state => state.save)
const load = useAnalysisBuilderStore(state => state.load)

// Export current state to AnalysisConfig
const config = save()

// Import AnalysisConfig into store
load(config)

// For localStorage, use workspace methods
const saveWorkspace = useAnalysisBuilderStore(state => state.saveWorkspace)
const loadWorkspace = useAnalysisBuilderStore(state => state.loadWorkspace)
```

## Next Steps

- See [Config Migration](/guides/config-migration) for upgrading from legacy formats
- Learn about [Funnel Analysis](/client/funnel-analysis) for funnel configuration
- Review [Dashboards](/client/dashboards) for portlet integration
