---
title: Data Browser
---

The Data Browser is a standalone component for browsing raw cube data. It provides a Neon-style interface with a cube list sidebar, sortable/resizable data table, filtering, and server-side pagination — all powered by [ungrouped queries](/semantic-layer/ungrouped-queries/).

## Quick Start

```tsx
import { CubeProvider, DataBrowser } from 'drizzle-cube/client'
import 'drizzle-cube/client/styles.css'

function DataBrowserPage() {
  return (
    <CubeProvider apiOptions={{ apiUrl: '/api/cubejs-api/v1' }} token={token}>
      <DataBrowser maxHeight="calc(100vh - 100px)" />
    </CubeProvider>
  )
}
```

## Features

- **Cube sidebar** — searchable list of all cubes, click to browse
- **Sortable columns** — click column headers to cycle through ascending/descending/none
- **Resizable columns** — drag column borders to resize; widths are persisted to localStorage per cube
- **Column type badges** — headers show the field type (text, num, time, bool)
- **Right-aligned numbers** — numeric columns automatically right-align with tabular number formatting
- **Server-side pagination** — configurable page size (20, 50, 100) with limit/offset
- **Filtering** — reuses the AnalysisBuilder filter UI for full filter support (equals, contains, gt/lt, date ranges, etc.)
- **Column picker** — add/remove columns using the field search modal
- **Default sort** — automatically sorts by primary key dimension on first load
- **Custom loading indicator** — pass a `loadingComponent` prop for branded loading states

## Props

```typescript
interface DataBrowserProps {
  /** Additional CSS classes */
  className?: string
  /** Initially selected cube */
  defaultCube?: string
  /** Default page size (default: 20) */
  defaultPageSize?: number
  /** Max height for the component (default: '100vh') */
  maxHeight?: string
  /** Custom loading indicator (defaults to LoadingIndicator) */
  loadingComponent?: ReactNode
}
```

## Props Reference

### `defaultCube`

Pre-select a cube when the component mounts:

```tsx
<DataBrowser defaultCube="Employees" />
```

### `defaultPageSize`

Set the initial number of rows per page:

```tsx
<DataBrowser defaultPageSize={50} />
```

### `maxHeight`

Control the component height (it's designed for full-page use):

```tsx
<DataBrowser maxHeight="calc(100vh - 200px)" />
```

### `loadingComponent`

Provide a custom loading indicator that matches your app's branding:

```tsx
const MyLoader = () => (
  <div className="flex items-center justify-center">
    <img src="/logo.png" alt="Loading..." className="h-10 w-10 animate-spin" />
  </div>
)

<DataBrowser loadingComponent={<MyLoader />} />
```

## Architecture

The Data Browser uses the same patterns as other drizzle-cube components:

- **Zustand store** — manages cube selection, visible columns, sort, pagination, and filters as client state
- **Column widths** — stored in a separate cosmetic slice that never affects queries, persisted to localStorage
- **`useDataBrowser` hook** — master hook that builds ungrouped queries from store state and fetches data via `useCubeLoadQuery`
- **Reused components** — `AnalysisFilterSection` for filters, `FieldSearchModal` for column picker

### Hooks

The `useDataBrowser` hook is exported for advanced use cases:

```typescript
import { useDataBrowser } from 'drizzle-cube/client'

function CustomDataBrowser() {
  const {
    selectedCube,
    visibleColumns,
    rawData,
    isLoading,
    isFetching,
    page,
    pageSize,
    sortColumn,
    sortDirection,
    filters,
    selectCube,
    setSort,
    setPage,
    setFilters,
    toggleColumn,
  } = useDataBrowser()

  // Build your own UI...
}
```

## How Queries Work

The Data Browser exclusively uses [ungrouped queries](/semantic-layer/ungrouped-queries/). When you select a cube:

1. All dimensions are loaded as visible columns
2. A query is built with `ungrouped: true`, `limit`, `offset`, and `order`
3. Security context filtering applies normally
4. Only ungrouped-compatible measures (`sum`, `avg`, `min`, `max`, `number`) appear in the column picker
5. Incompatible measures (`count`, `countDistinct`, `calculated`, etc.) are excluded

## Filtering

Click the **Filters** button in the toolbar to open the filter bar. This reuses the same filter UI from the Analysis Builder, supporting:

- String filters: equals, contains, starts with, ends with
- Numeric filters: greater than, less than, between
- Date filters: date range, before, after
- Null checks: set, not set
- Logical groups: AND/OR combinations

## Column Management

Click the **Columns** button to open the column picker modal. This reuses the Analysis Builder's field search modal with:

- Search across all fields
- Checkmarks showing which columns are currently visible
- Click to toggle columns on/off
- Grouped by field type (dimensions, measures)
