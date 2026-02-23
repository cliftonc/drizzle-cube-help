---
title: Joins
---

Joins in Drizzle Cube enable you to combine data from multiple tables and cubes, creating rich, interconnected analytics. There are two types of joins: **table-level joins** within individual cubes and **cube-level joins** for multi-cube queries.

## Overview

Drizzle Cube's join system leverages Drizzle ORM's type-safe join capabilities to provide secure, performant data relationships. All joins maintain security context and prevent SQL injection through parameterized queries.

## Table-Level Joins

Table-level joins occur within a single cube's SQL definition, allowing you to join multiple database tables into one logical dataset.

### Basic Table Join Structure

```typescript
sql: (ctx: QueryContext<Schema>): BaseQueryDefinition => ({
  from: employees,
  joins: [
    {
      table: departments,
      on: and(
        eq(employees.departmentId, departments.id),
        eq(departments.organisationId, ctx.securityContext.organisationId)
      ),
      type: 'left'
    }
  ],
  where: eq(employees.organisationId, ctx.securityContext.organisationId)
})
```

### Join Types

**Left Join** - Most common, includes all records from the main table:
```typescript
joins: [
  {
    table: departments,
    on: eq(employees.departmentId, departments.id),
    type: 'left'
  }
]
```

**Inner Join** - Only records that exist in both tables:
```typescript
joins: [
  {
    table: departments,
    on: eq(employees.departmentId, departments.id),
    type: 'inner'
  }
]
```

**Right Join** - Includes all records from the joined table:
```typescript
joins: [
  {
    table: departments,
    on: eq(employees.departmentId, departments.id),
    type: 'right'
  }
]
```

### Multi-Table Joins

Join multiple tables in a single cube:

```typescript
export const productivityCube: Cube<Schema> = defineCube('Productivity', {
  title: 'Productivity Analytics',
  description: 'Employee productivity with department and project data',
  
  sql: (ctx: QueryContext<Schema>): BaseQueryDefinition => ({
    from: productivity,
    joins: [
      // Join to employees table
      {
        table: employees,
        on: and(
          eq(productivity.employeeId, employees.id),
          eq(employees.organisationId, ctx.securityContext.organisationId)
        ),
        type: 'left'
      },
      // Join to departments through employees
      {
        table: departments,
        on: and(
          eq(employees.departmentId, departments.id),
          eq(departments.organisationId, ctx.securityContext.organisationId)
        ),
        type: 'left'
      },
      // Join to projects table
      {
        table: projects,
        on: and(
          eq(productivity.projectId, projects.id),
          eq(projects.organisationId, ctx.securityContext.organisationId)
        ),
        type: 'left'
      }
    ],
    where: eq(productivity.organisationId, ctx.securityContext.organisationId)
  }),
  
  dimensions: {
    employeeName: {
      name: 'employeeName',
      title: 'Employee',
      type: 'string',
      sql: employees.name
    },
    departmentName: {
      name: 'departmentName',
      title: 'Department',
      type: 'string',
      sql: departments.name
    },
    projectName: {
      name: 'projectName',
      title: 'Project',
      type: 'string',
      sql: projects.name
    }
  }
  // ... measures
})
```

### Security in Table Joins

**Critical**: Always include security context filtering in join conditions:

```typescript
joins: [
  {
    table: departments,
    on: and(
      eq(employees.departmentId, departments.id),
      // REQUIRED: Security filtering on joined table
      eq(departments.organisationId, ctx.securityContext.organisationId)
    ),
    type: 'left'
  }
]
```

## Cube-Level Joins

Cube-level joins define relationships between different cubes, enabling multi-cube queries and cross-cube analysis.

### Basic Cube Join Structure

```typescript
// In the Employees cube
joins: {
  Departments: {
    targetCube: () => departmentsCube,
    relationship: 'belongsTo',
    on: [
      { source: employees.departmentId, target: departments.id }
    ]
  }
}

// In the Productivity cube  
joins: {
  Employees: {
    targetCube: () => employeesCube,
    relationship: 'belongsTo',
    on: [
      { source: productivity.employeeId, target: employees.id }
    ]
  },
  Departments: {
    targetCube: () => departmentsCube,
    relationship: 'belongsTo',
    on: [
      { source: productivity.employeeId, target: employees.id },
      { source: employees.departmentId, target: departments.id }
    ]
  }
}
```

### Lazy Reference Pattern

Cube-level joins use **lazy references** with arrow functions `() => cubeName` to avoid circular dependency issues:

```typescript
// Forward declarations prevent circular imports
let employeesCube: Cube<Schema>
let departmentsCube: Cube<Schema>

// Cubes can reference each other bidirectionally
employeesCube = defineCube('Employees', {
  // ... cube definition
  joins: {
    Departments: {
      targetCube: () => departmentsCube,  // Lazy reference
      relationship: 'belongsTo',
      on: [{ source: employees.departmentId, target: departments.id }]
    }
  }
})

departmentsCube = defineCube('Departments', {
  // ... cube definition  
  joins: {
    Employees: {
      targetCube: () => employeesCube,  // Bidirectional reference
      relationship: 'hasMany',
      on: [{ source: departments.id, target: employees.departmentId }]
    }
  }
})
```

**Key Benefits:**
- **Type Safety**: Full compile-time validation of cube references
- **No Circular Dependencies**: Arrow functions delay resolution until runtime
- **Bidirectional Joins**: Cubes can reference each other in both directions

### Relationship Types

**belongsTo** - Many-to-one relationship:
```typescript
// Employee belongs to Department
Departments: {
  targetCube: () => departmentsCube,
  relationship: 'belongsTo',
  on: [
    { source: employees.departmentId, target: departments.id }
  ]
}
```

**hasMany** - One-to-many relationship:
```typescript
// Department has many Employees
Employees: {
  targetCube: () => employeesCube,
  relationship: 'hasMany',
  on: [
    { source: departments.id, target: employees.departmentId }
  ]
}
```

**hasOne** - One-to-one relationship:
```typescript
// Employee has one Profile
UserProfiles: {
  targetCube: () => userProfilesCube,
  relationship: 'hasOne',
  on: [
    { source: employees.id, target: userProfiles.employeeId }
  ]
}
```

**belongsToMany** - Many-to-many relationship through junction table:
```typescript
// Employees connected to Departments through TimeEntries junction table
DepartmentsViaTimeEntries: {
  targetCube: () => departmentsCube,
  relationship: 'belongsToMany',
  on: [], // Not used for belongsToMany
  through: {
    table: timeEntries,              // Junction/pivot table
    sourceKey: [
      { source: employees.id, target: timeEntries.employeeId }
    ],
    targetKey: [
      { source: timeEntries.departmentId, target: departments.id }
    ],
    // Optional: Security filtering on junction table
    securitySql: (securityContext) =>
      eq(timeEntries.organisationId, securityContext.organisationId)
  }
}
```

**Key Features of belongsToMany:**
- **Automatic Junction Table Handling** - The system transparently handles the intermediate table
- **Security Context** - Apply security filters to the junction table using `securitySql`
- **Multi-Column Support** - Both `sourceKey` and `targetKey` support multiple columns for composite keys
- **Transparent Querying** - Query dimensions from the target cube normally; the junction table is handled automatically

**Example Query Using belongsToMany:**
```typescript
// Query employee count by department (through time entries)
const result = await semanticLayer.execute({
  measures: ['Employees.count'],
  dimensions: ['DepartmentsViaTimeEntries.name'] // Uses the many-to-many join
}, securityContext)
```

### Advanced Cube Join Features

**Preferred Join Paths** - When multiple paths exist between cubes, use `preferredFor` to specify the canonical route:

```typescript
// Employees can reach Teams via two paths:
// 1. Employees → Departments → Teams (department-based teams)
// 2. Employees → EmployeeTeams → Teams (employee team memberships)

joins: {
  Departments: {
    targetCube: () => departmentsCube,
    relationship: 'belongsTo',
    on: [{ source: employees.departmentId, target: departments.id }]
  },
  EmployeeTeams: {
    targetCube: () => employeeTeamsCube,
    relationship: 'hasMany',
    // Prefer this path when reaching Teams - uses junction table
    preferredFor: ['Teams'],
    on: [{ source: employees.id, target: employeeTeams.employeeId }]
  }
}
```

Without `preferredFor`, the query planner may choose a structurally valid path that is not the semantic path you want for the query grain.

`preferredFor` is applied as a **first-hop preference** from the current source cube. In this example it biases `Employees -> EmployeeTeams` when routing to `Teams`, which keeps team-level membership queries semantically correct.

**When to use `preferredFor`:**
- Junction tables that represent the canonical relationship (e.g., employee team memberships vs department assignments)
- When multiple paths exist but one is semantically more appropriate for the domain
- When you need deterministic routing from a specific source cube to a specific target cube

**Path Selection Priority:**
1. Paths using joins with `preferredFor` targeting the destination cube (+10 priority)
2. Paths through cubes used by query members (+1 per cube)
3. Paths reusing already-joined cubes
4. Shorter paths

**`preferredFor` vs Cube join hints:**
- `preferredFor` is **schema-level and edge-local**: you annotate a join edge with preferred targets
- Cube join hints are **query-level path hints** derived from members and can carry ordered path segments
- `preferredFor` is simpler and usually sufficient for single-canonical routing decisions
- In highly ambiguous graphs, add `preferredFor` on each relevant first hop and verify with Dry Run / Query Analysis `Path scoring` output

