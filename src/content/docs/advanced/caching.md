---
title: Caching
description: Server-side caching for improved query performance
---

# Caching

Drizzle Cube provides an opt-in caching layer that allows you to cache query results using your preferred backend. This can significantly improve performance for frequently executed queries, especially in dashboards with multiple users viewing similar data.

## Overview

The caching system is designed around a pluggable `CacheProvider` interface, allowing you to use any cache backend (Redis, Memcached, database-backed, etc.). Drizzle Cube includes a reference `MemoryCacheProvider` for development and single-instance deployments.

**Key Features:**
- **Opt-in design** - Caching is disabled by default; enable it when you need it
- **Pluggable backends** - Implement `CacheProvider` for any cache system
- **Multi-tenant safe** - Security context is included in cache keys by default
- **Non-fatal errors** - Cache failures never break queries; they just bypass the cache
- **Cache metadata** - Query responses include cache hit information and TTL

## Quick Start

```typescript
import { SemanticLayerCompiler, MemoryCacheProvider } from 'drizzle-cube/server'

const semanticLayer = new SemanticLayerCompiler({
  drizzle: db,
  schema,
  cache: {
    provider: new MemoryCacheProvider(),
    defaultTtlMs: 300000 // 5 minutes
  }
})
```

> **Warning**: The `MemoryCacheProvider` is designed for **development, testing, and single-instance deployments only**. For production environments with multiple server instances, you must use a distributed cache provider like Redis to ensure cache consistency across instances. In-memory caches are not shared between processes, leading to inconsistent results and wasted memory in multi-instance deployments.

## Configuration Options

The `cache` option accepts a `CacheConfig` object with the following properties:

```typescript
interface CacheConfig {
  // Required: Your cache provider implementation
  provider: CacheProvider

  // Default TTL for cached entries (default: 300000ms / 5 minutes)
  defaultTtlMs?: number

  // Prefix for all cache keys (default: 'drizzle-cube:')
  keyPrefix?: string

  // Enable/disable caching globally (default: true)
  enabled?: boolean

  // Include security context in cache key (default: true) - CRITICAL for multi-tenant
  includeSecurityContext?: boolean

  // Custom serializer for security context
  securityContextSerializer?: (ctx: SecurityContext) => string

  // Callback for cache operation errors
  onError?: (error: Error, operation: 'get' | 'set' | 'delete') => void

  // Callback for cache events (hits, misses, sets)
  onCacheEvent?: (event: CacheEvent) => void
}
```

### Example with Full Configuration

```typescript
const semanticLayer = new SemanticLayerCompiler({
  drizzle: db,
  schema,
  cache: {
    provider: new MemoryCacheProvider({ maxEntries: 1000 }),
    defaultTtlMs: 60000, // 1 minute
    keyPrefix: 'myapp:analytics:',
    enabled: process.env.NODE_ENV === 'production',
    includeSecurityContext: true,

    onCacheEvent: (event) => {
      console.log(`Cache ${event.type}: ${event.key} (${event.durationMs}ms)`)
    },

    onError: (error, operation) => {
      console.error(`Cache ${operation} failed:`, error)
      // Send to monitoring service
    }
  }
})
```

## Cache Metadata in Results

When a query is served from cache, the response includes metadata about the cached result:

```typescript
const result = await semanticLayer.load(query, securityContext)

if (result.cache) {
  console.log('Cache hit!')
  console.log('Cached at:', result.cache.cachedAt)      // ISO timestamp
  console.log('TTL:', result.cache.ttlMs)               // Original TTL
  console.log('TTL remaining:', result.cache.ttlRemainingMs) // Time until expiration
}
```

The `cache` field is only present when the result was served from cache. Fresh query results do not include this field.

## Multi-Tenant Security

> **Security**: The `includeSecurityContext` option is **enabled by default** and is **critical for multi-tenant applications**. Disabling it could result in data leakage between organizations. Only disable if you have a single-tenant application with no security context requirements.

By default, Drizzle Cube includes a hash of the security context in every cache key. This ensures that:
- Different organizations get different cache entries
- Users with different permissions cannot see cached results meant for others
- Cache isolation matches your data isolation

```
Cache key format: {prefix}query:{queryHash}:ctx:{securityContextHash}
Example: drizzle-cube:query:a1b2c3d4:ctx:e5f6g7h8
```

### Custom Security Context Serializer

If your security context contains non-serializable values or you want to cache at a different granularity, use a custom serializer:

```typescript
cache: {
  provider: new MemoryCacheProvider(),

  // Cache at organization level (shared across all users in org)
  securityContextSerializer: (ctx) => JSON.stringify({
    organisationId: ctx.organisationId,
    // Omit userId to share cache across users in same org
  })
}
```

```typescript
cache: {
  provider: new MemoryCacheProvider(),

  // Cache at role level within organization
  securityContextSerializer: (ctx) => JSON.stringify({
    organisationId: ctx.organisationId,
    role: ctx.role
    // Different roles may see different data, so include role
  })
}
```

