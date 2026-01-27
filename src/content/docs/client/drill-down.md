---
title: Drill-Down Navigation
---

Drill-down navigation allows users to interactively explore data by clicking on chart data points. When a user clicks on a chart element, they can drill into more detailed data, enabling self-service analytics without leaving the dashboard.

## How It Works

1. **User clicks a data point** on a chart (bar, line segment, pie slice)
2. **DrillMenu appears** showing available drill options based on metadata
3. **User selects a drill direction** (time granularity, hierarchy level, or details)
4. **Query is rebuilt** with the appropriate filters and dimensions
5. **DrillBreadcrumb updates** showing the navigation path

## Drilling Types

Drizzle Cube supports three types of drilling:

### Time Dimension Drilling

Navigate between time granularities within the same dimension:

- **Year** → **Quarter** → **Month** → **Week** → **Day** → **Hour**

When a query includes a `timeDimension`, users can drill down to finer granularities or back up to coarser ones. The clicked value becomes a filter.

**Example:** Clicking on "Q1 2024" in a quarterly chart drills down to show monthly data for Jan-Mar 2024.

### Dimension Hierarchy Drilling

Navigate through configured hierarchies in your cube definitions:

**Example hierarchy:** `Country` → `Region` → `City`

When hierarchies are defined, clicking on "United States" drills down to show regions within the US. Clicking on "California" shows cities within California.

### Details Drilling

Drill from aggregated measures into underlying records:

When `drillMembers` are defined on a measure, clicking on an aggregate (e.g., "Total Sales: $50,000") shows the individual records that make up that total.

---

## Server Configuration

### Defining Hierarchies

Add hierarchies to your cube definitions to enable dimension drilling:

```typescript
import { defineCube } from 'drizzle-cube'
import { eq } from 'drizzle-orm'
import { employees } from './schema'

export const employeesCube = defineCube({
  name: 'Employees',
  sql: (ctx) => eq(employees.organisationId, ctx.securityContext.organisationId),

  // Define hierarchies for drill-down navigation
  hierarchies: {
    location: {
      name: 'location',
      title: 'Geographic Location',
      levels: ['country', 'region', 'city']
    },
    organization: {
      name: 'organization',
      title: 'Organizational Structure',
      levels: ['department', 'team', 'employee']
    }
  },

  dimensions: {
    country: {
      type: 'string',
      sql: () => employees.country
    },
    region: {
      type: 'string',
      sql: () => employees.region
    },
    city: {
      type: 'string',
      sql: () => employees.city
    },
    // ... other dimensions
  },

  measures: {
    count: {
      type: 'count',
      sql: () => employees.id
    }
  }
})
```

**Hierarchy Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Unique identifier for the hierarchy |
| `title` | string | Human-readable display name |
| `levels` | string[] | Ordered array of dimension names (top to bottom) |

### Defining Drill Members

Add `drillMembers` to measures to enable details drilling:

```typescript
measures: {
  count: {
    type: 'count',
    sql: () => employees.id,
    // Dimensions to show when drilling into this measure
    drillMembers: ['Employees.name', 'Employees.email', 'Departments.name']
  },
  totalSalary: {
    type: 'sum',
    sql: () => employees.salary,
    drillMembers: ['Employees.name', 'Employees.salary', 'Departments.name']
  },
  averageSalary: {
    type: 'avg',
    sql: () => employees.salary,
    // Cross-cube drill members are supported
    drillMembers: ['Employees.name', 'Departments.name', 'Employees.city']
  }
}
```

**Best practices for drillMembers:**

- Include dimensions that provide context (names, dates, categories)
- Order from most to least important
- Cross-cube members (e.g., `Departments.name`) work if joins are defined
- Keep the list focused (5-10 members recommended)

---

## Client Integration

### Automatic Integration (Dashboards)

The `AnalyticsPortlet` component automatically enables drill-down when:
- Cube metadata includes hierarchies or drillMembers
- Charts are configured with click handlers

No additional code is required for dashboards using the standard components.

### Manual Integration (Advanced)

For custom implementations, use the drill hooks and components directly:

```tsx
import {
  useDrillInteraction,
  DrillMenu,
  DrillBreadcrumb
} from 'drizzle-cube/client'

function CustomChart({ query, data, meta }) {
  const {
    drillStack,
    currentQuery,
    handleDrillClick,
    handleDrillSelect,
    handleBreadcrumbClick,
    resetDrill,
    drillMenuState
  } = useDrillInteraction({
    initialQuery: query,
    cubeMeta: meta,
    onQueryChange: (newQuery) => {
      // Execute the new query
    }
  })

  return (
    <div>
      <DrillBreadcrumb
        drillStack={drillStack}
        onBreadcrumbClick={handleBreadcrumbClick}
        onReset={resetDrill}
      />

      <MyChart
        data={data}
        onClick={(point) => handleDrillClick({
          dataPoint: point,
          clickedDimension: point.dimension,
          clickedValue: point.value
        })}
      />

      <DrillMenu
        isOpen={drillMenuState.isOpen}
        position={drillMenuState.position}
        options={drillMenuState.options}
        onSelect={handleDrillSelect}
        onClose={() => drillMenuState.close()}
      />
    </div>
  )
}
```