**Multi-Column Joins** - Join on multiple columns:
```typescript
joins: {
  ProjectTasks: {
    targetCube: () => projectTasksCube,
    relationship: 'hasMany',
    on: [
      { source: projects.id, target: tasks.projectId },
      { source: projects.version, target: tasks.projectVersion }
    ]
  }
}
```

**Custom Comparators** - Use different comparison operators:
```typescript
joins: {
  Activities: {
    targetCube: () => activitiesCube,
    relationship: 'hasMany',
    on: [
      { source: users.id, target: activities.userId },
      { 
        source: users.createdAt, 
        target: activities.timestamp,
        as: (source, target) => gte(target, source) // timestamp >= user.createdAt
      }
    ]
  }
}
```

**Override SQL Join Type** - Force specific SQL join behavior:
```typescript
joins: {
  Departments: {
    targetCube: () => departmentsCube,
    relationship: 'belongsTo',
    on: [
      { source: employees.departmentId, target: departments.id }
    ],
    sqlJoinType: 'inner' // Override default 'inner' with 'left', 'right', etc.
  }
}
```

### Multi-Cube Query Example

Query data from multiple cubes using cube joins:

```typescript
const multiCubeQuery = {
  measures: [
    'Employees.count',           // From Employees cube
    'Departments.totalBudget',   // From Departments cube
    'Productivity.avgLinesOfCode' // From Productivity cube
  ],
  dimensions: [
    'Departments.name',          // Group by department
    'Employees.isActive'         // Split by active status
  ],
  timeDimensions: [{
    dimension: 'Productivity.date',
    granularity: 'month'
  }]
}
```

## Advanced Join Patterns

### Conditional Joins

Apply conditional logic in join conditions:

```typescript
sql: (ctx: QueryContext<Schema>): BaseQueryDefinition => ({
  from: orders,
  joins: [
    {
      table: customers,
      on: and(
        eq(orders.customerId, customers.id),
        // Conditional join based on security context
        ctx.securityContext.userRole === 'admin' 
          ? sql`true` 
          : eq(customers.salesRepId, ctx.securityContext.userId),
        eq(customers.organisationId, ctx.securityContext.organisationId)
      ),
      type: 'left'
    }
  ],
  where: eq(orders.organisationId, ctx.securityContext.organisationId)
})
```

### Self-Joins

Join a table to itself for hierarchical data:

```typescript
sql: (ctx: QueryContext<Schema>): BaseQueryDefinition => ({
  from: employees,
  joins: [
    {
      table: alias(employees, 'manager'),
      on: and(
        eq(employees.managerId, sql`manager.id`),
        eq(sql`manager.organisationId`, ctx.securityContext.organisationId)
      ),
      type: 'left'
    }
  ],
  where: eq(employees.organisationId, ctx.securityContext.organisationId)
}),

dimensions: {
  name: {
    name: 'name',
    title: 'Employee Name',
    type: 'string',
    sql: employees.name
  },
  managerName: {
    name: 'managerName',
    title: 'Manager Name',
    type: 'string',
    sql: sql`manager.name`
  }
}
```

### Complex Join Conditions

Use complex conditions for specialized joins:

```typescript
joins: [
  {
    table: productivityTargets,
    on: and(
      eq(employees.id, productivityTargets.employeeId),
      eq(employees.departmentId, productivityTargets.departmentId),
      // Join on date range
      sql`${productivity.date} BETWEEN ${productivityTargets.startDate} AND ${productivityTargets.endDate}`,
      eq(productivityTargets.organisationId, ctx.securityContext.organisationId)
    ),
    type: 'left'
  }
]
```

## Join Resolution and Path Finding

Drizzle Cube automatically resolves join paths between cubes using the `JoinPathResolver`:

```typescript
// Automatic path finding from Productivity → Employees → Departments
const query = {
  measures: ['Productivity.totalLinesOfCode'],
  dimensions: ['Departments.name'] // Automatically resolves join path
}
```

### Manual Join Path Control

Drizzle Cube does **not** currently support query-level manual join path hints (for example, a `joinHints` parameter on the query object).

Join paths are resolved automatically from cube relationships. To guide path selection in ambiguous graphs:

- Use `preferredFor` on the relevant first-hop join in your cube schema
- Model explicit cube-level relationships for canonical business paths (for example, membership/junction routes)
- Validate path selection in Dry Run / Query Analysis (`Path scoring`). In Analysis Builder, the Debug panel shows scoring outcomes for each join path (strategy, selected rank/score, and candidate score breakdown).

