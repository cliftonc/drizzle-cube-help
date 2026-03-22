---
title: Ungrouped Queries
---

Ungrouped queries return raw row-level data without `GROUP BY` clauses or aggregation wrappers. This is useful for drill-down views, data exports, paginated record listings, and debugging with the [Data Browser](/client/data-browser/).

## Quick Start

Add `ungrouped: true` to any `SemanticQuery` to get raw rows instead of aggregated results:

```typescript
const result = await semanticLayer.execute({
  dimensions: ['Employees.name', 'Employees.email', 'Employees.salary'],
  ungrouped: true,
  limit: 50,
  offset: 0,
  order: { 'Employees.name': 'asc' }
}, securityContext)

// Returns individual rows, not aggregated groups:
// [
//   { 'Employees.name': 'Alice', 'Employees.email': 'alice@co.com', 'Employees.salary': 95000 },
//   { 'Employees.name': 'Bob', 'Employees.email': 'bob@co.com', 'Employees.salary': 82000 },
//   ...
// ]
```

## How It Works

When `ungrouped: true` is set:

- **No GROUP BY** — rows are returned as-is from the database
- **No aggregation wrappers** — measures render as raw column expressions (e.g., `salary` instead of `SUM(salary)`)
- **Security context still applies** — multi-tenant filtering works exactly as normal
- **Joins still work** — `belongsTo` and `hasOne` relationships resolve normally
- **ORDER BY, LIMIT, OFFSET** — pagination and sorting work as expected

## Compatible Measure Types

Only measure types that make sense as raw column values are allowed:

| Type | Allowed | Reason |
|------|---------|--------|
| `sum` | Yes | Renders as the raw column (e.g., `salary`) |
| `avg` | Yes | Renders as the raw column |
| `min` | Yes | Renders as the raw column |
| `max` | Yes | Renders as the raw column |
| `number` | Yes | Already a raw expression |
| `count` | No | Meaningless without aggregation |
| `countDistinct` | No | Meaningless without aggregation |
| `calculated` | No | Depends on aggregated inputs |
| Window functions | No | Require aggregation context |
| `stddev`, `variance`, `percentile` | No | Statistical aggregations |

## Using Measures with Ungrouped Queries

When you include compatible measures in an ungrouped query, they return the raw column value for each row — not an aggregated result:

```typescript
const result = await semanticLayer.execute({
  dimensions: ['Employees.name'],
  measures: ['Employees.totalSalary'],  // type: 'sum', sql: employees.salary
  ungrouped: true
}, securityContext)

// Each row shows the individual salary, not the sum:
// [
//   { 'Employees.name': 'Alice', 'Employees.totalSalary': 95000 },
//   { 'Employees.name': 'Bob', 'Employees.totalSalary': 82000 },
// ]
```

## Constraints

The following features are **incompatible** with ungrouped queries and will produce a validation error:

- **`hasMany` joins** — require CTE pre-aggregation which is meaningless without aggregation
- **Measure filters** — use `CASE WHEN` + aggregate wrapper
- **Funnel / Flow / Retention modes** — dedicated analysis modes that require aggregation
- **`compareDateRange`** — period comparison requires aggregated time series
- **`fillMissingDates`** — gap filling requires aggregated time series
- **Dimensions are required** — at least one dimension or time dimension must be present

```typescript
// This will throw a validation error:
const result = await semanticLayer.execute({
  measures: ['Employees.count'],  // count is not allowed
  dimensions: ['Employees.name'],
  ungrouped: true
}, securityContext)
// Error: Measure 'Employees.count' has type 'count' which is incompatible
// with ungrouped queries. Only sum, avg, min, max, number types are allowed.
```

## Pagination

Ungrouped queries are designed for paginated browsing. Use `limit` and `offset`:

```typescript
// Page 1
const page1 = await semanticLayer.execute({
  dimensions: ['Employees.name', 'Employees.email'],
  ungrouped: true,
  limit: 20,
  offset: 0,
  order: { 'Employees.name': 'asc' }
}, securityContext)

// Page 2
const page2 = await semanticLayer.execute({
  dimensions: ['Employees.name', 'Employees.email'],
  ungrouped: true,
  limit: 20,
  offset: 20,
  order: { 'Employees.name': 'asc' }
}, securityContext)
```

## Client-Side Usage

The `CubeQuery` type in the client also supports `ungrouped`:

```typescript
import { useCubeLoadQuery } from 'drizzle-cube/client'

const { rawData, isLoading } = useCubeLoadQuery({
  dimensions: ['Employees.name', 'Employees.salary'],
  ungrouped: true,
  limit: 20,
  order: { 'Employees.name': 'asc' }
})
```

For a complete UI for browsing ungrouped data, see the [Data Browser](/client/data-browser/) component.

## Dry Run

You can preview the generated SQL without executing:

```typescript
const { sql } = await semanticLayer.dryRun({
  dimensions: ['Employees.name', 'Employees.salary'],
  ungrouped: true
}, securityContext)

// SQL will have no GROUP BY and no aggregation functions
```
