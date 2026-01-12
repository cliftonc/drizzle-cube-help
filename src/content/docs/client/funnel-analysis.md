---
title: Funnel Analysis
---

Funnel analysis allows you to track user journeys through a sequence of events, measuring conversion rates and time-to-convert between steps. Drizzle Cube provides server-side funnel execution for accurate temporal ordering and comprehensive metrics.

## Overview

Funnel queries differ from standard queries in several important ways:

| Aspect | Standard Query | Funnel Query |
|--------|---------------|--------------|
| **Data Structure** | Single aggregation result | Sequential step progression |
| **Execution** | Single SQL query | CTE-based temporal analysis |
| **Output** | Raw measures/dimensions | Conversion rates, time metrics |
| **UI Mode** | Query/Multi-Query tabs | Dedicated Steps + Display tabs |

## Key Concepts

### Binding Key

The **binding key** is the dimension that links events across steps - typically a user ID, session ID, or transaction ID. This determines which entity you're tracking through the funnel.

```
Example: Tracking PR lifecycle
Binding Key: PREvents.prNumber

Step 1: PR Created    → 100 PRs
Step 2: Review Started → 85 PRs (85% conversion)
Step 3: Approved       → 75 PRs (88% conversion from step 2)
Step 4: Merged         → 70 PRs (93% conversion from step 3)
```

### Time Dimension

The **time dimension** is required for temporal ordering - it ensures steps occur in the correct sequence (step 2 must happen after step 1).

### Steps

Each **step** in a funnel represents a milestone event. Steps are defined by:
- **Name**: Display label (e.g., "PR Created", "Review Started")
- **Filters**: Dimension filters that identify the event (e.g., `eventType = 'created'`)
- **Time Window** (optional): Maximum time allowed from previous step

## Event Stream Cubes

To enable funnel analysis, mark cubes with `eventStream` metadata. This tells the Analysis Builder which cubes can be used for funnel analysis and auto-populates configuration.

```typescript
import { defineCube } from 'drizzle-cube/server';
import { eq } from 'drizzle-orm';
import { prEvents } from './schema';

export const prEventsCube = defineCube('PREvents', {
  title: 'PR Events',
  description: 'Pull request lifecycle events for funnel analysis',

  sql: (ctx) => ({
    from: prEvents,
    where: eq(prEvents.organisationId, ctx.securityContext.organisationId)
  }),

  dimensions: {
    id: {
      name: 'id',
      title: 'Event ID',
      type: 'number',
      sql: prEvents.id,
      primaryKey: true
    },
    prNumber: {
      name: 'prNumber',
      title: 'PR Number',
      type: 'number',
      sql: prEvents.prNumber
    },
    eventType: {
      name: 'eventType',
      title: 'Event Type',
      type: 'string',
      sql: prEvents.eventType
    },
    timestamp: {
      name: 'timestamp',
      title: 'Event Timestamp',
      type: 'time',
      sql: prEvents.timestamp
    }
  },

  measures: {
    count: {
      name: 'count',
      title: 'Event Count',
      type: 'count',
      sql: prEvents.id
    },
    uniquePRs: {
      name: 'uniquePRs',
      title: 'Unique PRs',
      type: 'countDistinct',
      sql: prEvents.prNumber
    }
  },

  // Event stream metadata enables funnel analysis
  meta: {
    eventStream: {
      bindingKey: 'PREvents.prNumber',      // Entity identifier
      timeDimension: 'PREvents.timestamp'   // Event ordering
    }
  }
});
```

### eventStream Metadata Properties

| Property | Type | Description |
|----------|------|-------------|
| `bindingKey` | `string` | Fully qualified dimension name (e.g., `CubeName.dimensionName`) that uniquely identifies entities through the funnel |
| `timeDimension` | `string` | Fully qualified time dimension name used for temporal ordering |

When a cube has `eventStream` metadata:
1. It appears in the funnel cube selector
2. Selecting it auto-populates the binding key and time dimension
3. Users can immediately start adding steps without manual configuration

## Using Funnel Mode in Analysis Builder

### Switching to Funnel Mode

In the Analysis Builder, use the analysis type selector to switch between modes:

- **Query**: Single query mode (standard analytics)
- **Multi**: Multiple queries with merge strategies
- **Funnel**: Funnel analysis mode

### Configuring a Funnel

