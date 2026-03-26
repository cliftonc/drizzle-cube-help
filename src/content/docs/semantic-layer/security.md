---
title: Security
---

Security in Drizzle Cube is built on three core principles: **multi-tenant data isolation**, **SQL injection prevention**, and **role-based access control**. The security model leverages Drizzle ORM's type-safe, parameterized queries to ensure your data remains secure and properly isolated.

## Overview

Drizzle Cube's security-first design ensures that every query is automatically filtered by security context, preventing data leakage between tenants and protecting against SQL injection attacks. All security filtering is applied at the database level for maximum performance and reliability.

## Authentication Requirements

:::caution[No Built-in Authentication]
Drizzle Cube adapters **do not include built-in authentication**. Your application is responsible for authenticating users before requests reach the adapter routes.
:::

Before security context can be applied, requests must be authenticated. If adapter routes are mounted without prior authentication:

- Analytics endpoints become publicly accessible
- `extractSecurityContext` / `extractSecurityContext` receives unauthenticated requests
- Data may be exposed if security context defaults are unsafe

### Implementation Requirements

1. **Mount authentication middleware before adapter routes** (Express, Fastify, Hono)
2. **Validate authentication in `extractSecurityContext`** (Next.js)
3. **Reject unauthenticated requests** before returning security context

Each framework adapter documentation includes specific guidance:

- [Express Adapter - Security Requirements](/adapters/express#security-requirements)
- [Fastify Adapter - Security Requirements](/adapters/fastify#security-requirements)
- [Hono Adapter - Security Requirements](/adapters/hono#security-requirements)
- [Next.js Adapter - Security Requirements](/adapters/nextjs#security-requirements)

## Security Context

The security context is the foundation of Drizzle Cube's security model. It contains user and tenant-specific information that is automatically injected into all cube queries.

### Basic Security Context Structure

```typescript
interface SecurityContext {
  organisationId: string    // Tenant/organization identifier (REQUIRED)
  userId?: string          // Current user ID
  userRole?: string        // User role/permission level
  departmentId?: string    // Department-level filtering
  [key: string]: any       // Additional custom fields
}
```

### Extracting Security Context

Define how to extract security context from your application's request context:

```typescript
// Hono adapter example
import { createCubeApp } from 'drizzle-cube/adapters/hono'

const app = createCubeApp({
  semanticLayer,
  drizzle: db,
  schema,
  extractSecurityContext: async (c) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '')
    const user = await validateToken(token)
    
    return {
      organisationId: user.organisationId,  // REQUIRED for multi-tenant security
      userId: user.id,
      userRole: user.role,
      departmentId: user.departmentId
    }
  }
})
```

## Multi-Tenant Security

**CRITICAL**: Every cube must implement organization-level filtering to ensure data isolation between tenants.

### Required Organization Filtering

```typescript
export const employeesCube: Cube<Schema> = defineCube('Employees', {
  sql: (ctx: QueryContext<Schema>): BaseQueryDefinition => ({
    from: employees,
    // REQUIRED: Filter by organization for multi-tenant security
    where: eq(employees.organisationId, ctx.securityContext.organisationId)
  })
})
```

### Multi-Level Security Filtering

Apply multiple layers of security filtering:

```typescript
sql: (ctx: QueryContext<Schema>): BaseQueryDefinition => {
  const securityFilters = [
    // Level 1: Organization isolation (REQUIRED)
    eq(employees.organisationId, ctx.securityContext.organisationId)
  ]
  
  // Level 2: Department-level access
  if (ctx.securityContext.departmentId) {
    securityFilters.push(
      eq(employees.departmentId, ctx.securityContext.departmentId)
    )
  }
  
  // Level 3: Role-based filtering
  if (ctx.securityContext.userRole !== 'admin') {
    securityFilters.push(
      eq(employees.id, ctx.securityContext.userId)
    )
  }
  
  return {
    from: employees,
    where: and(...securityFilters)
  }
}
```

### Secure Table Joins

Apply security context to ALL joined tables:

```typescript
sql: (ctx: QueryContext<Schema>): BaseQueryDefinition => ({
  from: productivity,
  joins: [
    {
      table: employees,
      on: and(
        eq(productivity.employeeId, employees.id),
        // CRITICAL: Security filtering on joined table
        eq(employees.organisationId, ctx.securityContext.organisationId)
      ),
      type: 'left'
    },
    {
      table: departments,
      on: and(
        eq(employees.departmentId, departments.id),
        // CRITICAL: Security filtering on all joined tables
        eq(departments.organisationId, ctx.securityContext.organisationId)
      ),
      type: 'left'
    }
  ],
  where: eq(productivity.organisationId, ctx.securityContext.organisationId)
})
```

## Role-Based Access Control

Implement fine-grained access control using security context:

### Role-Based Cube Access

```typescript
// Manager-only cube
export const salaryAnalyticsCube: Cube<Schema> = defineCube('SalaryAnalytics', {
  sql: (ctx: QueryContext<Schema>): BaseQueryDefinition => {
    // Check role-based access
    if (!['admin', 'manager'].includes(ctx.securityContext.userRole)) {
      throw new Error('Access denied: Insufficient permissions for salary data')
    }
    
    return {
      from: employees,
      where: and(
        eq(employees.organisationId, ctx.securityContext.organisationId),
        // Managers can only see their department
        ctx.securityContext.userRole === 'manager' 
          ? eq(employees.departmentId, ctx.securityContext.departmentId)
          : sql`true`
      )
    }
  }
})
```

### Conditional Data Filtering

```typescript
sql: (ctx: QueryContext<Schema>): BaseQueryDefinition => {
  const baseFilters = [
    eq(employees.organisationId, ctx.securityContext.organisationId)
  ]
  
  // Role-specific data access
  switch (ctx.securityContext.userRole) {
    case 'admin':
      // Admins see all organization data
      break
      
    case 'manager':
      // Managers see their department only
      baseFilters.push(
        eq(employees.departmentId, ctx.securityContext.departmentId)
      )
      break
      
    case 'employee':
      // Employees see only their own data
      baseFilters.push(
        eq(employees.id, ctx.securityContext.userId)
      )
      break
      
    default:
      throw new Error('Invalid user role')
  }
  
  return {
    from: employees,
    where: and(...baseFilters)
  }
}
```

## SQL Injection Prevention

Drizzle Cube prevents SQL injection through Drizzle ORM's parameterized queries and type-safe SQL builder.

### Safe Practices (DO)

```typescript
// ✅ SAFE: Using Drizzle column references
sql: employees.name

// ✅ SAFE: Using Drizzle sql template with parameters
sql: sql`${employees.salary} > ${ctx.securityContext.minSalary}`

// ✅ SAFE: Using Drizzle operators with parameters
where: and(
  eq(employees.organisationId, ctx.securityContext.organisationId),
  gt(employees.salary, ctx.securityContext.minSalary)
)

// ✅ SAFE: Using security context values (pre-validated)
where: eq(employees.departmentId, ctx.securityContext.departmentId)
```

### Unsafe Practices (DON'T)

```typescript
// ❌ DANGEROUS: Raw string concatenation
sql: `SELECT * FROM employees WHERE name = '${userName}'`

// ❌ DANGEROUS: Dynamic SQL construction
sql: `SELECT * FROM ${tableName} WHERE ${columnName} = ${value}`

// ❌ DANGEROUS: Unvalidated user input
sql: sql`SELECT * FROM employees WHERE ${sql.raw(userInput)}`
```

### Secure Parameter Handling

```typescript
// ✅ CORRECT: Parameters automatically escaped
dimensions: {
  searchResults: {
    name: 'searchResults',
    title: 'Search Results',
    type: 'string',
    sql: sql`
      CASE 
        WHEN ${employees.name} ILIKE ${`%${ctx.query.searchTerm}%`} THEN 'Match'
        ELSE 'No Match'
      END
    `
  }
}
```

## Data Masking and Privacy

Implement data masking for sensitive information:

### Column-Level Security

```typescript
dimensions: {
  email: {
    name: 'email',
    title: 'Email',
    type: 'string',
    sql: ctx.securityContext.userRole === 'admin' 
      ? employees.email
      : sql`REGEXP_REPLACE(${employees.email}, '(.{2}).*(@.*)', '\\1***\\2')`
  },
  
  salary: {
    name: 'salary',
    title: 'Salary',
    type: 'number',
    sql: ['admin', 'hr'].includes(ctx.securityContext.userRole)
      ? employees.salary
      : sql`NULL` // Hide salary for non-authorized users
  }
}
```

### Conditional Measure Access

```typescript
measures: {
  avgSalary: {
    name: 'avgSalary',
    title: 'Average Salary',
    type: 'avg',
    sql: ['admin', 'hr'].includes(ctx.securityContext.userRole)
      ? employees.salary
      : sql`NULL`,
    description: 'Available to HR and Admin roles only'
  }
}
```

## Audit and Logging

Track data access for compliance and security monitoring:

### Query Logging

```typescript
// In your adapter or middleware
const logQuery = (query: SemanticQuery, context: SecurityContext) => {
  console.log('Analytics Query:', {
    timestamp: new Date().toISOString(),
    userId: context.userId,
    organisationId: context.organisationId,
    cubes: query.measures?.map(m => m.split('.')[0]) || [],
    dimensions: query.dimensions || [],
    filters: query.filters || []
  })
}
```

### Access Control Logging

```typescript
sql: (ctx: QueryContext<Schema>): BaseQueryDefinition => {
  // Log access attempt
  if (ctx.securityContext.userRole !== 'admin') {
    logAccess({
      action: 'CUBE_ACCESS',
      cube: 'SalaryAnalytics',
      userId: ctx.securityContext.userId,
      result: 'DENIED'
    })
    throw new Error('Access denied')
  }
  
  return {
    from: employees,
    where: eq(employees.organisationId, ctx.securityContext.organisationId)
  }
}
```

## Testing Security

**CRITICAL**: Always test security isolation to prevent data leakage.

### Multi-Tenant Isolation Tests

```typescript
describe('Security Isolation', () => {
  it('should isolate data by organisation', async () => {
    const query = {
      measures: ['Employees.count'],
      dimensions: []
    }
    
    // Test org 1
    const result1 = await semanticLayer.load(query, {
      organisationId: 'org-1'
    })
    
    // Test org 2
    const result2 = await semanticLayer.load(query, {
      organisationId: 'org-2'  
    })
    
    // Results should be different and non-overlapping
    expect(result1.rawData()).not.toEqual(result2.rawData())
  })
  
  it('should enforce role-based access', async () => {
    const query = {
      measures: ['Employees.avgSalary'],
      dimensions: []
    }
    
    // Should succeed for admin
    const adminResult = await semanticLayer.load(query, {
      organisationId: 'test-org',
      userRole: 'admin'
    })
    expect(adminResult.rawData()[0]['Employees.avgSalary']).toBeDefined()
    
    // Should fail or return null for regular employee
    const employeeResult = await semanticLayer.load(query, {
      organisationId: 'test-org',
      userRole: 'employee'
    })
    expect(employeeResult.rawData()[0]['Employees.avgSalary']).toBeNull()
  })
})
```

### Security Context Validation

```typescript
describe('Security Context', () => {
  it('should require organisation ID', async () => {
    const query = { measures: ['Employees.count'], dimensions: [] }
    
    await expect(
      semanticLayer.load(query, {})  // Missing organisationId
    ).rejects.toThrow('organisationId is required')
  })
  
  it('should validate user permissions', async () => {
    await expect(
      semanticLayer.load(
        { measures: ['SalaryAnalytics.count'], dimensions: [] },
        { organisationId: 'test-org', userRole: 'employee' }
      )
    ).rejects.toThrow('Access denied')
  })
})
```

## Best Practices

1. **Organization Filtering**: ALWAYS filter by organizationId in every cube
2. **Join Security**: Apply security context to ALL joined tables
3. **Parameter Safety**: Use Drizzle's parameterized queries exclusively
4. **Role Validation**: Validate user roles before data access
5. **Audit Logging**: Log all data access for compliance
6. **Test Security**: Write comprehensive security isolation tests
7. **Principle of Least Privilege**: Grant minimal necessary access

## Security Checklist

- [ ] Every cube filters by `organisationId`
- [ ] All joined tables include security context filtering
- [ ] No raw SQL string concatenation
- [ ] Role-based access controls implemented
- [ ] Sensitive data is masked appropriately
- [ ] Security tests cover tenant isolation
- [ ] Audit logging is in place
- [ ] Security context validation is implemented

## Common Security Patterns

### Basic Tenant Isolation
```typescript
where: eq(table.organisationId, ctx.securityContext.organisationId)
```

### Role-Based Access
```typescript
sql: (ctx) => {
  if (ctx.securityContext.userRole !== 'admin') {
    throw new Error('Access denied')
  }
  // ... cube definition
}
```

### Department-Level Security
```typescript
where: and(
  eq(table.organisationId, ctx.securityContext.organisationId),
  eq(table.departmentId, ctx.securityContext.departmentId)
)
```

### Secure Join Pattern
```typescript
joins: [{
  table: joinedTable,
  on: and(
    eq(mainTable.foreignKey, joinedTable.id),
    eq(joinedTable.organisationId, ctx.securityContext.organisationId)
  )
}]
```

## Database-Level Row Level Security (RLS)

As an alternative to application-level `where` clauses, you can delegate security enforcement to the database itself using **Row Level Security (RLS)**. This is supported by PostgreSQL (9.5+) and platforms built on it like Supabase.

With database-level RLS, the database guarantees that queries can only see rows permitted by the active policy — regardless of what SQL is executed. This provides defence-in-depth: even if a cube definition accidentally omits a security filter, RLS prevents data leakage.

### How It Works

1. You define RLS **policies** on your database tables (done once, outside of Drizzle Cube)
2. You provide an `rlsSetup` function that runs **session-level commands** inside a transaction before each query
3. Your cube definitions can omit `where` clauses — the database handles filtering
4. Drizzle Cube recognises that `rlsSetup` is configured and suppresses the "no security filtering" warning

### When to Use RLS vs Application-Level Filtering

| Approach | Best for | Trade-offs |
|---|---|---|
| **Application-level** (`where` in cubes) | All databases, simple setups | Security logic in app code; must be applied to every cube |
| **Database-level RLS** (`rlsSetup`) | PostgreSQL, Supabase | Security enforced by database; requires DB-level policy setup |
| **Both** | High-security environments | Defence-in-depth; RLS as safety net even with app-level filtering |

### PostgreSQL RLS Setup

#### 1. Configure Database Policies (one-time setup)

```sql
-- Create a restricted role for analytics queries
CREATE ROLE analytics_reader NOLOGIN;
GRANT SELECT ON employees, departments, productivity TO analytics_reader;

-- Enable RLS on tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE productivity ENABLE ROW LEVEL SECURITY;

-- Create policies that read the organisation_id from a session variable
CREATE POLICY tenant_isolation ON employees
  USING (organisation_id = current_setting('app.organisation_id')::int);

CREATE POLICY tenant_isolation ON departments
  USING (organisation_id = current_setting('app.organisation_id')::int);

CREATE POLICY tenant_isolation ON productivity
  USING (organisation_id = current_setting('app.organisation_id')::int);
```

#### 2. Configure rlsSetup in Drizzle Cube

```typescript
import { sql } from 'drizzle-orm'
import { SemanticLayerCompiler } from 'drizzle-cube'
import type { RLSSetupFn } from 'drizzle-cube'

const rlsSetup: RLSSetupFn = async (tx, securityContext) => {
  const orgId = String(securityContext.organisationId)

  // SET LOCAL scopes these settings to the current transaction only
  await tx.execute!(sql.raw(`SET LOCAL app.organisation_id = '${orgId}'`))
  await tx.execute!(sql.raw(`SET LOCAL ROLE analytics_reader`))
}

const semanticLayer = new SemanticLayerCompiler({
  drizzle: db,
  schema,
  rlsSetup
})
```

#### 3. Define Cubes Without Security Filters

```typescript
// No where clause needed — PostgreSQL RLS enforces tenant isolation
export const employeesCube = defineCube('Employees', {
  sql: () => ({ from: employees }),

  measures: {
    count: { name: 'count', type: 'count', sql: employees.id },
    avgSalary: { name: 'avgSalary', type: 'avg', sql: employees.salary }
  },

  dimensions: {
    name: { name: 'name', type: 'string', sql: employees.name },
    createdAt: { name: 'createdAt', type: 'time', sql: employees.createdAt }
  }
})
```

### Supabase RLS Setup

Supabase uses PostgreSQL RLS natively and provides a built-in `auth.uid()` function for policy definitions.

#### 1. Configure Policies via Supabase Dashboard or SQL

```sql
-- Enable RLS (can also be done via Supabase Dashboard → Table Editor → RLS)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Policy using Supabase's auth context
-- This reads the JWT claims set by Supabase Auth
CREATE POLICY tenant_isolation ON employees
  FOR SELECT
  USING (
    organisation_id = (current_setting('request.jwt.claims', true)::json->>'organisation_id')::int
  );
```

#### 2. Configure rlsSetup for Supabase

```typescript
import { sql } from 'drizzle-orm'
import type { RLSSetupFn } from 'drizzle-cube'

const rlsSetup: RLSSetupFn = async (tx, securityContext) => {
  // Set the JWT claims that Supabase RLS policies read
  const claims = JSON.stringify({
    organisation_id: String(securityContext.organisationId),
    sub: securityContext.userId,
    role: securityContext.userRole
  })

  await tx.execute!(sql.raw(`SET LOCAL request.jwt.claims = '${claims}'`))
  await tx.execute!(sql.raw(`SET LOCAL ROLE authenticated`))
}

const semanticLayer = new SemanticLayerCompiler({
  drizzle: db,
  schema,
  rlsSetup
})
```

### Using RLS with Framework Adapters

All framework adapters support the `rlsSetup` option:

```typescript
// Express
const router = createCubeRouter({
  semanticLayer,
  drizzle: db,
  schema,
  rlsSetup,
  extractSecurityContext: async (req) => ({
    organisationId: req.user.organisationId,
    userId: req.user.id
  })
})

// Hono
const app = createCubeApp({
  semanticLayer,
  drizzle: db,
  schema,
  rlsSetup,
  extractSecurityContext: async (c) => ({
    organisationId: c.get('user').organisationId,
    userId: c.get('user').id
  })
})
```

### Important Notes

:::caution[Cache Key Must Reflect RLS Context]
The cache key includes the full `securityContext` by default, ensuring that cached results are never shared across tenants. Make sure your `securityContext` contains **all values** that your `rlsSetup` function uses to configure RLS — otherwise one user's cached results could be served to another.
:::

:::note[Database Support]
The `rlsSetup` hook runs transaction-level commands using `SET LOCAL`. This pattern is supported by **PostgreSQL** and databases built on it (Supabase, Neon, etc.). Other databases may support similar session-variable patterns — check your database documentation.

Dry-run and SQL generation endpoints do **not** trigger `rlsSetup`, since they don't execute queries against the database.
:::

:::tip[Defence-in-Depth]
You can combine both approaches — use application-level `where` clauses in your cubes AND configure `rlsSetup` for database-level RLS. This provides defence-in-depth: the application filters data at the query level, and the database enforces isolation as a safety net.
:::

## Next Steps

- Review [Cubes](/semantic-layer/cubes/) for complete security implementation
- Understand [Joins](/semantic-layer/joins/) security requirements
- Learn about [Adapters](/adapters/hono/) security context extraction
- Implement comprehensive security testing

## Roadmap Ideas

- Advanced RBAC with fine-grained permissions
- Field-level encryption for sensitive data
- Security policy configuration UI
- Automated security testing framework
- Compliance reporting and audit trails
- Integration with external identity providers