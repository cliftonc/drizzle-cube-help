---
title: Adding Semantic Metadata
description: Enrich your cubes with descriptions, synonyms, and example questions for better AI discovery
---

Semantic metadata helps AI agents understand your data model. By adding descriptions, synonyms, and example questions to your cubes, you enable better natural language query generation and more accurate cube discovery.

## Why Add Metadata?

Without metadata, AI agents only see field names like `avgSalary` or `createdAt`. With metadata, they understand:

- What each measure/dimension represents
- Alternative names users might use ("headcount" = "employee count")
- What questions this cube can answer

## Cube-Level Metadata

### Description

Explains what the cube contains and when to use it:

```typescript
defineCube({
  name: 'Sales',
  description: 'Revenue and order data from all sales channels including web, mobile, and in-store',
  // ...
})
```

### Example Questions

Helps AI understand what this cube can answer:

```typescript
defineCube({
  name: 'Sales',
  description: 'Revenue and order data',
  exampleQuestions: [
    'What was total revenue last month?',
    'Show me sales by product category',
    'Which region had the highest order volume?',
    'Compare this quarter to last quarter'
  ],
  // ...
})
```

## Measure Metadata

### Description

Explains what the measure calculates:

```typescript
measures: {
  totalRevenue: {
    type: 'sum',
    sql: () => orders.amount,
    description: 'Total revenue in USD, excluding taxes and shipping'
  },
  averageOrderValue: {
    type: 'avg',
    sql: () => orders.amount,
    description: 'Average order value across all completed orders'
  }
}
```

### Synonyms

Alternative names users might use:

```typescript
measures: {
  totalRevenue: {
    type: 'sum',
    sql: () => orders.amount,
    description: 'Total revenue in USD',
    synonyms: ['revenue', 'sales', 'income', 'earnings', 'gmv']
  },
  count: {
    type: 'countDistinct',
    sql: () => employees.id,
    description: 'Total number of unique employees',
    synonyms: ['headcount', 'employee count', 'staff count', 'team size']
  }
}
```

## Dimension Metadata

### Description

Explains what the dimension represents:

```typescript
dimensions: {
  category: {
    type: 'string',
    sql: () => products.category,
    description: 'Product category (Electronics, Clothing, Home, etc.)'
  },
  region: {
    type: 'string',
    sql: () => orders.region,
    description: 'Geographic sales region (NA, EMEA, APAC, LATAM)'
  }
}
```

### Synonyms

Alternative names for dimensions:

```typescript
dimensions: {
  createdAt: {
    type: 'time',
    sql: () => orders.createdAt,
    description: 'When the order was placed',
    synonyms: ['order date', 'date', 'when', 'timestamp']
  },
  departmentName: {
    type: 'string',
    sql: () => departments.name,
    description: 'Department name',
    synonyms: ['department', 'dept', 'team', 'group']
  }
}
```

## Complete Example

Here's a fully annotated cube:

```typescript
import { defineCube } from 'drizzle-cube/server'
import { eq } from 'drizzle-orm'
import { employees, departments } from './schema'

export const employeesCube = defineCube({
  name: 'Employees',
  title: 'Employee Analytics',
  description: 'Employee data and metrics including headcount, salaries, and department distribution. Use this cube for HR analytics and workforce planning.',

  exampleQuestions: [
    'How many employees do we have?',
    'What is the average salary?',
    'Show me employee count by department',
    'Who joined this month?',
    'What is the salary distribution?'
  ],

  sql: (ctx) => eq(employees.organisationId, ctx.securityContext.organisationId),

  joins: {
    Departments: {
      targetCube: () => departmentsCube,
      relationship: 'belongsTo',
      on: [{ source: employees.departmentId, target: departments.id }]
    }
  },

  measures: {
    count: {
      type: 'countDistinct',
      sql: () => employees.id,
      description: 'Total number of unique employees',
      synonyms: ['headcount', 'employee count', 'staff count', 'team size', 'workforce']
    },
    activeCount: {
      type: 'countDistinct',
      sql: () => employees.id,
      filter: (ctx) => eq(employees.isActive, true),
      description: 'Number of currently active employees'
    },
    totalSalary: {
      type: 'sum',
      sql: () => employees.salary,
      description: 'Total salary expenditure across all employees',
      synonyms: ['payroll', 'compensation', 'salary cost']
    },
    avgSalary: {
      type: 'avg',
      sql: () => employees.salary,
      description: 'Average salary across all employees',
      synonyms: ['average pay', 'mean salary', 'avg compensation']
    }
  },

  dimensions: {
    id: {
      type: 'number',
      sql: () => employees.id,
      primaryKey: true
    },
    name: {
      type: 'string',
      sql: () => employees.name,
      description: 'Full name of the employee',
      synonyms: ['employee name', 'person', 'who']
    },
    email: {
      type: 'string',
      sql: () => employees.email,
      description: 'Work email address'
    },
    isActive: {
      type: 'boolean',
      sql: () => employees.isActive,
      description: 'Whether the employee is currently active',
      synonyms: ['active', 'current', 'employed']
    },
    createdAt: {
      type: 'time',
      sql: () => employees.createdAt,
      description: 'Date the employee record was created (hire date)',
      synonyms: ['hire date', 'start date', 'joined', 'when hired']
    },
    city: {
      type: 'string',
      sql: () => employees.city,
      description: 'City where the employee is located'
    },
    country: {
      type: 'string',
      sql: () => employees.country,
      description: 'Country where the employee is located',
      synonyms: ['location', 'region']
    }
  }
})
```

## How AI Uses This Metadata

### Discovery (`drizzle_cube_discover`)

When an AI agent asks for cubes related to "headcount":

1. Searches cube descriptions for "headcount" → no match
2. Searches measure synonyms → finds `count` has "headcount" synonym
3. Returns `Employees` cube with high relevance score and suggested measures/dimensions

### Query Building

When a user asks "show me payroll by department", the AI:

1. Uses `drizzle_cube_meta` to fetch cube metadata
2. Finds "payroll" matches `totalSalary` via synonyms
3. Finds "department" matches `Departments.name` via joins
4. Builds the query:
   ```json
   {
     "measures": ["Employees.totalSalary"],
     "dimensions": ["Departments.name"]
   }
   ```

### Validation (`drizzle_cube_validate`)

When a query references "Employees.headcount" (typo or wrong name):

1. Validates → field doesn't exist
2. Fuzzy matches → finds "Employees.count" is similar
3. Checks synonyms → "headcount" is a synonym for `count`
4. Returns corrected query with "Employees.count"

## Best Practices

### Be Specific in Descriptions

```typescript
// ❌ Too vague
description: 'Revenue data'

// ✅ Specific and useful
description: 'Total revenue in USD from completed orders, excluding refunds, taxes, and shipping costs'
```

### Add Synonyms Users Actually Use

Think about how your users talk about data:

```typescript
// Formal name vs what users say
synonyms: [
  'revenue',     // formal
  'sales',       // common
  'income',      // accounting term
  'money',       // casual
  'gmv'          // industry jargon
]
```

### Write Realistic Example Questions

Use questions that match how users actually ask:

```typescript
exampleQuestions: [
  // ❌ Too formal
  'Calculate the aggregate revenue metric grouped by product category dimension',

  // ✅ Natural language
  'What was total revenue last month?',
  'Show me sales by category',
  'Which products sold the most?'
]
```

### Keep Titles Human-Readable

```typescript
// ❌ Field name as title
title: 'avgSalary'

// ✅ Human-readable
title: 'Average Salary'
```

## Metadata in API Responses

All metadata is included in the `/meta` endpoint response:

```json
{
  "cubes": [{
    "name": "Employees",
    "title": "Employee Analytics",
    "description": "Employee data and metrics...",
    "exampleQuestions": ["How many employees..."],
    "measures": [{
      "name": "Employees.count",
      "title": "Total Employees",
      "type": "countDistinct",
      "description": "Total number of unique employees",
      "synonyms": ["headcount", "employee count", "staff count"]
    }]
  }]
}
```

## Next Steps

- [MCP Endpoints](/ai/mcp-endpoints/) - How AI agents use this metadata
- [Claude Desktop Setup](/ai/claude-desktop-setup/) - Connect Claude to your data
- [Cubes Reference](/semantic-layer/cubes/) - Complete cube definition guide