1. **Select Cube**: Choose an event stream cube from the dropdown
2. **Binding Key**: Auto-populated from cube metadata (can be changed)
3. **Time Dimension**: Auto-populated from cube metadata (can be changed)
4. **Add Steps**: Define each step with filters

### Step Configuration

Each step requires:

| Field | Required | Description |
|-------|----------|-------------|
| **Name** | Yes | Display label for the step (click to edit) |
| **Filters** | Yes | Dimension filters identifying this event |
| **Time Window** | No | Maximum time from previous step (ISO 8601 duration) |

:::note[Filter Restrictions]
Funnel step filters can **only use dimensions**, not measures. This is because steps identify events by their attributes, not by aggregated values.
:::

### Time Window Options

Time windows use ISO 8601 duration format:

| Duration | Meaning |
|----------|---------|
| `PT1H` | 1 hour |
| `PT6H` | 6 hours |
| `PT24H` | 24 hours |
| `P1D` | 1 day |
| `P3D` | 3 days |
| `P7D` | 7 days |
| `P14D` | 14 days |
| `P30D` | 30 days |
| `P90D` | 90 days |

**Example**: If Step 2 has a time window of `P7D`, the entity must complete Step 2 within 7 days of completing Step 1 to count as converted.

## Funnel Query Format

### Server Request Format

```typescript
{
  funnel: {
    bindingKey: "PREvents.prNumber",
    timeDimension: "PREvents.timestamp",
    steps: [
      {
        name: "PR Created",
        filter: {
          member: "PREvents.eventType",
          operator: "equals",
          values: ["created"]
        }
      },
      {
        name: "Review Started",
        filter: {
          member: "PREvents.eventType",
          operator: "equals",
          values: ["review_started"]
        },
        timeToConvert: "P3D"  // Within 3 days
      },
      {
        name: "Approved",
        filter: {
          member: "PREvents.eventType",
          operator: "equals",
          values: ["approved"]
        },
        timeToConvert: "P7D"  // Within 7 days
      },
      {
        name: "Merged",
        filter: {
          member: "PREvents.eventType",
          operator: "equals",
          values: ["merged"]
        },
        timeToConvert: "P1D"  // Within 1 day
      }
    ],
    includeTimeMetrics: true,
    globalTimeWindow: "P30D"  // All steps within 30 days
  }
}
```

### Server Response Format

```typescript
[
  {
    step: "PR Created",
    stepIndex: 0,
    count: 1000,
    conversionRate: null,           // null for first step
    cumulativeConversionRate: 1.0,
    avgSecondsToConvert: null,
    medianSecondsToConvert: null,
    p90SecondsToConvert: null
  },
  {
    step: "Review Started",
    stepIndex: 1,
    count: 850,
    conversionRate: 0.85,           // 850/1000 = 85%
    cumulativeConversionRate: 0.85,
    avgSecondsToConvert: 7200,      // 2 hours average
    medianSecondsToConvert: 3600,   // 1 hour median
    p90SecondsToConvert: 21600      // 6 hours p90
  },
  {
    step: "Approved",
    stepIndex: 2,
    count: 680,
    conversionRate: 0.8,            // 680/850 = 80%
    cumulativeConversionRate: 0.68, // 680/1000 = 68%
    avgSecondsToConvert: 86400,     // 1 day average
    medianSecondsToConvert: 43200,
    p90SecondsToConvert: 172800
  },
  {
    step: "Merged",
    stepIndex: 3,
    count: 650,
    conversionRate: 0.956,          // 650/680 = 95.6%
    cumulativeConversionRate: 0.65, // 650/1000 = 65%
    avgSecondsToConvert: 14400,     // 4 hours average
    medianSecondsToConvert: 7200,
    p90SecondsToConvert: 43200
  }
]
```

## FunnelAnalysisConfig (Persistence Format)

Funnel configurations are persisted using the `FunnelAnalysisConfig` format. This is part of the broader `AnalysisConfig` system introduced in v0.3.0.

### Complete Example

