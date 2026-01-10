---
title: Config Migration Guide
description: Guide for migrating from legacy portlet format to AnalysisConfig
---

This guide helps you migrate from the legacy portlet configuration format to the new `AnalysisConfig` format introduced in drizzle-cube 0.3.0.

## Overview

The new `AnalysisConfig` format provides:

- **Unified persistence** - Single format for localStorage, share URLs, and portlets
- **Multi-mode support** - Separate configurations for query and funnel analysis
- **Version tracking** - Future-proof migrations with `version` field
- **Cleaner structure** - Chart config organized by mode in `charts` map

## Breaking Changes Summary

| Change | Legacy | New | Impact |
|--------|--------|-----|--------|
| Chart config location | Top-level `chartType` | `charts[mode].chartType` | TypeScript errors, runtime access changes |
| Query storage | JSON string | Parsed object | Apps parsing `JSON.parse(query)` may break |
| Version field | None | Required `version: 1` | Validation may fail |
| Analysis type | Implicit | Explicit `analysisType` | Must specify mode |
| Chart per mode | Single config | `charts` map by mode | Different access pattern |

## Legacy Format

The old portlet format stored configuration like this:

```typescript
// Legacy PortletConfig (pre-0.3.0)
interface LegacyPortlet {
  id: string
  title: string

  // Query as JSON string
  query: string  // JSON.stringify({ measures: [...], dimensions: [...] })

  // Chart config at top level
  chartType: 'bar' | 'line' | 'table' | ...
  chartConfig?: {
    xAxis?: string[]
    yAxis?: string[]
  }
  displayConfig?: {
    showLegend?: boolean
  }

  // Layout
  w: number
  h: number
  x: number
  y: number
}
```

### Legacy Example

```typescript
const legacyPortlet = {
  id: 'revenue-chart',
  title: 'Monthly Revenue',
  query: JSON.stringify({
    measures: ['Orders.totalRevenue'],
    timeDimensions: [{
      dimension: 'Orders.createdAt',
      granularity: 'month'
    }]
  }),
  chartType: 'line',
  chartConfig: {
    xAxis: ['Orders.createdAt'],
    yAxis: ['Orders.totalRevenue']
  },
  displayConfig: {
    showLegend: true
  },
  w: 6, h: 4, x: 0, y: 0
}
```

## New Format

The new format uses `AnalysisConfig` for query/chart configuration:

```typescript
// New PortletConfig (0.3.0+)
interface PortletConfig {
  id: string
  title: string

  // New: Canonical config format
  analysisConfig: AnalysisConfig

  // Layout (unchanged)
  w: number
  h: number
  x: number
  y: number

  // Legacy fields (kept for backward compatibility during transition)
  query?: string
  chartType?: ChartType
  chartConfig?: ChartAxisConfig
  displayConfig?: ChartDisplayConfig
}
```

### New Example

```typescript
const newPortlet = {
  id: 'revenue-chart',
  title: 'Monthly Revenue',
  analysisConfig: {
    version: 1,
    analysisType: 'query',
    activeView: 'chart',
    charts: {
      query: {
        chartType: 'line',
        chartConfig: {
          xAxis: ['Orders.createdAt'],
          yAxis: ['Orders.totalRevenue']
        },
        displayConfig: {
          showLegend: true
        }
      }
    },
    query: {
      measures: ['Orders.totalRevenue'],
      timeDimensions: [{
        dimension: 'Orders.createdAt',
        granularity: 'month'
      }]
    }
  },
  w: 6, h: 4, x: 0, y: 0
}
```

## Automatic Migration

drizzle-cube includes migration utilities that automatically convert legacy formats:

### Using migrateConfig

```typescript
import { migrateConfig, isValidAnalysisConfig } from 'drizzle-cube/client'

// Works with any format
const config = migrateConfig(unknownData)
// Returns valid AnalysisConfig

// Check before migrating
if (!isValidAnalysisConfig(data)) {
  const migrated = migrateConfig(data)
  // Use migrated config
}
```

### Using migrateLegacyPortlet

```typescript
import { migrateLegacyPortlet } from 'drizzle-cube/client'

const legacyPortlet = {
  query: '{"measures":["Orders.count"]}',
  chartType: 'bar',
  chartConfig: { yAxis: ['Orders.count'] }
}

const analysisConfig = migrateLegacyPortlet(legacyPortlet)
// Returns QueryAnalysisConfig
```