## Creating Custom Cache Providers

To use a distributed cache like Redis, implement the `CacheProvider` interface:

```typescript
interface CacheProvider {
  get<T>(key: string): Promise<CacheGetResult<T> | null | undefined>
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>
  delete(key: string): Promise<boolean>
  deletePattern(pattern: string): Promise<number>
  has(key: string): Promise<boolean>
  close?(): Promise<void>
}
```

### Redis Implementation Example

Here's a complete Redis cache provider using `ioredis`:

```typescript
import Redis from 'ioredis'
import type { CacheProvider, CacheGetResult } from 'drizzle-cube/server'

interface CacheEntry<T> {
  value: T
  cachedAt: number
  ttlMs: number
}

export class RedisCacheProvider implements CacheProvider {
  private client: Redis
  private defaultTtlMs: number

  constructor(options: { redis: Redis; defaultTtlMs?: number }) {
    this.client = options.redis
    this.defaultTtlMs = options.defaultTtlMs ?? 300000
  }

  async get<T>(key: string): Promise<CacheGetResult<T> | null> {
    const data = await this.client.get(key)
    if (!data) return null

    const entry: CacheEntry<T> = JSON.parse(data)
    const now = Date.now()
    const ttlRemainingMs = Math.max(0, (entry.cachedAt + entry.ttlMs) - now)

    return {
      value: entry.value,
      metadata: {
        cachedAt: entry.cachedAt,
        ttlMs: entry.ttlMs,
        ttlRemainingMs
      }
    }
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const ttl = ttlMs ?? this.defaultTtlMs
    const entry: CacheEntry<T> = {
      value,
      cachedAt: Date.now(),
      ttlMs: ttl
    }

    // SETEX sets key with expiration in seconds
    await this.client.setex(key, Math.ceil(ttl / 1000), JSON.stringify(entry))
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.client.del(key)
    return result > 0
  }

  async deletePattern(pattern: string): Promise<number> {
    // Use SCAN to find matching keys (doesn't block like KEYS)
    let cursor = '0'
    let deleted = 0

    do {
      const [newCursor, keys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      )
      cursor = newCursor

      if (keys.length > 0) {
        deleted += await this.client.del(...keys)
      }
    } while (cursor !== '0')

    return deleted
  }

  async has(key: string): Promise<boolean> {
    const exists = await this.client.exists(key)
    return exists === 1
  }

  async close(): Promise<void> {
    await this.client.quit()
  }
}
```

**Usage:**

```typescript
import Redis from 'ioredis'
import { SemanticLayerCompiler } from 'drizzle-cube/server'
import { RedisCacheProvider } from './redis-cache-provider'

const redis = new Redis(process.env.REDIS_URL)

const semanticLayer = new SemanticLayerCompiler({
  drizzle: db,
  schema,
  cache: {
    provider: new RedisCacheProvider({ redis }),
    defaultTtlMs: 300000
  }
})
```

### Cloudflare KV Implementation Example

For Cloudflare Workers deployments, you can use Cloudflare KV as your cache backend. KV provides globally distributed, eventually consistent storage that's ideal for caching analytics queries at the edge.

See the complete implementation: [CloudflareKVProvider on GitHub](https://github.com/cliftonc/drizzle-cube-try-site/blob/main/src/cache/cloudflare-kv-provider.ts)

**Key considerations for Cloudflare KV:**
- **Minimum TTL**: KV requires a minimum TTL of 60 seconds
- **Eventual consistency**: Writes propagate globally within ~60 seconds
- **Rate limits**: 1 write per key per second
- **Value size**: Maximum 25 MiB per value

**Usage with Hono:**

```typescript
import { createCubeApp } from 'drizzle-cube/adapters/hono'
import { CloudflareKVProvider } from './cache/cloudflare-kv-provider'

// In your Cloudflare Worker
interface CloudflareEnv {
  CACHE: KVNamespace
  DATABASE_URL: string
}

const app = new Hono<{ Bindings: CloudflareEnv }>()

app.use('/cubejs-api/*', async (c) => {
  const cubeApp = createCubeApp({
    cubes: allCubes,
    drizzle: db,
    schema,
    extractSecurityContext: getSecurityContext,
    cache: {
      provider: new CloudflareKVProvider(c.env.CACHE, {
        defaultTtlMs: 3600000  // 60 minutes
      }),
      defaultTtlMs: 3600000,
      keyPrefix: 'drizzle-cube:',
      includeSecurityContext: true
    }
  })
  return cubeApp.fetch(c.req.raw)
})
```

**Wrangler configuration:**

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"
```

## Cache Invalidation

When your data changes, you'll need to invalidate the cache. The `CacheProvider` interface provides two methods for this:

### Delete Specific Key

```typescript
// Get reference to the cache provider
const cacheProvider = semanticLayer.getCacheProvider()

// Delete a specific cache entry
await cacheProvider.delete('drizzle-cube:query:a1b2c3d4:ctx:e5f6g7h8')
```

### Delete by Pattern

The `deletePattern()` method supports glob-style patterns:

```typescript
// Delete all cache entries
await cacheProvider.deletePattern('drizzle-cube:*')

// Delete all entries for a specific key prefix
await cacheProvider.deletePattern('myapp:analytics:*')

// Delete entries matching a suffix
await cacheProvider.deletePattern('*:ctx:e5f6g7h8')

// Delete entries with pattern in the middle
await cacheProvider.deletePattern('drizzle-cube:*Employees*')
```

### Invalidation Helper

Drizzle Cube exports a helper for generating cube-based invalidation patterns:

```typescript
import { getCubeInvalidationPattern } from 'drizzle-cube/server'

// When Employees data changes, invalidate all Employees queries
const pattern = getCubeInvalidationPattern('Employees')
// Returns: 'drizzle-cube:*Employees*'

await cacheProvider.deletePattern(pattern)
```

## Monitoring and Events

Use the `onCacheEvent` callback to monitor cache performance:

```typescript
const cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  errors: 0
}

