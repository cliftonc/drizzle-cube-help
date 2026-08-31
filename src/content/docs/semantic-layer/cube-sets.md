---
title: Per-Tenant Cube Sets
description: Serve different cube definitions to different tenants from one semantic layer — Drizzle Cube's equivalent of Cube's COMPILE_CONTEXT.
---

Cube sets let one `SemanticLayerCompiler` serve **different cube definitions** to different tenants. They are Drizzle Cube's equivalent of Cube's `COMPILE_CONTEXT` / `contextToAppId`, and were introduced in 0.8.

Most multi-tenancy needs nothing of the sort. One cube definition normally serves every tenant, and `securityContext` is threaded into each cube's `sql` so that only that tenant's **rows** are visible — see [Security](/semantic-layer/security/). Reach for cube sets only when the **shape** of the model differs per tenant: which cubes, dimensions or measures exist at all.

The motivating case is user-defined attributes (EAV): an admin adds a "Health" attribute for their organisation, it becomes a dimension, and no other tenant should see it.

## The boot loop

Cube sets are registered **synchronously at application startup**. There is no async loader, so resolution stays synchronous — `getMetadata()` and `validateQuery()` keep their signatures and no request pays a load cost.

```typescript
import { SemanticLayerCompiler } from 'drizzle-cube/server'

const semanticLayer = new SemanticLayerCompiler({
  drizzle: db,
  schema,
  // Cube's contextToAppId, by another name.
  contextToCubeSetId: (ctx) => String(ctx.organisationId),
  onCubeSetRegistered: (info) => logger.debug('cube set registered', info)
})

// Cubes every tenant shares.
semanticLayer.registerCube(employeesCube)
semanticLayer.registerCube(departmentsCube)

// One set per tenant, overlaying the base set by cube name.
for (const org of await db.select().from(organisations)) {
  const attrs = await db
    .select()
    .from(attributes)
    .where(eq(attributes.organisationId, org.id))

  semanticLayer.registerCubeSet(String(org.id), [buildProjectsCube(attrs)])
}

const stats = semanticLayer.getCubeSetStats()
logger.info(
  `registered ${stats.setCount} cube sets, ${stats.cubeCount} cubes ` +
  `in ${stats.totalRegistrationMs}ms (slowest: ${stats.slowestSet?.setId})`
)
```

`registerCubeSet(setId, cubes)` merges each set over the base set **at registration time**, so request paths read a precomputed map and never merge. Cubes are matched to the base set by name, so a set can either add cubes or replace a base cube with a tenant-specific version — the usual case, since adding generated dimensions means re-declaring the cube that carries them.

## Resolution

`contextToCubeSetId` maps a security context to a set id, returning `string | number | undefined` (numbers are stringified).

| `contextToCubeSetId` returns | Result |
|---|---|
| not configured at all | base set — the single-tenant default, unchanged behaviour |
| `undefined` / `null` / `''` | base set |
| an id with a registered set | that set, merged over the base set |
| an id with **no** registered set | base set, or throws under `missingCubeSet: 'throw'` |

```typescript
const semanticLayer = new SemanticLayerCompiler({
  drizzle: db,
  schema,
  contextToCubeSetId: (ctx) => String(ctx.organisationId),
  missingCubeSet: 'throw'   // default is 'base'
})
```

:::caution[`missingCubeSet` is a security-relevant choice]
The default, `'base'`, means a tenant whose set was never registered silently sees the base model. Set `missingCubeSet: 'throw'` when every tenant is required to have its own set — it turns "this org was never registered" into a loud failure rather than a quiet fallback.
:::

## Every cube read needs a security context

Because cube contents vary per tenant, `securityContext` is a **required** argument on every method that resolves cubes:

