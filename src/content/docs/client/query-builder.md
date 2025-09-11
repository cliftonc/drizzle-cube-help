---
title: Query Builder
---

The Query Builder component provides an intuitive drag-and-drop interface for building analytics queries without writing code. It's perfect for end-users who want to explore data interactively or for developers who need a quick way to prototype queries.

## Overview

The Query Builder allows users to:

- **Drag dimensions and measures** from a sidebar into query areas
- **Apply filters** with various operators and conditions  
- **Group by time periods** with automatic time dimension handling
- **Preview results** in real-time as they build queries
- **Export queries** as JSON or copy generated SQL
- **Save and load** query configurations

## Basic Usage

```tsx
import { QueryBuilder } from '@drizzle-cube/react';

function AnalyticsPage() {
  const [query, setQuery] = useState({
    dimensions: [],
    measures: [],
    filters: [],
    timeDimension: null
  });

  return (
    <QueryBuilder
      cubes={['users', 'orders', 'products']}
      query={query}
      onChange={setQuery}
      onExecute={(results) => {
        console.log('Query results:', results);
      }}
    />
  );
}
```

## Props

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `cubes` | `string[]` | Array of cube names available for querying |
| `query` | `Query` | Current query state object |
| `onChange` | `(query: Query) => void` | Callback fired when query changes |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onExecute` | `(results: any) => void` | - | Callback fired when user executes query |
| `showSql` | `boolean` | `false` | Whether to show generated SQL preview |
| `allowSave` | `boolean` | `true` | Whether to show save/load query buttons |
| `height` | `string` | `'600px'` | Height of the query builder interface |
| `theme` | `'light' \| 'dark'` | `'light'` | Visual theme |

## Query Object Structure

The query object follows the Drizzle Cube query format:

```typescript
interface Query {
  dimensions?: string[];
  measures?: string[];
  filters?: Filter[];
  timeDimension?: TimeDimension;
  order?: Record<string, 'asc' | 'desc'>;
  limit?: number;
}

interface Filter {
  member: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'inDateRange';
  values: string[];
}

interface TimeDimension {
  dimension: string;
  granularity: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  dateRange?: string[] | 'Last 7 days' | 'Last 30 days' | 'This month' | 'This year';
}
```

## Features

### Drag and Drop Interface

The Query Builder provides three main drop zones:

```tsx
// Dimensions area - for grouping data
<DimensionsArea
  dimensions={query.dimensions}
  onAdd={(dimension) => {
    setQuery(prev => ({
      ...prev,
      dimensions: [...prev.dimensions, dimension]
    }));
  }}
  onRemove={(dimension) => {
    setQuery(prev => ({
      ...prev,
      dimensions: prev.dimensions.filter(d => d !== dimension)
    }));
  }}
/>

// Measures area - for aggregated values
<MeasuresArea
  measures={query.measures}
  onAdd={(measure) => {
    setQuery(prev => ({
      ...prev,
      measures: [...prev.measures, measure]
    }));
  }}
/>

// Filters area - for data filtering
<FiltersArea
  filters={query.filters}
  onAdd={(filter) => {
    setQuery(prev => ({
      ...prev,
      filters: [...prev.filters, filter]
    }));
  }}
/>
```

### Real-time Preview

Enable real-time query execution as users build their queries:

```tsx
<QueryBuilder
  cubes={cubes}
  query={query}
  onChange={setQuery}
  onExecute={async (query) => {
    const results = await semanticLayer.query(query);
    setResults(results);
  }}
  realTimePreview={true}
  previewLimit={100}
/>
```

### Filter Builder

The built-in filter builder supports various operators:

```tsx
// String filters
{
  member: 'users.name',
  operator: 'contains',
  values: ['john']
}

// Numeric filters  
{
  member: 'orders.total',
  operator: 'gte',
  values: ['100']
}

// Date range filters
{
  member: 'orders.createdAt',
  operator: 'inDateRange',
  values: ['2024-01-01', '2024-12-31']
}
```

### Time Dimension Builder

Special handling for time-based queries:

```tsx
// Monthly sales over the last year
{
  timeDimension: {
    dimension: 'orders.createdAt',
    granularity: 'month',
    dateRange: 'Last 12 months'
  }
}

// Custom date range with weekly grouping
{
  timeDimension: {
    dimension: 'users.signUpDate', 
    granularity: 'week',
    dateRange: ['2024-01-01', '2024-03-31']
  }
}
```

## Advanced Configuration

### Custom Cube Schema Display

Customize how cubes, dimensions, and measures are displayed:

```tsx
<QueryBuilder
  cubes={cubes}
  query={query}
  onChange={setQuery}
  cubeConfig={{
    users: {
      title: 'Users',
      description: 'User registration and profile data',
      dimensions: {
        'users.name': { title: 'Full Name', type: 'string' },
        'users.email': { title: 'Email Address', type: 'string' },
        'users.signUpDate': { title: 'Sign Up Date', type: 'time' }
      },
      measures: {
        'users.count': { title: 'Total Users', type: 'number' },
        'users.avgAge': { title: 'Average Age', type: 'number' }
      }
    }
  }}