const semanticLayer = new SemanticLayerCompiler({
  drizzle: db,
  schema,
  cache: {
    provider: new MemoryCacheProvider(),
    onCacheEvent: (event) => {
      switch (event.type) {
        case 'hit':
          cacheStats.hits++
          break
        case 'miss':
          cacheStats.misses++
          break
        case 'set':
          cacheStats.sets++
          break
        case 'error':
          cacheStats.errors++
          break
      }

      // Log slow cache operations
      if (event.durationMs > 100) {
        console.warn(`Slow cache ${event.type}: ${event.key} took ${event.durationMs}ms`)
      }
    }
  }
})

// Expose stats endpoint
app.get('/cache-stats', (req, res) => {
  const hitRate = cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100
  res.json({
    ...cacheStats,
    hitRate: `${hitRate.toFixed(1)}%`
  })
})
```

### MemoryCacheProvider Stats

The built-in `MemoryCacheProvider` provides additional statistics:

```typescript
const memoryCache = new MemoryCacheProvider({ maxEntries: 1000 })

// Get current stats
const stats = memoryCache.stats()
console.log(stats)
// { size: 150, maxEntries: 1000, defaultTtlMs: 300000 }

// Get current cache size
console.log(memoryCache.size()) // 150

// Manually trigger cleanup of expired entries
const cleaned = memoryCache.cleanup()
console.log(`Cleaned ${cleaned} expired entries`)
```

## Framework Adapter Integration

All framework adapters (Express, Fastify, Hono, Next.js) support caching through the same `cache` option:

```typescript
// Express
import { createCubeRouter } from 'drizzle-cube/adapters/express'

const router = createCubeRouter({
  cubes: [employeesCube, departmentsCube],
  drizzle: db,
  schema,
  extractSecurityContext: async (req) => ({
    organisationId: req.user.orgId
  }),
  cache: {
    provider: new RedisCacheProvider({ redis }),
    defaultTtlMs: 300000
  }
})
```

The caching configuration is identical for Fastify, Hono, and Next.js adapters. See the individual [adapter documentation](/adapters/) for framework-specific examples.

## Best Practices

### TTL Recommendations

| Data Type | Recommended TTL | Rationale |
|-----------|----------------|-----------|
| Real-time metrics | 30-60 seconds | Balance freshness with performance |
| Daily aggregates | 5-15 minutes | Data changes infrequently |
| Historical data | 1-24 hours | Data is immutable |
| Configuration data | 5 minutes | Rarely changes |

### Memory Management

When using `MemoryCacheProvider`, configure `maxEntries` to prevent unbounded growth:

```typescript
new MemoryCacheProvider({
  maxEntries: 1000,        // LRU eviction when exceeded
  defaultTtlMs: 300000,    // 5 minute TTL
  cleanupIntervalMs: 60000 // Clean expired entries every minute
})
```

### Production Checklist

1. **Use distributed cache** - Redis, Memcached, or similar for multi-instance deployments
2. **Monitor hit rates** - Use `onCacheEvent` to track cache effectiveness
3. **Set appropriate TTLs** - Balance data freshness with query performance
4. **Implement invalidation** - Clear cache when underlying data changes
5. **Keep security context enabled** - Never disable for multi-tenant applications
6. **Handle errors gracefully** - Use `onError` to log and monitor cache failures

## Disabling Cache for Specific Queries

If you need to bypass cache for a specific query, you can temporarily disable caching:

```typescript
// Currently, disable at the compiler level
semanticLayer.setCacheEnabled(false)
const freshResult = await semanticLayer.load(query, securityContext)
semanticLayer.setCacheEnabled(true)
```

Or configure `enabled: false` in the cache config to disable all caching without removing the configuration.

## Next Steps

- Learn about [Performance Optimization](/advanced/performance/) for other optimization strategies
- See [Security](/semantic-layer/security/) for multi-tenant security best practices
- Explore [Framework Adapters](/adapters/) for your specific framework
