---
title: Analysis Builder
---

The `AnalysisBuilder` is a modern, redesigned query builder component that provides an intuitive interface for exploring and visualizing data from your semantic layer.

## Overview

AnalysisBuilder features:
- **Split Layout**: Results panel on the left (large), query builder on the right
- **Metrics & Breakdowns**: Add measures (metrics) and dimensions (breakdowns) to build queries
- **Filters**: Apply filters with a visual filter builder
- **Auto-Execute**: Queries run automatically as you make changes
- **Smart Chart Selection**: Automatically suggests appropriate chart types based on your data
- **AI Integration**: Optional AI-powered natural language query generation
- **Shareable URLs**: Share analysis via URL hash parameters
- **Local Storage Persistence**: Remembers your last analysis

## Installation

```bash
npm install drizzle-cube react react-dom recharts react-grid-layout
```

## Basic Usage

```tsx
import { CubeProvider, AnalysisBuilder } from 'drizzle-cube/client';

function App() {
  return (
    <CubeProvider apiOptions={{ apiUrl: '/api/cubejs-api/v1' }}>
      <AnalysisBuilder maxHeight="calc(100vh - 64px)" />
    </CubeProvider>
  );
}
```

## Import Options

```tsx
// Full client import
import { AnalysisBuilder } from 'drizzle-cube/client';

// Components-only import (smaller bundle)
import { AnalysisBuilder } from 'drizzle-cube/client/components';
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `maxHeight` | `string` | - | Maximum height (e.g., `'800px'`, `'100vh'`, `'calc(100vh - 64px)'`) |
| `initialQuery` | `CubeQuery` | - | Initial query to load |
| `initialChartConfig` | `object` | - | Initial chart configuration for editing existing portlets |
| `initialData` | `any[]` | - | Initial data to display (avoids re-fetching when editing) |
| `colorPalette` | `ColorPalette` | - | Color palette for chart visualization |
| `disableLocalStorage` | `boolean` | `false` | Disable localStorage persistence |
| `hideSettings` | `boolean` | `false` | Hide the settings button |
| `onQueryChange` | `(query: CubeQuery) => void` | - | Callback when query changes |
| `onChartConfigChange` | `(config) => void` | - | Callback when chart config changes |

## Ref Methods

Access the component's methods via a ref:

```tsx
import { useRef } from 'react';
import { AnalysisBuilder, AnalysisBuilderRef } from 'drizzle-cube/client';

function App() {
  const builderRef = useRef<AnalysisBuilderRef>(null);

  const handleExport = () => {
    const query = builderRef.current?.getCurrentQuery();
    console.log('Current query:', query);
  };

  return (
    <>
      <AnalysisBuilder ref={builderRef} />
      <button onClick={handleExport}>Export Query</button>
    </>
  );
}
```

### Available Methods

| Method | Return Type | Description |
|--------|-------------|-------------|
| `getCurrentQuery()` | `CubeQuery` | Get the current query object |
| `getChartConfig()` | `{ chartType, chartConfig, displayConfig }` | Get current chart configuration |
| `executeQuery()` | `void` | Execute the current query |
| `clearQuery()` | `void` | Clear the current query |

## Building a Query

### Adding Metrics

Metrics are measures (aggregations) from your cubes. Click "Add Metric" to open the field search modal:

```tsx
// Query with two metrics
{
  measures: ['Employees.count', 'Employees.avgSalary']
}
```

### Adding Breakdowns

Breakdowns are dimensions that group your data. Add regular dimensions or time dimensions:

```tsx
// Query with dimensions
{
  measures: ['Employees.count'],
  dimensions: ['Departments.name'],
  timeDimensions: [{
    dimension: 'Employees.createdAt',
    granularity: 'month'
  }]
}
```

### Adding Filters

The filter builder supports complex filter logic:

```tsx
// Query with filters
{
  measures: ['Employees.count'],
  filters: [
    { member: 'Employees.isActive', operator: 'equals', values: [true] },
    { member: 'Employees.salary', operator: 'gte', values: [50000] }
  ]
}
```

## Multi-Query Mode

AnalysisBuilder supports three merge strategies for combining multiple queries:

### Merge Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `concat` | Append rows with `__queryIndex` marker | Separate series per query (e.g., "Sales 2023" vs "Sales 2024") |
| `merge` | Align data by common dimension key | Side-by-side comparison on same axis |
| `funnel` | Sequential execution with binding key linking | User journey and conversion analysis |

### Funnel Mode

When you select "Funnel" as the merge strategy, AnalysisBuilder enters funnel mode:

1. **Binding Key Selector** - A dimension picker appears above the query tabs. Select the dimension that links steps together (e.g., `Users.userId`, `Sessions.sessionId`).

2. **Step Tabs** - Query tabs are labeled "Step 1", "Step 2", etc. instead of "Q1", "Q2".

3. **Auto Chart Selection** - The chart type automatically switches to Funnel Chart.

4. **Sequential Execution** - Queries execute in order, with each step filtering by binding key values from the previous step.

**Example Funnel Setup:**

```
Binding Key: Users.userId