/>
```

### Query Validation

Add custom validation rules:

```tsx
<QueryBuilder
  cubes={cubes}
  query={query}
  onChange={setQuery}
  validation={{
    maxDimensions: 5,
    maxMeasures: 10,
    maxFilters: 20,
    requiredMeasure: true, // Require at least one measure
    validate: (query) => {
      if (query.dimensions.length === 0 && query.measures.length === 0) {
        return 'Please select at least one dimension or measure';
      }
      return null;
    }
  }}
/>
```

### Custom Actions

Add custom toolbar actions:

```tsx
<QueryBuilder
  cubes={cubes}
  query={query}
  onChange={setQuery}
  actions={[
    {
      label: 'Export to CSV',
      icon: <DownloadIcon />,
      onClick: async (query) => {
        const results = await semanticLayer.query(query);
        exportToCsv(results);
      }
    },
    {
      label: 'Create Dashboard',
      icon: <PlusIcon />,
      onClick: (query) => {
        createDashboardFromQuery(query);
      }
    }
  ]}
/>
```

## Integration Examples

### With Charts

Combine Query Builder with chart components:

```tsx
function InteractiveChart() {
  const [query, setQuery] = useState({ dimensions: [], measures: [] });
  const [data, setData] = useState([]);

  const handleQueryChange = async (newQuery) => {
    setQuery(newQuery);
    if (newQuery.measures.length > 0) {
      const results = await semanticLayer.query(newQuery);
      setData(results.data);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <QueryBuilder
        cubes={['orders', 'products']}
        query={query}
        onChange={handleQueryChange}
      />
      
      <ChartRenderer
        data={data}
        query={query}
        type="bar"
      />
    </div>
  );
}
```

### With Dashboards

Create dynamic dashboard builders:

```tsx
function DashboardBuilder() {
  const [widgets, setWidgets] = useState([]);

  const addWidget = (query) => {
    const newWidget = {
      id: Date.now(),
      query,
      type: 'chart',
      title: generateTitleFromQuery(query)
    };
    setWidgets(prev => [...prev, newWidget]);
  };

  return (
    <div>
      <QueryBuilder
        cubes={cubes}
        query={{}}
        onChange={() => {}}
        onExecute={addWidget}
      />
      
      <DashboardGrid widgets={widgets} />
    </div>
  );
}
```

## Styling and Theming

### CSS Custom Properties

Customize appearance with CSS variables:

```css
.query-builder {
  --qb-primary-color: #3b82f6;
  --qb-background: #ffffff;
  --qb-border: #e5e7eb;
  --qb-text: #1f2937;
  --qb-text-muted: #6b7280;
  --qb-drop-zone: #f3f4f6;
  --qb-drop-zone-active: #dbeafe;
}
```

### Component Classes

Style individual components:

```css
.query-builder-sidebar {
  /* Sidebar containing cubes and fields */
}

.query-builder-canvas {
  /* Main drop zone area */
}

.query-builder-dimension-tag {
  /* Individual dimension pills */
}

.query-builder-measure-tag {
  /* Individual measure pills */
}

.query-builder-filter-item {
  /* Filter configuration items */
}
```

## Accessibility

The Query Builder includes comprehensive accessibility features:

- **Keyboard navigation** - Full keyboard support for all interactions
- **Screen reader support** - ARIA labels and descriptions
- **Focus management** - Proper focus flow and visual indicators
- **High contrast support** - Works with system high contrast modes

```tsx
<QueryBuilder
  cubes={cubes}
  query={query}
  onChange={setQuery}
  accessibility={{
    announceChanges: true,
    keyboardShortcuts: true,
    highContrast: true
  }}
/>
```

## Performance Optimization

### Large Schema Handling

For applications with many cubes and fields:

```tsx
<QueryBuilder
  cubes={cubes}
  query={query}
  onChange={setQuery}
  performance={{
    virtualizeSchema: true, // Virtualize long field lists
    debounceMs: 300,        // Debounce query changes
    lazyLoadCubes: true     // Load cube schemas on demand
  }}
/>
```

### Query Caching

Enable query result caching:

```tsx
<QueryBuilder
  cubes={cubes}
  query={query}
  onChange={setQuery}
  caching={{
    enabled: true,
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 100        // Max cached queries
  }}
/>
```

## Error Handling

Handle various error scenarios:

```tsx
<QueryBuilder
  cubes={cubes}
  query={query}
  onChange={setQuery}
  onError={(error, context) => {
    console.error('Query Builder error:', error);
    
    switch (context) {
      case 'query-execution':
        toast.error('Failed to execute query');
        break;
      case 'schema-loading':
        toast.error('Failed to load cube schema');
        break;
      case 'validation':
        toast.error(error.message);
        break;
    }
  }}
  errorBoundary={{
    fallback: <div>Something went wrong with the Query Builder</div>
  }}
/>
```

## Next Steps

- Explore [Charts](/client/charts) to visualize Query Builder results
- Learn about [Dashboards](/client/dashboards) for multi-query interfaces
- Check out [React Hooks](/client/hooks) for programmatic query building
- See [Examples](/examples) for complete implementations