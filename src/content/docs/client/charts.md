---
title: Charts
---

Drizzle Cube provides a comprehensive set of chart components for data visualization in your analytics dashboards. All charts are designed to work seamlessly with Cube.js-compatible data and provide interactive, responsive visualizations.

## Available Chart Types

### Bar Chart

Compare values across categories

![Bar Chart](/charts/bar.png)

**Use Case:** Best for comparing discrete categories, showing rankings, or displaying changes over time

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| showLegend | boolean | Show/hide chart legend |
| showGrid | boolean | Show/hide grid lines |
| showTooltip | boolean | Show/hide hover tooltips |
| stackType | select | Stacking mode: `none` (default), `normal` (stacked), or `percent` (stacked to 100%) |
| target | string | Target value(s) shown as reference line |

---

### Line Chart

Show trends and changes over time

![Line Chart](/charts/line.png)

**Use Case:** Best for continuous data, trends, time series, and showing relationships between multiple series

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| showLegend | boolean | Show/hide chart legend |
| showGrid | boolean | Show/hide grid lines |
| showTooltip | boolean | Show/hide hover tooltips |
| connectNulls | boolean | Draw continuous line through missing data points (default: false shows gaps) |
| target | string | Target value(s) shown as reference line |

---

### Area Chart

Emphasize magnitude of change over time

![Area Chart](/charts/area.png)

**Use Case:** Best for showing cumulative totals, volume changes, or stacked comparisons over time

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| showLegend | boolean | Show/hide chart legend |
| showGrid | boolean | Show/hide grid lines |
| showTooltip | boolean | Show/hide hover tooltips |
| stackType | select | Stacking mode: `none` (default), `normal` (stacked), or `percent` (stacked to 100%) |
| connectNulls | boolean | Draw continuous line through missing data points (default: false shows gaps) |
| target | string | Target value(s) shown as reference line |

---

### Pie Chart

Show proportions of a whole

![Pie Chart](/charts/pie.png)

**Use Case:** Best for showing percentage distribution or composition of a total (limit to 5-7 slices)

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| showLegend | boolean | Show/hide chart legend |
| showTooltip | boolean | Show/hide hover tooltips |

---

### Scatter Chart

Reveal correlations between variables

![Scatter Chart](/charts/scatter.png)

**Use Case:** Best for identifying patterns, correlations, outliers, and relationships between two measures

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| showLegend | boolean | Show/hide chart legend |
| showGrid | boolean | Show/hide grid lines |
| showTooltip | boolean | Show/hide hover tooltips |

---

### Radar Chart

Compare multiple metrics across categories

![Radar Chart](/charts/radar.png)

**Use Case:** Best for multivariate comparisons, performance metrics, strengths/weaknesses analysis

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| showLegend | boolean | Show/hide chart legend |
| showGrid | boolean | Show/hide grid lines |
| showTooltip | boolean | Show/hide hover tooltips |

---

### Radial Bar Chart

Circular progress and KPI visualization

![Radial Bar Chart](/charts/radial.png)

**Use Case:** Best for showing progress toward goals, KPIs, or comparing percentages in a compact form

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| showLegend | boolean | Show/hide chart legend |
| showTooltip | boolean | Show/hide hover tooltips |

---

### Tree Map Chart

Visualize hierarchical data with nested rectangles

![Tree Map Chart](/charts/treemap.png)

**Use Case:** Best for showing part-to-whole relationships in hierarchical data, disk usage, budget allocation

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| showLegend | boolean | Show/hide chart legend |
| showTooltip | boolean | Show/hide hover tooltips |

---

### Bubble Chart

Compare three dimensions of data

![Bubble Chart](/charts/bubble.png)

**Use Case:** Best for showing relationships between three variables (X, Y, and size), market analysis

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| showLegend | boolean | Show/hide chart legend |
| showGrid | boolean | Show/hide grid lines |
| showTooltip | boolean | Show/hide hover tooltips |
| minBubbleSize | number | Minimum bubble size |
| maxBubbleSize | number | Maximum bubble size |
| bubbleOpacity | number | Transparency of bubbles |

---

### Activity Grid Chart

GitHub-style activity grid showing temporal patterns

![Activity Grid Chart](/charts/activity.png)

**Use Case:** Best for visualizing activity patterns over time, contribution calendars, and temporal heatmaps

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| showLabels | boolean | Show/hide date labels |
| showTooltip | boolean | Show/hide hover tooltips |
| colorIntensity | string | Intensity of color coding |

---

### Data Table

Display detailed tabular data

![Data Table](/charts/table.png)

**Use Case:** Best for precise values, detailed analysis, sortable/filterable data exploration

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| (No display options) | | |

---

### KPI Number

Display key performance indicators as large numbers

![KPI Number](/charts/kpi_number.png)

**Use Case:** Perfect for showing important metrics like revenue, user count, or other key business metrics in a prominent, easy-to-read format