## Migration Scenarios

### Scenario 1: Single Query Portlet

**Legacy:**
```typescript
{
  query: '{"measures":["Employees.count"],"dimensions":["Employees.department"]}',
  chartType: 'bar',
  chartConfig: { xAxis: ['Employees.department'], yAxis: ['Employees.count'] }
}
```

**Migrated:**
```typescript
{
  version: 1,
  analysisType: 'query',
  activeView: 'chart',
  charts: {
    query: {
      chartType: 'bar',
      chartConfig: { xAxis: ['Employees.department'], yAxis: ['Employees.count'] },
      displayConfig: {}
    }
  },
  query: {
    measures: ['Employees.count'],
    dimensions: ['Employees.department']
  }
}
```

### Scenario 2: Multi-Query with Merge

**Legacy:**
```typescript
{
  query: JSON.stringify({
    queries: [
      { measures: ['Sales.revenue'], filters: [...] },
      { measures: ['Sales.revenue'], filters: [...] }
    ],
    mergeStrategy: 'concat',
    queryLabels: ['Region A', 'Region B']
  }),
  chartType: 'line'
}
```

**Migrated:**
```typescript
{
  version: 1,
  analysisType: 'query',
  activeView: 'chart',
  charts: {
    query: { chartType: 'line', chartConfig: {}, displayConfig: {} }
  },
  query: {
    queries: [
      { measures: ['Sales.revenue'], filters: [...] },
      { measures: ['Sales.revenue'], filters: [...] }
    ],
    mergeStrategy: 'concat',
    queryLabels: ['Region A', 'Region B']
  }
}
```

### Scenario 3: Legacy Funnel (mergeStrategy: 'funnel')

The old funnel pattern used multi-query with `mergeStrategy: 'funnel'`:

**Legacy:**
```typescript
{
  query: JSON.stringify({
    queries: [
      { measures: ['Events.count'], filters: [{ member: 'Events.type', operator: 'equals', values: ['signup'] }] },
      { measures: ['Events.count'], filters: [{ member: 'Events.type', operator: 'equals', values: ['purchase'] }] }
    ],
    mergeStrategy: 'funnel',
    queryLabels: ['Signup', 'Purchase'],
    funnelBindingKey: { dimension: 'Events.userId' }
  }),
  chartType: 'funnel'
}
```

**Migrated:**
```typescript
{
  version: 1,
  analysisType: 'funnel',
  activeView: 'chart',
  charts: {
    funnel: { chartType: 'funnel', chartConfig: {}, displayConfig: {} }
  },
  query: {
    funnel: {
      bindingKey: 'Events.userId',
      timeDimension: '',  // Extracted from first query if available
      steps: [
        { name: 'Signup', filter: { member: 'Events.type', operator: 'equals', values: ['signup'] } },
        { name: 'Purchase', filter: { member: 'Events.type', operator: 'equals', values: ['purchase'] } }
      ],
      includeTimeMetrics: true
    }
  }
}
```

### Scenario 4: ServerFunnelQuery

If the query is already a `ServerFunnelQuery`, it's preserved as-is:

**Legacy:**
```typescript
{
  query: JSON.stringify({
    funnel: {
      bindingKey: 'Events.userId',
      timeDimension: 'Events.timestamp',
      steps: [...]
    }
  }),
  chartType: 'funnel'
}
```

**Migrated:**
```typescript
{
  version: 1,
  analysisType: 'funnel',
  activeView: 'chart',
  charts: {
    funnel: { chartType: 'funnel', chartConfig: {}, displayConfig: {} }
  },
  query: {
    funnel: {
      bindingKey: 'Events.userId',
      timeDimension: 'Events.timestamp',
      steps: [...]
    }
  }
}
```

## Manual Migration Steps

If you need to migrate programmatically:

### Step 1: Parse Legacy Query

```typescript
function parseLegacyQuery(portlet: LegacyPortlet) {
  try {
    return JSON.parse(portlet.query)
  } catch {
    return { measures: [], dimensions: [] }
  }
}
```

### Step 2: Determine Analysis Type

```typescript
function determineAnalysisType(query: unknown, portlet: LegacyPortlet): 'query' | 'funnel' {
  // Check if it's a ServerFunnelQuery
  if (query && typeof query === 'object' && 'funnel' in query) {
    return 'funnel'
  }

  // Check if it's a legacy funnel multi-query
  if (query && 'mergeStrategy' in query && query.mergeStrategy === 'funnel') {
    return 'funnel'
  }

  // Check explicit analysisType
  if (portlet.analysisType === 'funnel') {
    return 'funnel'
  }

  return 'query'
}
```

