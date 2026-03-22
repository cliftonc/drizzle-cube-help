---
title: Chart Plugins
---

Drizzle Cube's chart plugin system lets you register custom chart types at runtime, override built-in charts, and scaffold new charts from existing implementations. Custom charts integrate fully with the chart type picker, axis configuration panel, and display options — just like built-in charts.

## Quick Start

### 1. Create a Chart Component

A chart component receives the standard `ChartProps` interface:

```tsx
// src/charts/HorizontalBarChart.tsx
import React, { useMemo } from 'react'
import type { ChartProps } from 'drizzle-cube/client'

const HorizontalBarChart = React.memo(function HorizontalBarChart({
  data,
  chartConfig,
  displayConfig = {},
  height = '100%',
  colorPalette,
}: ChartProps) {
  if (!data || data.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No data</div>
  }

  const categoryField = chartConfig?.xAxis?.[0]
  const valueField = chartConfig?.yAxis?.[0]
  if (!categoryField || !valueField) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      Configure X-Axis and Y-Axis fields
    </div>
  }

  const items = data.map(row => ({
    label: String(row[categoryField] ?? ''),
    value: Number(row[valueField] ?? 0),
  }))
  const maxValue = Math.max(...items.map(d => d.value), 1)
  const colors = colorPalette?.colors || ['#6366f1', '#8b5cf6']

  return (
    <div style={{ height: typeof height === 'number' ? `${height}px` : height, overflow: 'auto', padding: 16 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 120, textAlign: 'right', fontSize: 13 }}>{item.label}</div>
          <div style={{ flex: 1, height: 24, backgroundColor: '#f3f4f6', borderRadius: 4 }}>
            <div style={{
              width: `${(item.value / maxValue) * 100}%`,
              height: '100%',
              backgroundColor: colors[i % colors.length],
              borderRadius: 4,
              transition: 'width 0.4s ease-out',
            }} />
          </div>
          <div style={{ width: 60, textAlign: 'right', fontSize: 13, fontWeight: 600 }}>
            {item.value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  )
})

export default HorizontalBarChart
```

### 2. Create a Chart Config

The config defines how the chart appears in the UI — its drop zones (axis configuration), display options, and metadata:

```tsx
// src/charts/HorizontalBarChart.config.ts
import type { ChartTypeConfig } from 'drizzle-cube/client'

export const horizontalBarConfig: ChartTypeConfig = {
  label: 'Horizontal Bar',
  description: 'Horizontal bars comparing values across categories',
  useCase: 'Great for ranked lists and data with long labels',

  dropZones: [
    {
      key: 'xAxis',
      label: 'Categories',
      mandatory: true,
      maxItems: 1,
      acceptTypes: ['dimension'],
      emptyText: 'Drop a dimension here',
    },
    {
      key: 'yAxis',
      label: 'Values',
      mandatory: true,
      maxItems: 1,
      acceptTypes: ['measure'],
      emptyText: 'Drop a measure here',
    },
  ],

  displayOptionsConfig: [
    {
      key: 'showValues',
      label: 'Show Values',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'showGrid',
      label: 'Show Track',
      type: 'boolean',
      defaultValue: true,
    },
  ],
}
```

### 3. Register via CubeProvider

Pass your custom charts to CubeProvider using the `customCharts` prop:

```tsx
// src/App.tsx
import { CubeProvider, type ChartDefinition } from 'drizzle-cube/client'
import HorizontalBarChart from './charts/HorizontalBarChart'
import { horizontalBarConfig } from './charts/HorizontalBarChart.config'

const customCharts: ChartDefinition[] = [
  {
    type: 'horizontalBar',
    label: 'Horizontal Bar',
    config: horizontalBarConfig,
    component: HorizontalBarChart,
  },
]

function App() {
  return (
    <CubeProvider
      apiOptions={{ apiUrl: '/cubejs-api/v1' }}
      customCharts={customCharts}
    >
      <YourApp />
    </CubeProvider>
  )
}
```

That's it. Your custom chart now appears in the chart type picker, supports axis configuration via drop zones, and has configurable display options.

## ChartDefinition Reference

The `ChartDefinition` interface is what you pass to register a chart:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `string` | Yes | Unique identifier (e.g., `'horizontalBar'`). Use a built-in name like `'bar'` to override it. |
| `label` | `string` | Yes | Display name in the chart type picker. |
| `config` | `ChartTypeConfig` | Yes | Drop zones, display options, validation. |
| `component` | `ComponentType<ChartProps>` | No* | Eagerly loaded chart component. |
| `lazyComponent` | `() => Promise<{ default: ComponentType<ChartProps> }>` | No* | Lazy-loaded chart component (for code splitting). |
| `icon` | `ComponentType<IconProps>` | No | Custom icon for the chart type picker. Falls back to a default bar chart icon. |
| `dependencies` | `{ packageName, installCommand }` | No | If set, shows install instructions when the import fails. |

