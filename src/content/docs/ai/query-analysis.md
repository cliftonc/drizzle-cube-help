---
title: Query Execution Analysis
description: Analyze query performance with EXPLAIN plans and AI-powered optimization recommendations
---

Drizzle Cube provides tools to analyze query execution plans and get AI-powered optimization recommendations. This helps identify performance bottlenecks, missing indexes, and query optimization opportunities.

## Overview

Query analysis consists of two complementary features:

| Endpoint | Included | Description |
|----------|----------|-------------|
| `/cubejs-api/v1/explain` | ✅ Built-in | Returns raw execution plan data (in all adapters) |
| `/api/ai/explain/analyze` | ❌ You build | AI-powered analysis with recommendations |

> **Note**: The `/api/ai/explain/analyze` endpoint is **not included** in drizzle-cube. You implement it yourself using our prompt templates. See [Adding AI Endpoints](/ai/adding-ai-endpoints/) and the [reference implementation](https://github.com/cliftonc/drizzle-cube/blob/main/dev/server/ai-routes.ts#L616).

## The /explain Endpoint

The `/explain` endpoint is built into all framework adapters (Express, Fastify, Hono, Next.js). It executes `EXPLAIN ANALYZE` on your query and returns structured execution plan data.

### Request Format

```typescript
// POST /cubejs-api/v1/explain
{
  "query": {
    "measures": ["Employees.count"],
    "dimensions": ["Employees.departmentName"],
    "filters": [
      {
        "member": "Employees.createdAt",
        "operator": "inDateRange",
        "values": ["last 6 months"]
      }
    ]
  },
  "options": {
    "analyze": true  // Execute query and get real timing (default: true)
  }
}
```

### Response Format

```typescript
interface ExplainResult {
  // Summary statistics
  summary: {
    database: 'postgres' | 'mysql' | 'sqlite'
    totalCost: number | null
    estimatedRows: number | null
    actualRows: number | null
    executionTimeMs: number | null
    planningTimeMs: number | null
  }

  // Parsed operation tree
  operations: ExplainOperation[]

  // Generated SQL
  sql: {
    sql: string
    params: any[]
  }

  // Raw EXPLAIN output from database
  raw: string
}

interface ExplainOperation {
  operation: string        // e.g., "Seq Scan", "Index Scan", "Hash Join"
  table?: string          // Table being accessed
  index?: string          // Index being used (if any)
  cost?: number           // Estimated cost
  rows?: number           // Estimated rows
  actualRows?: number     // Actual rows (with ANALYZE)
  actualTimeMs?: number   // Actual time (with ANALYZE)
  filter?: string         // Filter condition
  children?: ExplainOperation[]
}
```

### Database-Specific Behavior

| Database | EXPLAIN Format | Features |
|----------|----------------|----------|
| **PostgreSQL** | `EXPLAIN (ANALYZE, COSTS, BUFFERS, FORMAT JSON)` | Full timing, buffer stats, JSON format |
| **MySQL 8.0+** | `EXPLAIN ANALYZE` | Tree format with timing |
| **SQLite** | `EXPLAIN QUERY PLAN` | Basic plan structure |

### Example Usage

```typescript
// Using the client hook
import { useExplainQuery } from 'drizzle-cube/client'

function QueryDebugger({ query }) {
  const { data, isLoading, error } = useExplainQuery(query)

  if (isLoading) return <div>Analyzing query...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h3>Execution Summary</h3>
      <p>Total Cost: {data.summary.totalCost}</p>
      <p>Execution Time: {data.summary.executionTimeMs}ms</p>
      <p>Rows: {data.summary.actualRows}</p>

      <h3>Operations</h3>
      {data.operations.map(op => (
        <div key={op.operation}>
          {op.operation} on {op.table}
          {op.index && ` using ${op.index}`}
        </div>
      ))}
    </div>
  )
}
```

## AI-Powered Analysis

The `/api/ai/explain/analyze` endpoint takes an EXPLAIN result and provides intelligent analysis with actionable recommendations.

### Request Format

```typescript
// POST /api/ai/explain/analyze
{
  "explainResult": { /* ExplainResult from /explain endpoint */ },
  "query": { /* Original semantic query */ }
}
```

### Response Format

```typescript
interface AIExplainAnalysis {
  // Overall summary
  summary: string

  // Performance assessment
  assessment: 'good' | 'warning' | 'critical'
  assessmentReason: string

  // What the query is doing
  queryUnderstanding: string

  // Identified issues
  issues: Array<{
    type: 'sequential_scan' | 'missing_index' | 'expensive_sort' | 'high_cost' | 'other'
    severity: 'low' | 'medium' | 'high'
    description: string
    table?: string
    column?: string
  }>

  // Actionable recommendations
  recommendations: Array<{
    type: 'create_index' | 'modify_query' | 'modify_cube' | 'other'
    priority: 'low' | 'medium' | 'high'
    description: string
    sql?: string           // SQL for index creation
    cubeChange?: string    // Suggested cube modification
  }>
}
```

### Example Response

```json
{
  "summary": "The query performs a sequential scan on the employees table which may be slow for large datasets.",
  "assessment": "warning",
  "assessmentReason": "Sequential scan detected on table with potential for index optimization",
  "queryUnderstanding": "This query counts employees grouped by department, filtered by creation date in the last 6 months.",
  "issues": [
    {
      "type": "sequential_scan",
      "severity": "medium",
      "description": "Full table scan on 'employees' table (estimated 50,000 rows)",
      "table": "employees"
    },
    {
      "type": "missing_index",
      "severity": "high",
      "description": "No index on 'created_at' column used in date range filter",
      "table": "employees",
      "column": "created_at"
    }
  ],
  "recommendations": [
    {
      "type": "create_index",
      "priority": "high",
      "description": "Create an index on the created_at column to speed up date range filtering",
      "sql": "CREATE INDEX idx_employees_created_at ON employees (created_at);"
    },
    {
      "type": "create_index",
      "priority": "medium",
      "description": "Consider a composite index for the department grouping with date filter",
      "sql": "CREATE INDEX idx_employees_dept_created ON employees (department_name, created_at);"
    }
  ]
}
```

## Client Components

Drizzle Cube includes React components for displaying execution plans:

### ExecutionPlanPanel

Displays the parsed execution plan with operation details:

```typescript
import { ExecutionPlanPanel } from 'drizzle-cube/client'

function QueryDebugView({ query }) {
  return (
    <ExecutionPlanPanel
      query={query}
      onClose={() => {}}
    />
  )
}
```

### ExplainAIPanel

Displays AI-powered analysis with issues and recommendations:

```typescript
import { ExplainAIPanel } from 'drizzle-cube/client'

function AIAnalysisView({ explainResult, query }) {
  return (
    <ExplainAIPanel
      explainResult={explainResult}
      query={query}
    />
  )
}
```

## Use Cases

### Performance Debugging

When a dashboard portlet or query is slow:

1. Run the query through `/explain` to get the execution plan
2. Look for sequential scans, missing indexes, or expensive sorts
3. Use AI analysis for specific recommendations

### Index Optimization

Before deploying to production:

1. Run your most common queries through the explain endpoint
2. Identify tables that would benefit from indexes
3. Create indexes based on AI recommendations
4. Re-run explain to verify improvement

### Query Optimization

When building new cubes or queries:

1. Test different approaches (filters, joins, aggregations)
2. Compare execution plans
3. Choose the approach with the best performance characteristics

## Interpreting Execution Plans

### PostgreSQL Operations

| Operation | Description | Performance Impact |
|-----------|-------------|-------------------|
| **Seq Scan** | Full table scan | Slow for large tables |
| **Index Scan** | Uses an index | Generally fast |
| **Index Only Scan** | Uses index without table access | Fastest |
| **Bitmap Index Scan** | Combines multiple indexes | Good for complex filters |
| **Hash Join** | Joins using hash table | Fast for large datasets |
| **Nested Loop** | Iterates over rows | Slow for large datasets |
| **Sort** | In-memory or disk sort | Can be expensive |
| **Aggregate** | Computes aggregations | Usually fast |

### Warning Signs

- **Seq Scan** on large tables - Consider adding an index
- **Sort** with high row counts - May spill to disk
- **Nested Loop** with large outer set - Consider using Hash Join
- **High cost estimates** relative to row counts - Indicates inefficiency

## Configuration

### Enabling Analysis in Adapters

The `/explain` endpoint is automatically available in all adapters. No additional configuration needed.

### Setting Up AI Analysis

The AI analysis endpoint requires custom server routes. See [Adding AI Endpoints](/ai/adding-ai-endpoints/) for complete setup instructions.

```typescript
// Required environment variables
GEMINI_API_KEY=your-api-key
GEMINI_MODEL=gemini-2.5-flash  // Optional, uses capable model for analysis
```

## Security Considerations

- **Execution plans don't contain actual data** - Only metadata about query execution
- **Security context is still enforced** - The analyzed query respects multi-tenant isolation
- **AI analysis is rate limited** - Prevents abuse of the AI endpoint
- **Existing indexes are checked** - AI knows what indexes already exist to avoid duplicate recommendations

## Next Steps

- [Adding AI Endpoints](/ai/adding-ai-endpoints/) - Implement the AI analysis endpoint
- [Query Generation](/ai/query-generation/) - Generate queries from natural language
- [Performance](/advanced/performance/) - General performance optimization tips
- [Caching](/advanced/caching/) - Cache query results for better performance