**Display Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| target | string | | Target value to compare against (shows variance) |
| prefix | string | | Text to display before the number |
| suffix | string | | Text to display after the number |
| decimals | number | 0 | Number of decimal places to display |
| formatValue | function | | Custom value formatter (takes precedence over prefix/suffix/decimals) |
| valueColorIndex | number | 0 | Color from dashboard palette for the KPI value |
| useLastCompletePeriod | boolean | true | Exclude current incomplete period from aggregation (e.g., partial week/month) |
| skipLastPeriod | boolean | false | Always exclude the last period regardless of completeness |

**Period Handling:**

When working with time-series data, the last period (week, month, etc.) is often incomplete, which can skew KPI values. The period handling options help address this:

- **Use Last Complete Period** (default: on) - Automatically detects if the last period is incomplete based on the current date and excludes it. For example, if today is Wednesday and you're viewing weekly data, the current partial week will be excluded.

- **Skip Last Period** - Always excludes the last period regardless of whether it's complete. Useful when you always want to show the previous period's data for consistency, or when working with test data.

When either option filters out data, an info icon (ℹ️) appears next to the metric label with a tooltip explaining what was excluded.

---

### KPI Delta

Display change between periods with trend indicators

![KPI Delta](/charts/kpi_delta.png)

**Use Case:** Perfect for showing performance changes over time, such as revenue growth, user acquisition changes, or metrics where the trend and delta are more important than the absolute value

**Display Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| prefix | string | | Text to display before numbers |
| suffix | string | | Text to display after numbers |
| decimals | number | 1 | Number of decimal places to display |
| positiveColorIndex | number | 2 | Color from dashboard palette for positive changes |
| negativeColorIndex | number | 3 | Color from dashboard palette for negative changes |
| showHistogram | boolean | true | Display historical variance chart below the delta |
| useLastCompletePeriod | boolean | true | Exclude current incomplete period from delta calculation |
| skipLastPeriod | boolean | false | Always exclude the last period regardless of completeness |

**How It Works:**

KPI Delta calculates and displays:
1. **Current Value** - The most recent period's value (large number)
2. **Absolute Change** - The difference from the previous period (e.g., +2K)
3. **Percentage Change** - The relative change (e.g., +15.3%)
4. **Variance Histogram** - Visual comparison of historical periods against the current value

**Period Handling:**

The same period handling options available in KPI Number apply here:

- **Use Last Complete Period** (default: on) - Detects and excludes incomplete current periods. This is especially important for delta calculations, as an incomplete period (e.g., showing 0 for the current week when it's only Monday) would show a misleading -100% change.

- **Skip Last Period** - Always excludes the last period. Use this when you want consistent behavior regardless of the current date, or when your data pipeline has incomplete recent data.

**Example:** With weekly granularity on a Wednesday:
- Without filtering: Shows current (partial) week vs last week → misleading delta
- With `useLastCompletePeriod`: Shows last complete week vs week before → accurate delta
- With `skipLastPeriod`: Always shows previous week vs week before that → consistent

---

### KPI Text

Display key performance indicators as customizable text

![KPI Text](/charts/kpi_text.png)

**Use Case:** Perfect for showing metrics with custom formatting, combining multiple values, or displaying contextual KPI information using templates

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| template | string | Template for displaying text. Use ${value} to insert measure value |
| decimals | number | Number of decimal places to display for numeric values |
| formatValue | function | Custom value formatter for numeric values in templates |
| valueColorIndex | number | Color from dashboard palette for the KPI value text |

---

### Markdown Chart

Display custom markdown content with formatting

![Markdown Chart](/charts/markdown.png)

**Use Case:** Perfect for adding documentation, notes, instructions, or formatted text to dashboards

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| content | string | Markdown text content |
| accentColorIndex | number | Color from dashboard palette for headers, bullets, and links |
| fontSize | string | Overall text size (small, medium, large) |
| alignment | string | Horizontal alignment (left, center, right) |

---

### Funnel Chart

Visualize multi-step conversion flows

![Funnel Chart](/charts/funnel.png)

**Use Case:** Perfect for user journey analysis, sales pipelines, onboarding flows, and any multi-step process where you want to track drop-off between stages

**How Funnel Charts Work:**

Unlike other charts that execute a single query, funnel charts use **sequential query execution**. Each step is a separate query, and the results from one step filter the next step via a "binding key" (typically a user ID or session ID).

```
Step 1: All Signups (1000 users)
    ↓ 45% converted
Step 2: Completed Profile (450 users)
    ↓ 67% converted
Step 3: Made Purchase (300 users)
```

**Display Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| funnelStepLabels | string[] | - | Custom labels for each step (e.g., `["Signup", "Activation", "Purchase"]`) |
| funnelOrientation | string | `'horizontal'` | Layout orientation: `'horizontal'` (bars left to right) or `'vertical'` (bars bottom to top) |
| hideSummaryFooter | boolean | `false` | Hide the summary footer showing overall conversion |

**Programmatic Usage:**

```tsx
import { useFunnelQuery } from 'drizzle-cube/client'

function ConversionFunnel() {
  const {
    chartData,           // Ready for FunnelChart
    stepResults,         // Per-step details
    isExecuting,         // Currently running
    currentStepIndex,    // Which step is executing
    error
  } = useFunnelQuery({
    id: 'signup-funnel',
    name: 'Signup Funnel',
    bindingKey: { dimension: 'Users.userId' },
    steps: [
      {
        id: 'signup',
        name: 'Signup',
        query: { measures: ['Signups.count'] }
      },
      {
        id: 'activation',
        name: 'Activated',
        query: { measures: ['Activations.count'] }
      },
      {
        id: 'purchase',
        name: 'First Purchase',
        query: { measures: ['Purchases.count'] }
      }
    ]
  })

  return <FunnelChart data={chartData} />
}
```

**Important Considerations:**

:::caution[Sequential Execution]
Funnel queries execute **sequentially**, not in parallel. Each step must complete before the next begins because it needs the binding key values from the previous step. This means:
- **Latency adds up** - A 3-step funnel with 500ms per query takes ~1.5 seconds total
- **Progressive loading** - Results appear step-by-step as each query completes
- **Network-dependent** - Poor network conditions will impact each step
:::

:::caution[Binding Key Limits]
To prevent performance issues with very large `IN` clauses, funnel execution limits the number of binding key values passed between steps (default: 500). If your first step returns more unique values, results may be approximate. The step result includes `bindingKeyTotalCount` to detect truncation.
:::

**Cross-Cube Funnels:**

For funnels spanning multiple cubes where the binding key has different names:

```tsx
bindingKey: {
  dimension: [
    { cube: 'Signups', dimension: 'Signups.userId' },
    { cube: 'Purchases', dimension: 'Purchases.customerId' }
  ]
}
```

---

## Custom Value Formatting

### The `formatValue` Function

KPI charts (KPI Number, KPI Text, and KPI Delta) support a powerful `formatValue` callback function that allows you to completely customize how numeric values are displayed. This is particularly useful for:

- **Time-based metrics** - Convert hours to days/hours/minutes automatically
- **Custom units** - Display values with context-aware units
- **Special cases** - Handle edge cases like "< 1", "N/A", or "∞"
- **Locale-specific formatting** - Use Intl.NumberFormat for currency, percentages, etc.

#### How It Works

When you provide a `formatValue` function in your chart's `displayConfig`, it takes complete control of value formatting and **overrides** the `prefix`, `suffix`, and `decimals` options. The formatter receives the raw numeric value (including `null` or `undefined`) and returns a formatted string to display.

```typescript
interface ChartDisplayConfig {
  formatValue?: (value: number | null | undefined) => string
}
```

#### Basic Example: Smart Time Formatting

One of the most common use cases is formatting time-based metrics. Here's a formatter that automatically chooses the best unit (hours vs days):

```typescript
function formatSmartTime(hours: number | null | undefined): string {
  // Handle null/undefined values gracefully
  if (hours === null || hours === undefined || Number.isNaN(hours)) {
    return 'N/A'
  }

  // Show "< 1 hour" for very small values
  if (hours < 1) {
    return '< 1 hour'
  }

  // Show in hours for values under 2 days
  if (hours < 48) {
    return `${hours.toFixed(1)} hours`
  }

  // Show in days for longer timeframes
  const days = hours / 24
  return `${days.toFixed(1)} days`
}
```

**Usage in a portlet:**

```jsx
<AnalyticsPortlet
  title="Median Lead Time"
  query={JSON.stringify({
    measures: ['DORAMetrics.medianLeadTimeHours'],
    timeDimensions: [{
      dimension: 'DORAMetrics.deployedAt',
      dateRange: 'last 30 days'
    }]
  })}
  chartType="kpiNumber"
  displayConfig={{
    formatValue: formatSmartTime,
    valueColorIndex: 1
  }}
/>
```

**Results:**
- `120.5` hours → `"5.0 days"`
- `24.0` hours → `"24.0 hours"`
- `0.5` hours → `"< 1 hour"`
- `null` → `"N/A"`

#### More Examples

**Currency Formatting:**
```typescript
const formatCurrency = (value: number | null | undefined): string => {
  if (!value) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value)
}

// Usage
displayConfig: {
  formatValue: formatCurrency
}
```

**Percentage with Threshold:**
```typescript
const formatPercentage = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A'
  if (value < 0.1) return '< 0.1%'
  return `${value.toFixed(1)}%`
}
```

**File Size Formatting:**
```typescript
const formatFileSize = (bytes: number | null | undefined): string => {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
```

#### Best Practices

1. **Always handle null/undefined** - Your formatter will receive these values, so handle them gracefully
2. **Return strings** - The formatter must return a string, not a number
3. **Keep it fast** - The formatter may be called multiple times during rendering
4. **Be consistent** - Use the same formatter for related metrics across your dashboard
5. **Consider edge cases** - Think about very large, very small, zero, and negative values

#### When to Use formatValue vs prefix/suffix

Use **formatValue** when:
- The unit changes based on the value (e.g., hours vs days)
- You need complex logic (e.g., "< 1", thresholds)
- You want locale-specific formatting
- You need to handle null/undefined specially

Use **prefix/suffix/decimals** when:
- You just need simple static text before/after numbers
- The formatting is straightforward
- You want to configure it via the UI without code