\* Provide either `component` or `lazyComponent`.

## ChartProps Reference

Every chart component receives the same props:

| Prop | Type | Description |
|------|------|-------------|
| `data` | `any[]` | Raw query result rows. |
| `chartConfig` | `ChartAxisConfig` | Axis mapping — `xAxis`, `yAxis`, `series`, `sizeField`, `colorField`. |
| `displayConfig` | `ChartDisplayConfig` | Visual options — your custom keys from `displayOptionsConfig` plus standard ones. |
| `queryObject` | `CubeQuery` | The original query (useful for granularity, metadata). |
| `height` | `string \| number` | Container height. |
| `colorPalette` | `ColorPalette` | Theme color palette with `colors` and `gradients` arrays. |
| `onDataPointClick` | `(event) => void` | Drill-down click handler. |
| `drillEnabled` | `boolean` | Whether drill-down is active. |

## ChartTypeConfig Reference

The config controls how your chart appears in the Analysis Builder UI:

### Drop Zones

Drop zones define the axes/fields your chart accepts. Each drop zone creates a configuration area in the chart config panel:

```tsx
dropZones: [
  {
    key: 'xAxis',              // Stored in chartConfig.xAxis
    label: 'X-Axis',           // Shown in the UI
    description: 'Categories', // Help text
    mandatory: true,           // At least one field required
    maxItems: 1,               // Max fields allowed
    acceptTypes: ['dimension', 'timeDimension', 'measure'],
    emptyText: 'Drop a field here',
    enableDualAxis: false,     // Enable L/R axis toggle (for Y-axes)
  }
]
```

**Accept types:**
- `'dimension'` — String/boolean dimensions
- `'timeDimension'` — Date/time dimensions
- `'measure'` — Numeric measures

### Display Options

Display options create configuration controls in the chart settings panel:

```tsx
displayOptionsConfig: [
  // Boolean toggle
  { key: 'showLegend', label: 'Show Legend', type: 'boolean', defaultValue: true },

  // Select dropdown
  {
    key: 'stackType',
    label: 'Stacking',
    type: 'select',
    defaultValue: 'none',
    options: [
      { value: 'none', label: 'None' },
      { value: 'normal', label: 'Stacked' },
      { value: 'percent', label: '100%' },
    ],
  },

  // Number input
  { key: 'barWidth', label: 'Bar Width', type: 'number', min: 1, max: 100, defaultValue: 20 },

  // String input
  { key: 'title', label: 'Custom Title', type: 'string', placeholder: 'Enter title...' },

  // Axis format config
  { key: 'leftYAxisFormat', label: 'Y-Axis Format', type: 'axisFormat' },

  // Color picker
  { key: 'accentColor', label: 'Accent Color', type: 'color' },
]
```

**Available types:** `'boolean'`, `'string'`, `'number'`, `'select'`, `'color'`, `'paletteColor'`, `'axisFormat'`, `'stringArray'`, `'buttonGroup'`

## Overriding Built-in Charts

To replace a built-in chart, use its type name:

```tsx
const customCharts: ChartDefinition[] = [
  {
    type: 'bar',  // Overrides the built-in bar chart
    label: 'Custom Bar',
    config: myBarConfig,
    component: MyBarChart,
  },
]
```

The built-in is backed up internally. If you unregister the override (or unmount the CubeProvider), the original is restored automatically.

## Lazy Loading

For code splitting, use `lazyComponent` instead of `component`:

```tsx
const customCharts: ChartDefinition[] = [
  {
    type: 'gantt',
    label: 'Gantt Chart',
    config: ganttConfig,
    lazyComponent: () => import('./charts/GanttChart'),
    dependencies: {
      packageName: 'gantt-lib',
      installCommand: 'npm install gantt-lib',
    },
  },
]
```