```typescript
// Schema-level guidance (supported): prefer membership path when routing to Teams
joins: {
  EmployeeTeams: {
    targetCube: () => employeeTeamsCube,
    relationship: 'hasMany',
    preferredFor: ['Teams'],
    on: [{ source: employees.id, target: employeeTeams.employeeId }]
  }
}
```

If query-level join hints are added in the future, they will be documented here.

## Performance Optimization

### Join Order Optimization

Structure joins for optimal performance:

```typescript
// Good: Start with most selective table
sql: (ctx: QueryContext<Schema>): BaseQueryDefinition => ({
  from: activeEmployees, // Pre-filtered view
  joins: [
    {
      table: departments,
      on: eq(activeEmployees.departmentId, departments.id),
      type: 'left'
    }
  ],
  where: eq(activeEmployees.organisationId, ctx.securityContext.organisationId)
})
```

### Index-Friendly Joins

Ensure join conditions use indexed columns:

```typescript
joins: [
  {
    table: departments,
    // Good: uses indexed foreign key
    on: eq(employees.departmentId, departments.id),
    type: 'left'
  }
]
```

## Testing Joins

```typescript
describe('Cube Joins', () => {
  it('should join employees with departments', async () => {
    const query = {
      measures: ['Employees.count'],
      dimensions: ['Employees.departmentName']
    }
    
    const result = await semanticLayer.load(query, {
      organisationId: 'test-org'
    })
    
    const data = result.rawData()
    expect(data.every(row => row['Employees.departmentName'])).toBeTruthy()
  })
  
  it('should handle multi-cube queries', async () => {
    const query = {
      measures: [
        'Employees.count',
        'Productivity.avgLinesOfCode'
      ],
      dimensions: ['Departments.name']
    }
    
    const result = await semanticLayer.load(query, {
      organisationId: 'test-org'
    })
    
    const data = result.rawData()
    expect(data).toHaveLength(3) // 3 departments
    data.forEach(row => {
      expect(row['Employees.count']).toBeGreaterThan(0)
      expect(row['Productivity.avgLinesOfCode']).toBeGreaterThan(0)
    })
  })
})
```

## Best Practices

1. **Security First**: Always include security context in join conditions
2. **Performance**: Use indexed columns for join conditions
3. **Type Safety**: Leverage Drizzle's type system for join validation
4. **Clarity**: Use descriptive relationship names
5. **Testing**: Verify join correctness and security isolation
6. **Documentation**: Document complex join logic
7. **Optimization**: Structure joins for query performance

## Common Patterns

### Basic Foreign Key Join
```typescript
joins: [
  {
    table: departments,
    on: eq(employees.departmentId, departments.id),
    type: 'left'
  }
]
```

### Secure Multi-Table Join
```typescript
joins: [
  {
    table: departments,
    on: and(
      eq(employees.departmentId, departments.id),
      eq(departments.organisationId, ctx.securityContext.organisationId)
    ),
    type: 'left'
  }
]
```

### Cube-Level Relationship
```typescript
joins: {
  Departments: {
    targetCube: () => departmentsCube,
    relationship: 'belongsTo',
    on: [
      { source: employees.departmentId, target: departments.id }
    ]
  }
}
```

### Preferred Path Through Junction Table
```typescript
// Use preferredFor when a junction table is the canonical path
joins: {
  EmployeeTeams: {
    targetCube: () => employeeTeamsCube,
    relationship: 'hasMany',
    preferredFor: ['Teams'], // Prefer this path from Employees when target is Teams
    on: [
      { source: employees.id, target: employeeTeams.employeeId }
    ]
  }
}
```

## Troubleshooting

### Join Issues

**Problem**: Duplicate records in results
**Solution**: Check for many-to-many relationships and use appropriate aggregation

**Problem**: Missing data after join
**Solution**: Verify join type (left vs inner) and foreign key integrity

**Problem**: Security context not applied
**Solution**: Ensure all joined tables include security filtering

### Performance Issues

**Problem**: Slow join queries
**Solution**: Add database indexes on join columns and optimize join order

**Problem**: Cartesian products
**Solution**: Verify join conditions are specific enough

## Next Steps

- Learn about [Security](/semantic-layer/security/) patterns for multi-tenant systems
- Explore [Cubes](/semantic-layer/cubes/) for complete cube definitions
- Understand [Dimensions](/semantic-layer/dimensions/) and [Measures](/semantic-layer/measures/)
- Review database indexing strategies for optimal join performance

## Roadmap Ideas

- Visual join relationship designer
- Automatic join path optimization suggestions
- Join performance analysis tools
- Advanced relationship types (polymorphic, conditional)
- Join validation and testing framework