---
title: Calculated Measures
---

Calculated measures allow you to create new metrics by combining existing measures using template substitution. They enable you to build complex business logic, ratios, and derived metrics while maintaining type safety and security isolation.

## Overview

Calculated measures use a template substitution system where you reference other measures using `{measureName}` or `{CubeName.measureName}` syntax. The system automatically:

- **Resolves dependencies** - Determines the correct order to calculate measures
- **Detects circular dependencies** - Prevents infinite loops
- **Maintains type safety** - Uses Drizzle ORM for all SQL generation
- **Enforces security** - Applies security context to all referenced measures

## Basic Structure

```typescript
measures: {
  // Base measures - standard aggregations
  totalRevenue: {
    name: 'totalRevenue',
    type: 'sum',
    sql: orders.amount
  },

  totalCost: {
    name: 'totalCost',
    type: 'sum',
    sql: orders.cost
  },

  // Calculated measure - references other measures
  profitMargin: {
    name: 'profitMargin',
    type: 'calculated',
    calculatedSql: '({totalRevenue} - {totalCost}) / NULLIF({totalRevenue}, 0)'
  }
}
```

## Template Syntax

### Same-Cube References

Reference measures from the same cube using `{measureName}`:

```typescript
measures: {
  count: {
    name: 'count',
    type: 'count',
    sql: employees.id
  },

  doubled: {
    name: 'doubled',
    type: 'calculated',
    calculatedSql: '{count} * 2'
  }
}
```

### Cross-Cube References

Reference measures from other cubes using `{CubeName.measureName}`:

```typescript
// In the Metrics cube
measures: {
  employeeProductivity: {
    name: 'employeeProductivity',
    type: 'calculated',
    calculatedSql: '{Productivity.totalLines} / NULLIF({Employees.count}, 0)'
  }
}
```

### Valid Template Patterns

```typescript
// ✅ Simple arithmetic
calculatedSql: '{revenue} - {cost}'

// ✅ Division with null protection
calculatedSql: '{numerator} / NULLIF({denominator}, 0)'

// ✅ Multiple measures
calculatedSql: '({a} + {b} + {c}) / 3'

// ✅ Complex formulas
calculatedSql: '({revenue} * 0.8) - ({cost} * 1.2)'

// ✅ Cross-cube references
calculatedSql: '{Sales.revenue} / {Customers.count}'

// ❌ Invalid - nested braces
calculatedSql: '{{measure}}'

// ❌ Invalid - empty reference
calculatedSql: '{} + 1'

// ❌ Invalid - self-reference
calculatedSql: '{myMeasure} + 1'  // In measure named 'myMeasure'
```

## Working Examples

### Simple Ratio Calculation

Calculate task completion rate:

```typescript
const tasksCube = defineCube('Tasks', {
  sql: (ctx) => ({
    from: tasks,
    where: eq(tasks.organisationId, ctx.securityContext.organisationId)
  }),

  measures: {
    total: {
      name: 'total',
      type: 'count',
      sql: tasks.id
    },

    completed: {
      name: 'completed',
      type: 'count',
      sql: tasks.id,
      filters: [(ctx) => eq(tasks.status, 'completed')]
    },

    completionRate: {
      name: 'completionRate',
      type: 'calculated',
      title: 'Completion Rate',
      calculatedSql: '{completed} / NULLIF({total}, 0)'
    }
  },

  dimensions: {}
})
```

### Multiple Dependencies

Calculate a weighted productivity score:

```typescript
const productivityCube = defineCube('Productivity', {
  sql: (ctx) => ({
    from: productivity,
    where: eq(productivity.organisationId, ctx.securityContext.organisationId)
  }),

  measures: {
    linesOfCode: {
      name: 'linesOfCode',
      type: 'sum',
      sql: productivity.linesOfCode
    },

    pullRequests: {
      name: 'pullRequests',
      type: 'sum',
      sql: productivity.pullRequests
    },

    deployments: {
      name: 'deployments',
      type: 'sum',
      sql: productivity.deployments
    },

    // Calculated measure with 3 dependencies
    productivityScore: {
      name: 'productivityScore',
      type: 'calculated',
      title: 'Productivity Score',
      calculatedSql: '({linesOfCode} * 0.5 + {pullRequests} * 2 + {deployments} * 5) / 3'
    }
  },

  dimensions: {}
})
```

### Complex Business Logic

Calculate customer lifetime value:

```typescript
measures: {
  totalRevenue: {
    name: 'totalRevenue',
    type: 'sum',
    sql: orders.amount
  },

  totalCost: {
    name: 'totalCost',
    type: 'sum',
    sql: orders.cost
  },

  customerCount: {
    name: 'customerCount',
    type: 'countDistinct',
    sql: orders.customerId
  },

  // First calculate average profit
  avgProfit: {
    name: 'avgProfit',
    type: 'calculated',
    calculatedSql: '({totalRevenue} - {totalCost}) / NULLIF({customerCount}, 0)'
  },

  // Then calculate LTV (multiply by estimated customer lifespan)
  customerLTV: {
    name: 'customerLTV',
    type: 'calculated',
    title: 'Customer Lifetime Value',
    calculatedSql: '{avgProfit} * 36'  // 36 months average lifespan
  }
}
```

### Cross-Cube Calculations

Calculate average revenue per employee:

```typescript
// In the Metrics cube
const metricsCube = defineCube('Metrics', {
  sql: (ctx) => ({
    from: organizations,
    where: eq(organizations.id, ctx.securityContext.organisationId)
  }),

  measures: {
    revenuePerEmployee: {
      name: 'revenuePerEmployee',
      type: 'calculated',
      title: 'Revenue per Employee',
      calculatedSql: '{Sales.totalRevenue} / NULLIF({Employees.count}, 0)'
    }
  },

  dimensions: {}
})
```

## Dependency Resolution

The system automatically resolves measure dependencies using topological sorting:

```typescript
measures: {
  a: {
    name: 'a',
    type: 'count',
    sql: table.id
  },

  b: {
    name: 'b',
    type: 'calculated',
    calculatedSql: '{a} * 2'  // Depends on 'a'
  },

  c: {
    name: 'c',
    type: 'calculated',
    calculatedSql: '{b} + {a}'  // Depends on 'b' and 'a'
  },

  d: {
    name: 'd',
    type: 'calculated',
    calculatedSql: '{c} * {b}'  // Depends on 'c' and 'b'
  }
}
```

**Resolution order**: `a → b → c → d`

When you query `Cube.d`, the system:
1. Identifies all dependencies (`d` needs `c` and `b`, `c` needs `b` and `a`, `b` needs `a`)
2. Sorts measures topologically (dependencies first)
3. Builds SQL for each measure in order
4. Substitutes references in templates with actual SQL expressions

### Automatic Dependency Population

The `dependencies` array is automatically populated during cube registration:

```typescript
measures: {
  calculated: {
    name: 'calculated',
    type: 'calculated',
    calculatedSql: '{measure1} + {measure2}'
    // dependencies: ['measure1', 'measure2'] - auto-populated
  }
}
```

You can also specify dependencies explicitly:

```typescript
measures: {
  calculated: {
    name: 'calculated',
    type: 'calculated',
    calculatedSql: '{measure1} + {measure2}',
    dependencies: ['measure1', 'measure2']  // Explicit
  }
}
```

## Security Context

Calculated measures maintain security isolation across all referenced measures:

```typescript
const employeesCube = defineCube('Employees', {
  // Security context applied to base table
  sql: (ctx) => ({
    from: employees,
    where: eq(employees.organisationId, ctx.securityContext.organisationId)
  }),

  measures: {
    total: {
      name: 'total',
      type: 'count',
      sql: employees.id
      // Inherits security context from cube.sql
    },

    active: {
      name: 'active',
      type: 'count',
      sql: employees.id,
      filters: [(ctx) => eq(employees.isActive, true)]
      // Security context + additional filter
    },

    activeRatio: {
      name: 'activeRatio',
      type: 'calculated',
      calculatedSql: '{active} / NULLIF({total}, 0)'
      // Security context automatically applied to both measures
    }
  },

  dimensions: {}
})
```

**Key Points**:
- Security context from `cube.sql` is applied to ALL base measures
- Calculated measures inherit security from their dependencies
- Multi-tenant isolation is maintained automatically
- No special configuration needed for calculated measures

## Validation and Error Detection

### Circular Dependency Detection

The system detects and prevents circular dependencies:

```typescript
// ❌ This will throw an error during registration
measures: {
  a: {
    name: 'a',
    type: 'calculated',
    calculatedSql: '{b} + 1'
  },

  b: {
    name: 'b',
    type: 'calculated',
    calculatedSql: '{a} + 1'  // Circular: b → a → b
  }
}

// Error: "Circular dependency detected in calculated measures: a -> b -> a"
```

### Template Syntax Validation

Invalid template syntax is caught during cube registration:

```typescript
// ❌ Unmatched braces
calculatedSql: '{measure'
// Error: "Unmatched opening brace in template"

// ❌ Empty reference
calculatedSql: '{} + 1'
// Error: "Empty member reference {} found in template"

// ❌ Nested braces
calculatedSql: '{{measure}}'
// Error: "Nested braces are not allowed in member references"

// ❌ Invalid characters
calculatedSql: '{measure-name}'
// Error: "Invalid member reference {measure-name}: must start with letter or underscore"
```

### Missing Measure Detection

References to non-existent measures are validated:

```typescript
// ❌ Reference to non-existent measure
measures: {
  calculated: {
    name: 'calculated',
    type: 'calculated',
    calculatedSql: '{nonExistent} * 2'
  }
}

// Error: "Calculated measure 'Cube.calculated' references unknown measure 'nonExistent'"
```

### Self-Reference Prevention

Measures cannot reference themselves:

```typescript
// ❌ Self-referencing measure
measures: {
  recursive: {
    name: 'recursive',
    type: 'calculated',
    calculatedSql: '{recursive} + 1'
  }
}

// Error: "Calculated measure 'Cube.recursive' cannot reference itself"
```

## Best Practices

### 1. Use NULLIF for Division

Always protect against division by zero:

```typescript
// ✅ Correct - prevents division by zero
calculatedSql: '{numerator} / NULLIF({denominator}, 0)'

// ❌ Incorrect - will fail if denominator is 0
calculatedSql: '{numerator} / {denominator}'
```

### 2. Keep Calculations Simple

Break complex calculations into intermediate measures:

```typescript
// ✅ Better - easier to understand and debug
measures: {
  grossProfit: {
    name: 'grossProfit',
    type: 'calculated',
    calculatedSql: '{revenue} - {cost}'
  },

  profitMargin: {
    name: 'profitMargin',
    type: 'calculated',
    calculatedSql: '{grossProfit} / NULLIF({revenue}, 0)'
  }
}

// ❌ Harder to debug
measures: {
  profitMargin: {
    name: 'profitMargin',
    type: 'calculated',
    calculatedSql: '({revenue} - {cost}) / NULLIF({revenue}, 0)'
  }
}
```

### 3. Use Descriptive Names

Choose clear, business-friendly names:

```typescript
// ✅ Clear and descriptive
profitMargin: {
  name: 'profitMargin',
  title: 'Profit Margin (%)',
  type: 'calculated',
  calculatedSql: '({revenue} - {cost}) / NULLIF({revenue}, 0) * 100'
}

// ❌ Unclear naming
pm: {
  name: 'pm',
  type: 'calculated',
  calculatedSql: '({revenue} - {cost}) / NULLIF({revenue}, 0) * 100'
}
```

### 4. Document Complex Formulas

Add comments or descriptions for complex business logic:

```typescript
measures: {
  customerLTV: {
    name: 'customerLTV',
    title: 'Customer Lifetime Value',
    description: 'Average profit per customer multiplied by 36-month lifespan',
    type: 'calculated',
    calculatedSql: '({totalRevenue} - {totalCost}) / NULLIF({customerCount}, 0) * 36'
  }
}
```

### 5. Consider Query Performance

Each calculated measure adds complexity to the generated SQL:

```typescript
// ✅ Efficient - single query with calculated field
measures: {
  ratio: {
    name: 'ratio',
    type: 'calculated',
    calculatedSql: '{a} / NULLIF({b}, 0)'
  }
}

// ⚠️ Less efficient - 3+ dependencies require more subqueries
measures: {
  complex: {
    name: 'complex',
    type: 'calculated',
    calculatedSql: '{a} + {b} + {c} + {d} + {e}'
  }
}
```

## Current Limitations (Phase 1)

The following features are **working in Phase 1**:

- **Simple calculated measures**: `{measure1} / NULLIF({measure2}, 0)`
- **Multiple dependencies (3+)**: `{a} + {b} + {c}`
- **Basic arithmetic operations**: `+`, `-`, `*`, `/`, parentheses
- **All aggregation types**: COUNT, SUM, AVG, MIN, MAX, COUNT DISTINCT
- **Security context isolation**: Automatic across all measures
- **Single-cube queries**: Calculated measures within one cube
- **Multi-cube queries**: Cross-cube calculated measure references
- **CTE pre-aggregation**: Works with hasMany relationships

The following features are **deferred to Phase 2**:

- **Nested calculated measures**: Calculated measures that depend on other calculated measures
- **Filtered calculated measures**: Using measures with filter conditions inside calculations

### Phase 1 Example (Works)

```typescript
measures: {
  linesOfCode: {
    name: 'linesOfCode',
    type: 'sum',
    sql: productivity.linesOfCode
  },

  pullRequests: {
    name: 'pullRequests',
    type: 'sum',
    sql: productivity.pullRequests
  },

  // ✅ Works - references base measures only
  productivity: {
    name: 'productivity',
    type: 'calculated',
    calculatedSql: '{linesOfCode} / NULLIF({pullRequests}, 0)'
  }
}
```

### Phase 2 Example (Deferred)