If the import fails (e.g., the dependency isn't installed), a helpful fallback UI is shown with install instructions instead of crashing the app.

## Custom Icons

Provide an icon component to display in the chart type picker:

```tsx
import { Icon } from '@iconify/react'

const GanttIcon = ({ className }: { className?: string }) => (
  <Icon icon="mdi:chart-gantt" className={className} />
)

const customCharts: ChartDefinition[] = [
  {
    type: 'gantt',
    label: 'Gantt Chart',
    config: ganttConfig,
    component: GanttChart,
    icon: GanttIcon,
  },
]
```

If no icon is provided, the default bar chart icon is used.

## Imperative Registration

For library authors or advanced use cases, you can register charts outside of React:

```tsx
import { chartPluginRegistry } from 'drizzle-cube/client'

// Register
chartPluginRegistry.register({
  type: 'gantt',
  label: 'Gantt Chart',
  config: ganttConfig,
  component: GanttChart,
})

// Unregister
chartPluginRegistry.unregister('gantt')

// Query
chartPluginRegistry.isCustom('gantt')    // true
chartPluginRegistry.getCustomTypes()     // ['gantt']
```

The imperative API uses `useSyncExternalStore` under the hood, so React components (like the chart type picker) automatically re-render when charts are registered or unregistered.

## CLI Scaffolding

The `drizzle-cube` CLI helps you scaffold custom charts:

```bash
# Scaffold an example custom chart
npx drizzle-cube charts init

# Copy a built-in chart as a starting point
npx drizzle-cube charts init --from bar

# Specify output directory
npx drizzle-cube charts init --from pie -o ./src/custom-charts

# List all available built-in chart types
npx drizzle-cube charts list
```

### `charts init`

Generates three files:
- **Component** (`MyCustomChart.tsx`) — The chart React component
- **Config** (`MyCustomChart.config.ts`) — Drop zones and display options
- **Registration** (`index.ts`) — Exports a `customCharts` array ready for CubeProvider

### `charts init --from <type>`

Copies the actual source code of a built-in chart with all internal imports rewritten to use `drizzle-cube/client`. This is the fastest way to create a customized version of an existing chart.

### `charts list`

Lists all available built-in chart types with descriptions:

```
  bar              Bar chart — compare values across categories
  line             Line chart — show trends over time
  pie              Pie chart — show proportions of a whole
  scatter          Scatter chart — show relationships between two measures
  ...
```

## Using Custom Charts in Dashboards

Custom chart types work in dashboard portlet configurations just like built-in types:

```tsx
const dashboardConfig = {
  portlets: [
    {
      id: 'sales-ranking',
      title: 'Sales by Region',
      query: JSON.stringify({
        measures: ['Sales.revenue'],
        dimensions: ['Regions.name'],
      }),
      chartType: 'horizontalBar',  // Your custom chart type
      chartConfig: {
        xAxis: ['Regions.name'],
        yAxis: ['Sales.revenue'],
      },
      displayConfig: {
        showValues: true,
      },
      w: 6, h: 6, x: 0, y: 0,
    },
  ],
}
```

## Using Custom Charts with AnalyticsPortlet

Render a custom chart directly using `AnalyticsPortlet`:

```tsx
import { AnalyticsPortlet } from 'drizzle-cube/client'

<AnalyticsPortlet
  query={JSON.stringify({
    measures: ['Employees.count'],
    dimensions: ['Departments.name'],
  })}
  chartType="horizontalBar"
  chartConfig={{
    xAxis: ['Departments.name'],
    yAxis: ['Employees.count'],
  }}
  displayConfig={{ showValues: true }}
  title="Headcount by Department"
  height={300}
/>
```

## Best Practices

### Component Pattern

- Wrap in `React.memo` for performance
- Handle empty data gracefully — return a centered message, not an error
- Handle missing axis config — show a helpful "configure X and Y" message
- Use `colorPalette?.colors` for theming integration
- Support the `height` prop (can be string like `'100%'` or number)

### Config Pattern

- Set `label` — it's the single source of truth for the chart's display name
- Mark axes as `mandatory: true` when the chart can't render without them
- Use `maxItems: 1` for axes that only accept a single field
- Provide `emptyText` for helpful drop zone placeholder text
- Include `description` and `useCase` for tooltips in the chart type picker

### Registration Pattern

- Prefer the `customCharts` prop on CubeProvider — it handles cleanup on unmount
- Use `lazyComponent` for charts with heavy dependencies to keep bundle size small
- Use meaningful type strings (e.g., `'horizontalBar'` not `'hb'`)
- Avoid overriding built-in types unless you genuinely want to replace them

## Type Safety

The `ChartType` type is an open union — it includes all built-in types with autocomplete support, plus accepts any string for custom types:

```tsx
import type { ChartType, BuiltInChartType } from 'drizzle-cube/client'

// Built-in types have autocomplete
const builtIn: BuiltInChartType = 'bar'  // Autocomplete works

// Custom types are valid ChartType values
const custom: ChartType = 'horizontalBar'  // No type error

// Use BuiltInChartType when you need to narrow to only built-ins
function isBuiltIn(type: ChartType): type is BuiltInChartType {
  return ['bar', 'line', 'pie', /* ... */].includes(type)
}
```