```typescript
import type { FunnelAnalysisConfig } from 'drizzle-cube/client'

const funnelConfig: FunnelAnalysisConfig = {
  version: 1,
  analysisType: 'funnel',
  activeView: 'chart',
  charts: {
    funnel: {
      chartType: 'funnel',
      chartConfig: {},
      displayConfig: {
        showPercentages: true,
        showTimeMetrics: true
      }
    }
  },
  query: {
    funnel: {
      bindingKey: 'PREvents.prNumber',
      timeDimension: 'PREvents.timestamp',
      steps: [
        {
          name: 'PR Created',
          filter: {
            member: 'PREvents.eventType',
            operator: 'equals',
            values: ['created']
          }
        },
        {
          name: 'Review Started',
          filter: {
            member: 'PREvents.eventType',
            operator: 'equals',
            values: ['review_started']
          },
          timeToConvert: 'P3D'
        },
        {
          name: 'Merged',
          filter: {
            member: 'PREvents.eventType',
            operator: 'equals',
            values: ['merged']
          },
          timeToConvert: 'P7D'
        }
      ],
      includeTimeMetrics: true
    }
  }
}
```

### Saving and Loading

```typescript
import { useAnalysisBuilderStore } from 'drizzle-cube/client'

function FunnelPersistence() {
  const save = useAnalysisBuilderStore(state => state.save)
  const load = useAnalysisBuilderStore(state => state.load)

  // Save current funnel config
  const handleSave = () => {
    const config = save()  // Returns FunnelAnalysisConfig when in funnel mode
    localStorage.setItem('savedFunnel', JSON.stringify(config))
  }

  // Load saved funnel
  const handleLoad = () => {
    const saved = localStorage.getItem('savedFunnel')
    if (saved) {
      load(JSON.parse(saved))  // Restores funnel state
    }
  }
}
```

### Share URL Generation

```typescript
import { generateShareUrl, parseShareUrl } from 'drizzle-cube/client'

// Generate shareable URL
const shareUrl = generateShareUrl(funnelConfig)
// Result: https://app.com/analysis#share=eJy...

// Parse from URL
const loadedConfig = parseShareUrl()
if (loadedConfig?.analysisType === 'funnel') {
  // Handle funnel config
}
```

### Type Guards

```typescript
import { isFunnelConfig, isValidAnalysisConfig } from 'drizzle-cube/client'

function handleConfig(config: unknown) {
  if (!isValidAnalysisConfig(config)) {
    console.error('Invalid config')
    return
  }

  if (isFunnelConfig(config)) {
    // TypeScript knows config.query is ServerFunnelQuery
    const steps = config.query.funnel.steps
  }
}
```

See [AnalysisConfig Reference](/api-reference/analysis-config/) for complete type documentation.

## Funnel Metrics Explained

### Conversion Metrics

| Metric | Description |
|--------|-------------|
| **count** | Number of entities that reached this step |
| **conversionRate** | Conversion from previous step (step N count / step N-1 count) |
| **cumulativeConversionRate** | Conversion from first step (step N count / step 1 count) |

### Time-to-Convert Metrics

When `includeTimeMetrics: true` is set:

| Metric | Description |
|--------|-------------|
| **avgSecondsToConvert** | Average time from previous step (seconds) |
| **medianSecondsToConvert** | Median time from previous step (50th percentile) |
| **p90SecondsToConvert** | 90th percentile time from previous step |

:::note[Database Support]
Median and p90 metrics require database support for percentile functions. PostgreSQL supports these natively; MySQL and SQLite may return `null` for these values.
:::

## How Server-Side Funnel Execution Works

Funnel queries are executed as a single SQL query using Common Table Expressions (CTEs):

### 1. Step CTEs

Each step generates a CTE that finds the first occurrence of that event per entity:

```sql
WITH step_0 AS (
  SELECT
    pr_number AS binding_key,
    MIN(timestamp) AS step_time
  FROM pr_events
  WHERE event_type = 'created'
    AND organisation_id = $1
  GROUP BY pr_number
),
step_1 AS (
  SELECT
    pr_number AS binding_key,
    MIN(timestamp) AS step_time
  FROM pr_events
  WHERE event_type = 'review_started'
    AND organisation_id = $1
  GROUP BY pr_number
)
```

### 2. Temporal Join

Steps are joined with temporal constraints:

```sql
funnel_joined AS (
  SELECT
    s0.binding_key,
    s0.step_time AS step_0_time,
    CASE
      WHEN s1.step_time > s0.step_time
        AND s1.step_time <= s0.step_time + INTERVAL '3 days'
      THEN s1.step_time
      ELSE NULL
    END AS step_1_time
  FROM step_0 s0
  LEFT JOIN step_1 s1 ON s0.binding_key = s1.binding_key
)
```