```typescript
measures: {
  // Base measures
  completed: {
    name: 'completed',
    type: 'count',
    sql: tasks.id,
    filters: [(ctx) => eq(tasks.status, 'completed')]  // Filtered measure
  },

  total: {
    name: 'total',
    type: 'count',
    sql: tasks.id
  },

  // ⏸️ Deferred - references filtered measure
  completionRate: {
    name: 'completionRate',
    type: 'calculated',
    calculatedSql: '{completed} / NULLIF({total}, 0}'
  },

  // ⏸️ Deferred - calculated referencing calculated
  adjustedRate: {
    name: 'adjustedRate',
    type: 'calculated',
    calculatedSql: '{completionRate} * 1.2'
  }
}
```

## Troubleshooting

### Circular Dependency Error

**Error**: `"Circular dependency detected in calculated measures"`

**Cause**: Two or more measures reference each other, creating an infinite loop.

**Solution**: Review your measure dependencies and break the cycle:

```typescript
// ❌ Problem
a: { calculatedSql: '{b} + 1' }
b: { calculatedSql: '{a} + 1' }

// ✅ Solution - remove circular reference
a: { type: 'count', sql: table.id }
b: { calculatedSql: '{a} + 1' }
```

### Unknown Measure Error

**Error**: `"references unknown measure 'MeasureName'"`

**Cause**: Template references a measure that doesn't exist.

**Solution**: Check spelling and ensure the measure is defined:

```typescript
// ❌ Problem - typo in reference
calculatedSql: '{totalRevnue} / {count}'  // Should be 'totalRevenue'

// ✅ Solution - correct spelling
calculatedSql: '{totalRevenue} / {count}'
```

### Template Syntax Error

**Error**: `"Unmatched opening brace in template"`

**Cause**: Malformed template with missing closing brace.

**Solution**: Ensure all `{` have matching `}`:

```typescript
// ❌ Problem
calculatedSql: '{measure * 2'

// ✅ Solution
calculatedSql: '{measure} * 2'
```

### Self-Reference Error

**Error**: `"cannot reference itself"`

**Cause**: Measure references its own name in the template.

**Solution**: Use a different base measure or break into separate measures:

```typescript
// ❌ Problem
running: {
  calculatedSql: '{running} + {current}'
}

// ✅ Solution - use separate measures
previous: {
  type: 'sum',
  sql: table.previousValue
},
current: {
  type: 'sum',
  sql: table.currentValue
},
running: {
  calculatedSql: '{previous} + {current}'
}
```

## SQL Generation

Calculated measures are compiled into SQL at query execution time. Here's how the transformation works:

### Input Query

```typescript
{
  measures: ['Sales.profitMargin']
}
```

### Cube Definition

```typescript
measures: {
  revenue: {
    name: 'revenue',
    type: 'sum',
    sql: sales.amount
  },

  cost: {
    name: 'cost',
    type: 'sum',
    sql: sales.cost
  },

  profitMargin: {
    name: 'profitMargin',
    type: 'calculated',
    calculatedSql: '({revenue} - {cost}) / NULLIF({revenue}, 0) * 100'
  }
}
```

### Generated SQL

```sql
SELECT
  (sum("sales"."amount") - sum("sales"."cost")) /
  NULLIF(sum("sales"."amount"), 0) * 100
  AS "Sales.profitMargin"
FROM "sales"
WHERE "sales"."organisation_id" = $1
```

The template `{revenue} - {cost}` is substituted with the actual SQL expressions from the base measures, maintaining type safety and security context throughout.

## Multi-Database Support

Calculated measures work identically across PostgreSQL, MySQL, and SQLite. The template substitution happens at the Drizzle ORM level, ensuring database-agnostic SQL generation.

```typescript
// Same calculated measure definition works on all databases
profitMargin: {
  name: 'profitMargin',
  type: 'calculated',
  calculatedSql: '{revenue} / NULLIF({cost}, 0)'
}
```

The system handles database-specific SQL differences (like `COALESCE` vs `IFNULL`) automatically through database adapters.

## Testing Calculated Measures

When adding calculated measures to your cubes, test them thoroughly:

```typescript
// Test the calculated measure
const result = await semanticLayer.execute({
  measures: ['Sales.profitMargin']
}, securityContext)

// Validate the result
expect(result.data[0]['Sales.profitMargin']).toBeDefined()
expect(typeof result.data[0]['Sales.profitMargin']).toBe('number')

// Test with dimensions
const detailedResult = await semanticLayer.execute({
  measures: ['Sales.profitMargin'],
  dimensions: ['Sales.productName']
}, securityContext)

// Verify grouping works correctly
expect(detailedResult.data.length).toBeGreaterThan(1)
```

## Next Steps

- Review [Measures](/semantic-layer/measures/) for base measure types
- Learn about [Security](/semantic-layer/security/) context enforcement
- Explore [Joins](/semantic-layer/joins/) for multi-cube calculations
- Check [Cubes](/semantic-layer/cubes/) for complete cube structure