### useDrillInteraction Hook

The main hook for managing drill state:

```typescript
const {
  drillStack,           // Array of drill history entries
  currentQuery,         // The current query after drilling
  handleDrillClick,     // Call when user clicks a data point
  handleDrillSelect,    // Call when user selects a drill option
  handleBreadcrumbClick, // Navigate to a previous drill level
  resetDrill,           // Return to the original query
  drillMenuState        // State for the DrillMenu component
} = useDrillInteraction({
  initialQuery,         // Starting query
  cubeMeta,             // Cube metadata from useCubeMetaQuery
  onQueryChange         // Callback when query changes
})
```

---

## UI Components

### DrillMenu

A popover menu that appears when clicking on a data point:

```tsx
<DrillMenu
  isOpen={boolean}
  position={{ x: number, y: number }}
  options={DrillOption[]}
  onSelect={(option: DrillOption) => void}
  onClose={() => void}
/>
```

**Drill options include:**
- Time granularity options (e.g., "Drill to Month", "Drill to Day")
- Hierarchy level options (e.g., "Drill to Region", "Drill to City")
- Details option (e.g., "Show Records")

### DrillBreadcrumb

Navigation breadcrumb showing the drill path:

```tsx
<DrillBreadcrumb
  drillStack={DrillStackEntry[]}
  onBreadcrumbClick={(index: number) => void}
  onReset={() => void}
/>
```

**Example breadcrumb:** `All Data > 2024 > Q1 > January`

---

## Supported Charts

The following chart types support drill-down interactions:

| Chart | Click Target | Notes |
|-------|--------------|-------|
| Bar Chart | Individual bars | Works with grouped and stacked bars |
| Line Chart | Data points | Click on dots/markers |
| Pie Chart | Pie slices | Each slice is clickable |
| Area Chart | Data points | Similar to line chart |
| TreeMap | Rectangles | Each tile is clickable |

---

## Example Configuration

Here's a complete example with hierarchies and drill members:

```typescript
// cubes/sales.ts
export const salesCube = defineCube({
  name: 'Sales',
  sql: (ctx) => eq(sales.organisationId, ctx.securityContext.organisationId),

  hierarchies: {
    geography: {
      name: 'geography',
      title: 'Geographic Region',
      levels: ['country', 'state', 'city']
    },
    product: {
      name: 'product',
      title: 'Product Hierarchy',
      levels: ['category', 'subcategory', 'productName']
    }
  },

  measures: {
    totalRevenue: {
      type: 'sum',
      sql: () => sales.amount,
      drillMembers: [
        'Sales.orderDate',
        'Sales.productName',
        'Sales.city',
        'Customers.name'
      ]
    },
    orderCount: {
      type: 'count',
      sql: () => sales.id,
      drillMembers: [
        'Sales.orderDate',
        'Sales.productName',
        'Customers.name'
      ]
    }
  },

  dimensions: {
    // Geography hierarchy dimensions
    country: { type: 'string', sql: () => sales.country },
    state: { type: 'string', sql: () => sales.state },
    city: { type: 'string', sql: () => sales.city },

    // Product hierarchy dimensions
    category: { type: 'string', sql: () => sales.category },
    subcategory: { type: 'string', sql: () => sales.subcategory },
    productName: { type: 'string', sql: () => sales.productName },

    // Time dimension for granularity drilling
    orderDate: { type: 'time', sql: () => sales.orderDate }
  }
})
```

**Query example with time dimension:**

```typescript
// Initial query - yearly view
const query = {
  measures: ['Sales.totalRevenue'],
  timeDimensions: [{
    dimension: 'Sales.orderDate',
    granularity: 'year',
    dateRange: ['2023-01-01', '2024-12-31']
  }]
}
```

When the user clicks on "2024", the drill-down system:
1. Adds a filter for 2024
2. Changes granularity to `quarter`
3. Executes the new query showing Q1-Q4 2024

---

## Related Documentation

- [Cubes](/semantic-layer/cubes/) - Defining cubes with hierarchies
- [Dimensions](/semantic-layer/dimensions/) - Dimension configuration
- [Measures](/semantic-layer/measures/) - Measure configuration with drillMembers
- [Dashboards](/client/dashboards/) - Dashboard components
- [Charts](/client/charts/) - Chart types and configuration