### 3. Aggregation

Final aggregation produces funnel metrics:

```sql
funnel_metrics AS (
  SELECT
    COUNT(*) AS step_0_count,
    COUNT(step_1_time) AS step_1_count,
    AVG(EXTRACT(EPOCH FROM (step_1_time - step_0_time))) AS step_1_avg_seconds
  FROM funnel_joined
)
```

## Constraints and Requirements

### Minimum Requirements

| Requirement | Details |
|-------------|---------|
| **Minimum 2 steps** | A funnel must have at least 2 steps |
| **Binding key required** | Must identify the entity being tracked |
| **Time dimension required** | Must have a timestamp for ordering |
| **Single cube** | All steps must use the same cube |

### Filter Restrictions

- **Dimensions only**: Step filters cannot reference measures
- **Equality preferred**: While other operators work, `equals` is most common
- **Multi-value support**: Filter values can be arrays for OR logic

### Best Practices

1. **Use entity identifiers as binding keys** - User ID, session ID, or transaction ID
2. **Ensure time dimension accuracy** - Timestamps should reflect when events occurred
3. **Set appropriate time windows** - Too short may miss valid conversions; too long may include irrelevant events
4. **Limit step count** - While unlimited steps are supported, 3-7 steps provide the clearest insights
5. **Name steps descriptively** - Clear names improve chart readability

## Programmatic Funnel Execution

### Using useFunnelQuery Hook

```tsx
import { useFunnelQuery } from 'drizzle-cube/client';

function FunnelDisplay() {
  const {
    data,           // FunnelChartData[]
    isLoading,
    isFetching,
    error,
    isValid
  } = useFunnelQuery({
    cube: 'PREvents',
    bindingKey: { dimension: 'PREvents.prNumber' },
    timeDimension: 'PREvents.timestamp',
    steps: [
      {
        id: '1',
        name: 'PR Created',
        cube: 'PREvents',
        filters: [
          { member: 'PREvents.eventType', operator: 'equals', values: ['created'] }
        ]
      },
      {
        id: '2',
        name: 'Merged',
        cube: 'PREvents',
        filters: [
          { member: 'PREvents.eventType', operator: 'equals', values: ['merged'] }
        ],
        timeToConvert: 'P7D'
      }
    ],
    includeTimeMetrics: true
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <FunnelChart data={data} />;
}
```

### Manual API Call

```typescript
const query = {
  funnel: {
    bindingKey: 'PREvents.prNumber',
    timeDimension: 'PREvents.timestamp',
    steps: [
      { name: 'Created', filter: { member: 'PREvents.eventType', operator: 'equals', values: ['created'] } },
      { name: 'Merged', filter: { member: 'PREvents.eventType', operator: 'equals', values: ['merged'] } }
    ],
    includeTimeMetrics: true
  }
};

const response = await fetch('/api/cubejs-api/v1/load', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query })
});

const result = await response.json();
```

## Funnel Chart Visualization

The FunnelChart component automatically handles funnel data:

```tsx
import { FunnelChart } from 'drizzle-cube/client';

function MyFunnel({ data }) {
  return (
    <FunnelChart
      data={data}
      displayConfig={{
        showLegend: true,
        showTooltip: true,
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
      }}
    />
  );
}
```

The chart displays:
- Visual funnel shape with step widths proportional to counts
- Conversion rates between steps
- Cumulative conversion from first step
- Time-to-convert metrics in tooltips (when available)

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "No results" | No entities complete step 1 | Check filter conditions match your data |
| Zero conversions | Time windows too restrictive | Increase time window durations |
| Missing time metrics | Database doesn't support percentiles | Use PostgreSQL or accept `null` values |
| "Invalid binding key" | Dimension doesn't exist | Verify dimension name in cube definition |

### Debugging Funnel Queries

Use dry-run to see the generated SQL:

```typescript
const dryRunResult = await fetch('/api/cubejs-api/v1/sql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: funnelQuery })
});

const { sql } = await dryRunResult.json();
console.log(sql);
```

## Next Steps

- [Analysis Builder](/client/analysis-builder/) - Using the visual query builder
- [Charts](/client/charts/) - Chart configuration and customization
- [Cubes](/semantic-layer/cubes/) - Cube definition patterns
- [Time Dimensions](/semantic-layer/time-dimensions/) - Time-based analysis