Step 1: Signups
  - Measure: Signups.count
  - Filter: Signups.createdAt in last 30 days

Step 2: Profile Complete
  - Measure: ProfileCompletions.count

Step 3: First Purchase
  - Measure: Purchases.count
```

:::tip[Binding Key Selection]
Choose a dimension that:
- Exists in all cubes used across your steps (or use cross-cube mapping)
- Uniquely identifies the entity you're tracking (user, session, order)
- Has reasonable cardinality (not millions of unique values)
:::

:::caution[Performance Warning]
Funnel queries execute **sequentially** - each step waits for the previous to complete. A 5-step funnel with 300ms queries will take ~1.5 seconds. Keep step counts reasonable for responsive UX.
:::

## Chart Configuration

The AnalysisBuilder automatically selects appropriate chart types based on your query:

- **No dimensions**: Single value display
- **One dimension**: Bar chart, line chart, or pie chart
- **Time dimension**: Line chart or area chart
- **Two dimensions**: Grouped bar chart

You can manually override the chart type using the chart selector in the results panel.

## Integration with Dashboards

Use AnalysisBuilder within portlet edit modals to create or modify dashboard tiles:

```tsx
import { AnalysisBuilder } from 'drizzle-cube/client';

function PortletEditor({ portlet, onSave }) {
  const builderRef = useRef(null);

  const handleSave = () => {
    const query = builderRef.current?.getCurrentQuery();
    const chartConfig = builderRef.current?.getChartConfig();
    onSave({ ...portlet, query, ...chartConfig });
  };

  return (
    <>
      <AnalysisBuilder
        ref={builderRef}
        initialQuery={JSON.parse(portlet.query)}
        initialChartConfig={{
          chartType: portlet.chartType,
          chartConfig: portlet.chartConfig,
          displayConfig: portlet.displayConfig
        }}
      />
      <button onClick={handleSave}>Save</button>
    </>
  );
}
```

## AI Query Generation

When AI features are enabled via `CubeProvider`, users can describe queries in natural language:

```tsx
<CubeProvider
  apiOptions={{ apiUrl: '/api/cubejs-api/v1' }}
  features={{
    ai: {
      enabled: true,
      geminiApiKey: process.env.GEMINI_API_KEY
    }
  }}
>
  <AnalysisBuilder />
</CubeProvider>
```

Users can then type queries like:
- "Show me monthly sales by region"
- "Count employees by department where salary > 50000"

## URL Sharing

Analysis state can be shared via URL hash parameters. The AnalysisBuilder automatically:
- Encodes the current state in the URL hash when sharing
- Restores state from URL hash on load
- Clears the hash after restoration to enable further editing

## Styling

The AnalysisBuilder uses the drizzle-cube theming system. Customize colors by overriding CSS variables:

```css
:root {
  --dc-primary: #3b82f6;
  --dc-bg: #ffffff;
  --dc-border: #e5e7eb;
}
```

See the [Theming](/client/theming) documentation for complete customization options.

## Migration from QueryBuilder

The `AnalysisBuilder` replaces the deprecated `QueryBuilder` component. Key differences:

| QueryBuilder | AnalysisBuilder |
|--------------|-----------------|
| Three-panel layout | Two-panel split layout |
| Manual field selection | Search-based field modal |
| Manual query execution | Auto-execute on changes |
| No AI integration | Built-in AI query generation |
| No URL sharing | URL hash sharing |

### Migration Steps

1. Replace `QueryBuilder` with `AnalysisBuilder` in your imports
2. Update prop names if needed (most are compatible)
3. Update any refs to use `AnalysisBuilderRef` methods

```tsx
// Before
import { QueryBuilder } from 'drizzle-cube/client';
<QueryBuilder />

// After
import { AnalysisBuilder } from 'drizzle-cube/client';
<AnalysisBuilder />
```

A shim is provided for backwards compatibility, but migration is recommended.
