---
title: Period Comparisons
---

Period comparisons enable powerful period-over-period analysis by comparing data across multiple date ranges simultaneously. This feature allows you to answer questions like "How does this month compare to last month?" or "What's the difference between this year's Q1 and last year's Q1?"

## Overview

The `compareDateRange` feature provides:
- **Multi-Period Analysis**: Compare two or more time periods in a single query
- **Period Alignment**: Automatically align data points across periods for accurate comparison
- **Flexible Date Ranges**: Support for both relative strings and absolute date ranges
- **Chart Integration**: Overlay visualization with distinct styling for current vs. prior periods
- **Security Maintained**: Security context is applied consistently across all comparison periods

## Basic Usage

Use `compareDateRange` instead of `dateRange` in your time dimension to compare multiple periods:

```typescript
const query = {
  measures: ["Sales.revenue"],
  timeDimensions: [{
    dimension: "Sales.date",
    granularity: "day",
    compareDateRange: [
      ["2024-01-01", "2024-01-31"],  // Current period
      ["2023-01-01", "2023-01-31"]   // Prior period
    ]
  }]
}
```

The result will contain data from both periods, with metadata that enables alignment and visualization.

## Period Formats

### Absolute Date Ranges

Specify exact start and end dates as arrays:

```typescript
compareDateRange: [
  ["2024-01-01", "2024-01-31"],  // January 2024
  ["2023-01-01", "2023-01-31"]   // January 2023
]
```

### Relative Date Strings

Use relative date strings for dynamic comparisons:

```typescript
compareDateRange: [
  "last 30 days",      // Current period: last 30 days
  "last 60 days"       // Prior period: 31-60 days ago (overlapping ranges allowed)
]
```

### Mixed Formats

Combine relative and absolute formats as needed:

```typescript
compareDateRange: [
  "this month",                    // Current: this month
  ["2023-01-01", "2023-01-31"]    // Prior: specific month last year
]
```

## Supported Relative Date Strings

All standard relative date ranges work with `compareDateRange`:

| Range String | Description |
|--------------|-------------|
| `today` | Current day |
| `yesterday` | Previous day |
| `this week` | Current week (Monday to Sunday) |
| `last week` | Previous week |
| `this month` | Current month |
| `last month` | Previous month |
| `this quarter` | Current quarter |
| `last quarter` | Previous quarter |
| `this year` | Current year |
| `last year` | Previous year |
| `last 7 days` | Rolling 7 days |
| `last 30 days` | Rolling 30 days |
| `last 90 days` | Rolling 90 days |
| `last N days` | Rolling N days (any number) |
| `last N weeks` | Rolling N weeks |
| `last N months` | Rolling N months |

## Response Structure

Comparison queries return data with special metadata fields that enable period alignment:

```typescript
// Example response data
{
  data: [
    {
      "Sales.date": "2024-01-01T00:00:00.000Z",
      "Sales.revenue": 1500,
      "__period": "2024-01-01 - 2024-01-31",  // Period label
      "__periodIndex": 0,                      // Period index (0 = first/current)
      "__periodDayIndex": 0                    // Day within period (for alignment)
    },
    {
      "Sales.date": "2024-01-02T00:00:00.000Z",
      "Sales.revenue": 1800,
      "__period": "2024-01-01 - 2024-01-31",
      "__periodIndex": 0,
      "__periodDayIndex": 1
    },
    {
      "Sales.date": "2023-01-01T00:00:00.000Z",
      "Sales.revenue": 1200,
      "__period": "2023-01-01 - 2023-01-31",
      "__periodIndex": 1,                      // Period index (1 = second/prior)
      "__periodDayIndex": 0                    // Same day index for alignment
    },
    // ... more rows
  ],
  annotation: {
    measures: { /* ... */ },
    dimensions: { /* ... */ },
    periods: {
      ranges: [
        ["2024-01-01", "2024-01-31"],
        ["2023-01-01", "2023-01-31"]
      ],
      labels: [
        "2024-01-01 - 2024-01-31",
        "2023-01-01 - 2023-01-31"
      ],
      timeDimension: "Sales.date",
      granularity: "day"
    }
  }
}
```

### Metadata Fields

| Field | Description |
|-------|-------------|
| `__period` | Human-readable label for the period |
| `__periodIndex` | Index of the period (0 = first/current, 1 = second/prior, etc.) |
| `__periodDayIndex` | Day-of-period index for alignment (0 = first day of period) |

## Period Alignment

The `__periodDayIndex` field enables accurate visual comparison by aligning data points across periods. This is calculated based on the query's granularity:

| Granularity | Alignment |
|-------------|-----------|
| `day` | Day within period (0, 1, 2, ...) |
| `week` | Week within period |
| `month` | Month within period |
| `quarter` | Quarter within period |
| `year` | Year within period |

This allows you to compare "Day 1 of Period A" with "Day 1 of Period B", regardless of the actual calendar dates.

## Chart Visualization

The client components automatically detect comparison data and render it appropriately:

### Overlay Mode (Default)

Periods are overlaid on the same chart with distinct styling:
- **Current period**: Solid lines, full opacity
- **Prior periods**: Dashed lines, reduced opacity

```typescript
// Chart display configuration
const displayConfig = {
  priorPeriodStyle: 'dashed',    // 'solid' | 'dashed' | 'dotted'
  priorPeriodOpacity: 0.5        // 0-1 opacity for prior periods
}
```

### Series Naming

Each measure is split into series per period:
- `Revenue (Current)` - Current period values
- `Revenue (Prior)` - Prior period values