### Step 3: Build AnalysisConfig

```typescript
function buildAnalysisConfig(portlet: LegacyPortlet): AnalysisConfig {
  const query = parseLegacyQuery(portlet)
  const analysisType = determineAnalysisType(query, portlet)

  const chartConfig: ChartConfig = {
    chartType: portlet.chartType || (analysisType === 'funnel' ? 'funnel' : 'bar'),
    chartConfig: portlet.chartConfig || {},
    displayConfig: portlet.displayConfig || {}
  }

  return {
    version: 1,
    analysisType,
    activeView: 'chart',
    charts: {
      [analysisType]: chartConfig
    },
    query
  } as AnalysisConfig
}
```

## Updating Your Code

### Accessing Chart Type

**Before:**
```typescript
const chartType = portlet.chartType
```

**After:**
```typescript
const chartType = portlet.analysisConfig?.charts[portlet.analysisConfig.analysisType]?.chartType
  ?? portlet.chartType // Fallback for legacy
```

### Accessing Query

**Before:**
```typescript
const query = JSON.parse(portlet.query)
```

**After:**
```typescript
const query = portlet.analysisConfig?.query
  ?? JSON.parse(portlet.query) // Fallback for legacy
```

### Updating Portlet Config

**Before:**
```typescript
const updated = {
  ...portlet,
  chartType: 'line',
  query: JSON.stringify(newQuery)
}
```

**After:**
```typescript
const updated = {
  ...portlet,
  analysisConfig: {
    ...portlet.analysisConfig,
    charts: {
      ...portlet.analysisConfig.charts,
      [portlet.analysisConfig.analysisType]: {
        ...portlet.analysisConfig.charts[portlet.analysisConfig.analysisType],
        chartType: 'line'
      }
    },
    query: newQuery
  }
}
```

## Database Migration

If you have portlet configs stored in a database, you can migrate them:

```typescript
async function migrateDatabaseConfigs(db: Database) {
  const dashboards = await db.query('SELECT * FROM analytics_pages')

  for (const dashboard of dashboards) {
    const config = JSON.parse(dashboard.config)

    const migratedPortlets = config.portlets.map(portlet => {
      // Skip if already migrated
      if (portlet.analysisConfig) return portlet

      return {
        ...portlet,
        analysisConfig: migrateLegacyPortlet(portlet)
      }
    })

    await db.query(
      'UPDATE analytics_pages SET config = ? WHERE id = ?',
      [JSON.stringify({ ...config, portlets: migratedPortlets }), dashboard.id]
    )
  }
}
```

## Validation

Always validate configs before use:

```typescript
import { isValidAnalysisConfig, migrateConfig } from 'drizzle-cube/client'

function ensureValidConfig(data: unknown): AnalysisConfig {
  if (isValidAnalysisConfig(data)) {
    return data
  }

  const migrated = migrateConfig(data)

  if (!isValidAnalysisConfig(migrated)) {
    throw new Error('Failed to migrate config')
  }

  return migrated
}
```

## Troubleshooting

### "Unknown config format" Warning

This occurs when `migrateConfig()` can't recognize the input format:

```typescript
// Check what you're passing
console.log('Config type:', typeof config)
console.log('Config:', JSON.stringify(config, null, 2))

// Ensure it's an object with expected fields
if (typeof config !== 'object' || config === null) {
  // Handle invalid input
}
```

### Chart Settings Lost After Migration

If chart settings are missing, check if the legacy portlet had the correct fields:

```typescript
const legacyPortlet = {
  chartType: 'bar',           // Required
  chartConfig: { ... },       // Optional
  displayConfig: { ... }      // Optional
}
```

### Funnel Not Detected

Ensure the legacy format has proper funnel indicators:

```typescript
// These trigger funnel detection:
{ mergeStrategy: 'funnel' }              // Legacy multi-query funnel
{ funnel: { ... } }                      // ServerFunnelQuery
{ analysisType: 'funnel' }               // Explicit type
```

## Next Steps

- Review [AnalysisConfig Reference](/api-reference/analysis-config) for complete type documentation
- Learn about [Funnel Analysis](/client/funnel-analysis) for funnel-specific configuration
- See [Dashboards](/client/dashboards) for portlet integration patterns
