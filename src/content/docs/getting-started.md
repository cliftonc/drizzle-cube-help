---
title: Getting Started with Drizzle Cube
---

Drizzle Cube is a **Drizzle ORM-first semantic layer** with [Cube.js](https://cube.dev) compatibility. It provides type-safe analytics and dashboards with SQL injection protection by leveraging Drizzle ORM as its core SQL building engine and is designed for you to embed within your own applications.

## What is Drizzle Cube?

Drizzle Cube bridges the gap between your database and your analytics applications by providing:

- **Type-safe semantic layer** - Define cubes, dimensions, and measures with full TypeScript support
- **SQL injection protection** - All queries use Drizzle's parameterized query system
- **[Cube.js](https://cube.dev) compatibility** - Able to migrate to [Cube.js](https://cube.dev) when your needs become more complex or traffic scales
- **Multi-database support** - Supports PostgreSQL (including Neon) and MySQL, with SQLite coming soon
- **React components** - Pre-built dashboard and chart components
- **Framework agnostic** - Use with any web framework via adapters

## Core Concepts

### Semantic Layer
The **semantic layer** is a business-friendly abstraction over your database that sits between your raw data and your analytics applications. Instead of writing raw SQL queries throughout your application, you define **cubes** that encapsulate your business logic and provide:

- **Consistent metrics** - Define calculations once, use everywhere
- **Security by default** - Multi-tenant isolation and access control
- **Business terminology** - Use familiar names instead of database columns
- **Type safety** - Full TypeScript support prevents runtime errors

### Cubes
**Cubes** are the building blocks of your semantic layer. Each cube represents a business entity (like Sales, Users, Products) and references your existing [Drizzle schema](https://orm.drizzle.team/docs/sql-schema-declaration) tables directly. Each cube contains:

- **Dimensions** - Attributes you can filter and group by (like product category, customer name)
- **Measures** - Numeric values you want to analyze (like total revenue, order count)
- **Security context** - Automatic multi-tenant isolation

```typescript
import { eq } from 'drizzle-orm'
import { defineCube } from 'drizzle-cube/server'
// Import your existing Drizzle schema
import { sales } from './schema' // Your existing Drizzle schema

export const salesCube = defineCube('Sales', {
  title: 'Sales Analytics',
  description: 'Sales data and metrics',
  
  // References your existing Drizzle schema tables
  sql: (ctx) => ({
    from: sales, // Your existing Drizzle table
    where: eq(sales.organisationId, ctx.securityContext.organisationId)
  }),
  
  dimensions: {
    productName: {
      name: 'productName',
      title: 'Product Name',
      type: 'string',
      sql: sales.productName // Direct reference to your schema column
    },
    orderDate: {
      name: 'orderDate', 
      title: 'Order Date',
      type: 'time',
      sql: sales.orderDate // Direct reference to your schema column
    }
  },
  
  measures: {
    totalSales: {
      name: 'totalSales',
      title: 'Total Sales',
      type: 'sum',
      sql: sales.amount // Direct reference to your schema column
    },
    orderCount: {
      name: 'orderCount',
      title: 'Order Count', 
      type: 'count',
      sql: sales.id // Direct reference to your schema column
    }
  }
});
```

### Query Structure
When you query cubes, you specify what you want to analyze:

```json
{
  "measures": ["Sales.totalSales", "Sales.orderCount"],
  "dimensions": ["Sales.productName"], 
  "timeDimensions": [{
    "dimension": "Sales.orderDate",
    "granularity": "month"
  }],
  "filters": [{
    "member": "Sales.productName",
    "operator": "equals", 
    "values": ["Electronics"]
  }]
}
```

## Architecture

Drizzle Cube follows a **Drizzle-first architecture**:

1. **Database Schema** - Define your database structure using Drizzle ORM
2. **Semantic Layer** - Create cubes that reference your schema
3. **Query Execution** - Drizzle generates type-safe, parameterized SQL
4. **Framework Integration** - Use adapters to integrate with your web framework
5. **Client Components** - Render data using React components

## Security Model

Security is built into every layer:

- **SQL Injection Protection** - Drizzle's parameterized queries prevent SQL injection
- **Multi-tenant Security** - Every cube should filter by security context
- **Type Safety** - TypeScript prevents runtime errors and data inconsistencies

## Next Steps

Ready to get started? Here's what to do next:

1. [**Quick Start**](/help/getting-started/quick-start) - Build your first semantic layer
2. [**Scaling Your SaaS**](/help/getting-started/scaling) - Learn how Drizzle Cube grows with your business
3. [**Semantic Layer**](/help/semantic-layer) - Deep dive into cubes, dimensions, and measures

## Community and Support

- **GitHub Repository** - [github.com/cliftonc/drizzle-cube](https://github.com/cliftonc/drizzle-cube)
- **Issues and Bug Reports** - [GitHub Issues](https://github.com/cliftonc/drizzle-cube/issues)
- **Discussions** - [GitHub Discussions](https://github.com/cliftonc/drizzle-cube/discussions)