## Complete Example

### Query Definition

```typescript
import { useCubeQuery } from 'drizzle-cube/client'

function MonthOverMonthChart() {
  const { resultSet, isLoading, error } = useCubeQuery({
    measures: ["Sales.revenue", "Sales.orderCount"],
    timeDimensions: [{
      dimension: "Sales.date",
      granularity: "day",
      compareDateRange: [
        "this month",
        "last month"
      ]
    }]
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <LineChart
      data={resultSet.rawData()}
      chartConfig={{
        xAxis: ["Sales.date"],
        yAxis: ["Sales.revenue", "Sales.orderCount"]
      }}
      displayConfig={{
        priorPeriodStyle: 'dashed',
        priorPeriodOpacity: 0.6
      }}
    />
  )
}
```

### Server-Side Execution

```typescript
const semanticLayer = new SemanticLayerCompiler({
  databaseExecutor: executor
})

semanticLayer.registerCube(salesCube)

const result = await semanticLayer.execute({
  measures: ["Sales.revenue"],
  dimensions: ["Sales.category"],
  timeDimensions: [{
    dimension: "Sales.date",
    granularity: "week",
    compareDateRange: [
      ["2024-01-01", "2024-03-31"],  // Q1 2024
      ["2023-01-01", "2023-03-31"]   // Q1 2023
    ]
  }]
}, securityContext)

// Result includes data from both quarters with period metadata
console.log(result.annotation.periods)
// {
//   ranges: [["2024-01-01", "2024-03-31"], ["2023-01-01", "2023-03-31"]],
//   labels: ["2024-01-01 - 2024-03-31", "2023-01-01 - 2023-03-31"],
//   timeDimension: "Sales.date",
//   granularity: "week"
// }
```

## Common Use Cases

### Year-over-Year Comparison

```typescript
const yearOverYear = {
  measures: ["Revenue.total"],
  timeDimensions: [{
    dimension: "Revenue.date",
    granularity: "month",
    compareDateRange: [
      "this year",
      "last year"
    ]
  }]
}
```

### Week-over-Week Analysis

```typescript
const weekOverWeek = {
  measures: ["Orders.count", "Orders.averageValue"],
  timeDimensions: [{
    dimension: "Orders.createdAt",
    granularity: "day",
    compareDateRange: [
      "this week",
      "last week"
    ]
  }]
}
```

### Quarterly Business Review

```typescript
const quarterlyReview = {
  measures: ["Sales.revenue", "Sales.profit"],
  dimensions: ["Products.category"],
  timeDimensions: [{
    dimension: "Sales.date",
    granularity: "week",
    compareDateRange: [
      "this quarter",
      "last quarter"
    ]
  }]
}
```

### Campaign Period Analysis

```typescript
const campaignComparison = {
  measures: ["Conversions.count", "Conversions.value"],
  timeDimensions: [{
    dimension: "Conversions.date",
    granularity: "day",
    compareDateRange: [
      ["2024-11-25", "2024-12-01"],  // Black Friday 2024
      ["2023-11-24", "2023-11-30"]   // Black Friday 2023
    ]
  }]
}
```

## Security Considerations

Period comparisons maintain full security context:

- Security filters are applied to **all periods** in the comparison
- Each period query is executed with the same security context
- Multi-tenant isolation is preserved across all comparison data
- No data leakage between organizations, even when comparing historical periods

```typescript
// Security is applied consistently
await semanticLayer.execute({
  measures: ["Sales.revenue"],
  timeDimensions: [{
    dimension: "Sales.date",
    granularity: "day",
    compareDateRange: ["this month", "last month"]
  }]
}, { organisationId: "org-123" })
// Both periods are filtered by organisationId = "org-123"
```

## Combining with Other Features

### With Dimensions

Add dimensions to see period comparisons broken down by category:

```typescript
const query = {
  measures: ["Sales.revenue"],
  dimensions: ["Products.category"],
  timeDimensions: [{
    dimension: "Sales.date",
    granularity: "week",
    compareDateRange: ["this quarter", "last quarter"]
  }]
}
```

### With Filters

Apply filters that affect both periods:

```typescript
const query = {
  measures: ["Sales.revenue"],
  timeDimensions: [{
    dimension: "Sales.date",
    granularity: "day",
    compareDateRange: ["this month", "last month"]
  }],
  filters: [{
    member: "Sales.region",
    operator: "equals",
    values: ["North America"]
  }]
}
```

## Best Practices

1. **Use Matching Period Lengths**: Compare periods of similar length for meaningful analysis (e.g., month-to-month, not month-to-week)

2. **Choose Appropriate Granularity**: Use day granularity for short comparisons, week or month for longer periods

3. **Consider Seasonality**: When comparing year-over-year, align by week number or day-of-week for seasonal businesses

4. **Limit Period Count**: While multiple periods are supported, two periods (current vs. prior) provides the clearest visualization

5. **Label Clearly**: Use relative date strings like "this month" for dynamic dashboards, absolute dates for fixed reports

## Limitations

- **Maximum Periods**: No hard limit, but more than 3 periods can make visualizations difficult to read
- **Gap Filling**: Gap filling applies to each period independently
- **Complex Date Logic**: Very complex period calculations should be done in custom SQL or pre-processing

## Next Steps

- Learn about [Time Dimensions](/semantic-layer/time-dimensions) for single-period queries
- Explore [Charts](/client/charts) for visualization options
- Review [Calculated Measures](/semantic-layer/calculated-measures) for period-over-period calculations