```typescript
semanticLayer.getMetadata(securityContext)
semanticLayer.validateQuery(query, securityContext)
semanticLayer.getCube(name, securityContext)
semanticLayer.getAllCubes(securityContext)
semanticLayer.getAllCubesMap(securityContext)
semanticLayer.getCubeNames(securityContext)
semanticLayer.hasCube(name, securityContext)
```

This is deliberate. An optional parameter with a base-set fallback would leave exactly the failure this feature exists to remove: a caller that forgets the context still receives *a* cube list, and it is the wrong tenant's. Requiring it makes every such site a compile error.

If your deployment has no tenancy, say so explicitly:

```typescript
import { SINGLE_TENANT_CONTEXT } from 'drizzle-cube/server'

const metadata = semanticLayer.getMetadata(SINGLE_TENANT_CONTEXT)
```

`SecurityContext` is an open index-signature type, so `{}` also type-checks — the constant exists so that "no tenancy here" reads as a decision rather than an omission.

Set **lifecycle** is the deliberate exception. `registerCube`, `registerCubeSet`, `unregisterCubeSet`, `hasCubeSet`, `getCubeSetIds` and `getCubeSetStats` take no security context, because registration *defines* tenancy rather than operating within it. They are boot-and-admin API.

## `/meta` is tenant-scoped

The `/meta` endpoint resolves the security context like every other route and returns only that tenant's cubes. Two consequences even for deployments that change no code:

1. **`/meta` invokes your `extractSecurityContext`.** It previously did not. If your extractor throws for unauthenticated requests, anonymous `/meta` calls now fail. To keep metadata public, return `SINGLE_TENANT_CONTEXT` from your extractor for anonymous requests — an explicit choice in your code rather than a framework flag.
2. **`/meta` is no longer publicly cacheable.** The response used to be identical for every caller; a shared cache or CDN keyed on URL alone would now cross-serve one tenant's cube list to another. Drizzle Cube sets `Cache-Control: private, no-store` on every REST response for this reason.

## Invalidation

Re-register a set to refresh it:

```typescript
semanticLayer.registerCubeSet(
  String(org.id),
  [buildProjectsCube(await loadAttrs(org.id))]
)
```

That bumps the set's generation, which:

- drops its cached `/meta` entry (other tenants' entries are untouched), and
- changes its query-cache key component, so results computed from the old definitions are never served. Without it, renaming or retyping an attribute would keep serving stale rows for the full [cache](/advanced/caching/) TTL under an identical key.

Mutating the **base** set (`registerCube`, `removeCube`, `clearCubes`) rebuilds every set's merged view and clears all cached metadata, since base cubes are visible to every tenant.

`unregisterCubeSet(setId)` removes a tenant's set; that tenant then resolves to the base set, or throws under `missingCubeSet: 'throw'`.

:::caution[Multi-process deployments must signal each process]
The registry lives in memory, so re-registering in one worker does not reach the others. Broadcast your own "attributes changed" event and re-register in each process. This is documented, not solved.
:::

## Cost at boot

Registration is pure in-memory work — validation plus a map merge, with no database round trip beyond the queries *you* run to load each tenant's definitions. It is nonetheless proportional to tenants × cubes × dimensions, so it is reported rather than hidden:

- `onCubeSetRegistered({ setId, cubeCount, dimensionCount, generation, durationMs })` fires per set — emit it to your own logger or metrics. `dimensionCount` is usually the number that explains a slow boot, since generated attribute sets are where the volume is.
- `getCubeSetStats()` returns `{ setCount, cubeCount, totalRegistrationMs, slowestSet }` — the single summary line worth logging after a boot loop.
- `DC_DEBUG=cubesets` (or `DC_DEBUG=true`) prints per-set timing with no wiring at all.

If boot time becomes a problem, the fix is to make attributes real indexable columns rather than to load fewer sets — see the ladder below.

## Generated attribute dimensions (EAV)

`buildAttributeDimensions` turns admin-defined attributes into ordinary dimensions, each backed by a correlated scalar subquery against the junction table. Filtering, sorting, projection, drill-down and export then all work through paths that already exist, with no new query-model concept.

```typescript
import { buildAttributeDimensions } from 'drizzle-cube/server'

dimensions: {
  ...baseDimensions,
  ...buildAttributeDimensions({
    attributes: attrs,
    valueTable: employeeAttributeValues,
    recordKey: employees.id,
    foreignKey: employeeAttributeValues.employeeId,
    attributeKey: employeeAttributeValues.attributeId,
    valueColumn: employeeAttributeValues.value,
    security: (ctx) =>
      eq(employeeAttributeValues.organisationId, ctx.securityContext.organisationId)
  })
}
```

Because attribute definitions are usually per-organisation, generate these at boot and register them with `registerCubeSet(orgId, …)` rather than `registerCube`.

Three things it handles that are easy to get wrong:

- **`security` is required.** The subquery reads the junction table directly, so without it a tenant would see every tenant's attribute values. It is a required field of the options object rather than an optional one, so omitting it is a type error rather than merely inadvisable.
- **Typing is mandatory, not cosmetic.** Sorting and filtering run in SQL over the whole table before a page reaches the browser, so client-side conversion cannot repair them: sorted as text, `100` sorts below `9`, and `> 50` admits `'9'` while rejecting `'100'`. A `number` or `time` attribute is cast in SQL — tolerantly, via `QueryContext.tryCast`, so one `n/a` yields NULL for that row instead of failing the whole query.
- **Identity comes from the attribute id, not its name.** The dimension's member name is derived from `id` (prefixed with `attr_` by default, configurable via `namePrefix`), while `name` becomes the `title`. Renaming an attribute updates every table header without breaking saved dashboards, drill state or share links.

Pass `shown: false` to keep generated dimensions queryable but out of `/meta`, the field picker and AI prompts — see [Hiding dimensions](/semantic-layer/dimensions/#hiding-dimensions-and-measures-shown).

### Limitation: generated attributes in grouped queries

Each generated dimension is a correlated subquery keyed on the record's primary key, so a **grouped** query must also group by that key:

```typescript
// Fine — the record key is grouped, so the correlation is legal.
{ dimensions: ['Employees.id', 'Employees.attr_1'], measures: ['Employees.count'] }

// Rejected by PostgreSQL, and by MySQL under only_full_group_by.
{ dimensions: ['Employees.attr_1'], measures: ['Employees.count'] }
```

PostgreSQL reports *"subquery uses ungrouped column … from outer query"*. SQLite permits it, so this will not surface in a SQLite-only test run.

Record-grain listings — [`ungrouped: true`](/semantic-layer/ungrouped-queries/), the case attribute dimensions exist for — are unaffected, as are filtering and sorting. To aggregate freely across an attribute, pivot it into a real column with a view, which is step 2 of the ladder below.

### Performance ladder

Projection is cheap: a page of 25 rows is 25 indexed lookups per attribute. But `ORDER BY (SELECT …)` and `WHERE (SELECT …) = …` are proportional to the number of rows in the base table, because no index can serve them. Escalate only when measurement says to:

1. **Correlated scalar subquery** — what `buildAttributeDimensions` generates. No DDL, no sync. Fine into the tens of thousands of rows.
2. **Pivoted view** — an application-defined view that pivots the junction table with `MAX(CASE WHEN attribute_id = … THEN value END)`, one column per attribute. Attributes become real, indexable columns, so filter and sort are fast at any size. Point the cube at the view instead of the base table.
3. **Materialized view with refresh** — the same pivot, precomputed. Trades freshness for read cost; you own the refresh schedule.

## Next steps

- [Security](/semantic-layer/security/) — row-level filtering, which is what most multi-tenant deployments need
- [Dimensions](/semantic-layer/dimensions/) — including `shown: false`
- [Caching](/advanced/caching/) — how cube-set generation participates in the query cache key
