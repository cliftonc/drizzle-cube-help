---
title: Dashboard Persistence
---

Drizzle Cube provides the UI components for creating and editing dashboards, but **persistence is implemented by you**. This guide covers how to implement the server-side API and connect it to the client components.

## Overview

Dashboard persistence has two levels:

1. **Dashboard Config (Required)** - Store and retrieve `DashboardConfig` objects
2. **Thumbnails (Optional)** - Capture and display dashboard preview images

## Database Schema

Here's a recommended schema structure using Drizzle ORM:

```typescript
import { pgTable, integer, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core'
import type { DashboardConfig } from 'drizzle-cube/client'

export const dashboards = pgTable('dashboards', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  description: text('description'),
  organisationId: integer('organisation_id').notNull(),  // Multi-tenant isolation
  config: jsonb('config').notNull().$type<DashboardConfig>(),
  order: integer('order').default(0),
  isActive: boolean('is_active').default(true),  // Soft delete support
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})
```

### Config Field Structure

The `config` field stores the complete dashboard configuration:

```typescript
interface DashboardConfig {
  portlets: PortletConfig[]
  layoutMode?: 'grid' | 'rows'
  rows?: RowLayout[]
  colorPalette?: string
  filters?: DashboardFilter[]
  thumbnailData?: string   // Transient: base64 for development
  thumbnailUrl?: string    // Permanent: CDN URL for production
}
```

## REST API Endpoints

Implement these endpoints to support dashboard persistence:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboards` | GET | List all dashboards |
| `/api/dashboards/:id` | GET | Get single dashboard |
| `/api/dashboards` | POST | Create dashboard |
| `/api/dashboards/:id` | PUT | Update dashboard |
| `/api/dashboards/:id` | DELETE | Delete dashboard |
| `/api/dashboards/:id/thumbnail` | POST | Save thumbnail (optional) |

### Response Formats

**List Dashboards (GET /api/dashboards)**
```typescript
{
  data: Dashboard[],
  meta: { total: number }
}
```

**Get Single Dashboard (GET /api/dashboards/:id)**
```typescript
{
  data: {
    id: number,
    name: string,
    description?: string,
    config: DashboardConfig,
    createdAt: string,
    updatedAt: string
  }
}
```

**Create Dashboard (POST /api/dashboards)**
```typescript
// Request body
{
  name: string,           // Required
  description?: string,
  config: {               // Required
    portlets: PortletConfig[]
  },
  order?: number
}

// Response (201)
{ data: Dashboard }
```

**Update Dashboard (PUT /api/dashboards/:id)**
```typescript
// Request body (all fields optional)
{
  name?: string,
  description?: string,
  config?: DashboardConfig,
  order?: number
}

// Response
{ data: Dashboard }
```

**Delete Dashboard (DELETE /api/dashboards/:id)**
```typescript
// Response
{ message: 'Dashboard deleted successfully' }
```

**Save Thumbnail (POST /api/dashboards/:id/thumbnail)**
```typescript
// Request body
{ thumbnailData: string }  // base64 data URI

// Response
{ thumbnailUrl: string }   // URL or data URI for storage
```

## Server Implementation Example

Here's a complete implementation using Hono (works similarly with Express, Fastify, or Next.js API routes):

```typescript
import { Hono } from 'hono'
import { eq, and, asc } from 'drizzle-orm'
import { dashboards } from './schema'

const app = new Hono()

// List dashboards
app.get('/api/dashboards', async (c) => {
  const organisationId = getOrgFromAuth(c)

  const pages = await db
    .select()
    .from(dashboards)
    .where(and(
      eq(dashboards.organisationId, organisationId),
      eq(dashboards.isActive, true)
    ))
    .orderBy(asc(dashboards.order))

  return c.json({ data: pages, meta: { total: pages.length } })
})

// Get single dashboard
app.get('/api/dashboards/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const organisationId = getOrgFromAuth(c)

  const page = await db
    .select()
    .from(dashboards)
    .where(and(
      eq(dashboards.id, id),
      eq(dashboards.organisationId, organisationId),
      eq(dashboards.isActive, true)
    ))
    .limit(1)

  if (page.length === 0) {
    return c.json({ error: 'Dashboard not found' }, 404)
  }

  return c.json({ data: page[0] })
})

// Create dashboard
app.post('/api/dashboards', async (c) => {
  const organisationId = getOrgFromAuth(c)
  const { name, description, config, order = 0 } = await c.req.json()

  // Validation
  if (!name || !config?.portlets) {
    return c.json({ error: 'name and config.portlets required' }, 400)
  }

  // Recommended limits
  const existing = await db
    .select({ id: dashboards.id })
    .from(dashboards)
    .where(and(
      eq(dashboards.organisationId, organisationId),
      eq(dashboards.isActive, true)
    ))

  if (existing.length >= 10) {
    return c.json({ error: 'Maximum dashboards reached (10)' }, 400)
  }

  if (config.portlets.length > 50) {
    return c.json({ error: 'Maximum 50 portlets allowed' }, 400)
  }

  const newPage = await db
    .insert(dashboards)
    .values({ name, description, order, organisationId, config })
    .returning()

  return c.json({ data: newPage[0] }, 201)
})

// Update dashboard
app.put('/api/dashboards/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const organisationId = getOrgFromAuth(c)
  const { name, description, config, order } = await c.req.json()

  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (order !== undefined) updateData.order = order
  if (config !== undefined) {
    if (config.portlets?.length > 50) {
      return c.json({ error: 'Maximum 50 portlets allowed' }, 400)
    }
    updateData.config = config
  }

  const updated = await db
    .update(dashboards)
    .set(updateData)
    .where(and(
      eq(dashboards.id, id),
      eq(dashboards.organisationId, organisationId)
    ))
    .returning()

  if (updated.length === 0) {
    return c.json({ error: 'Dashboard not found' }, 404)
  }

  return c.json({ data: updated[0] })
})

// Delete dashboard (soft delete)
app.delete('/api/dashboards/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const organisationId = getOrgFromAuth(c)

  const deleted = await db
    .update(dashboards)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(
      eq(dashboards.id, id),
      eq(dashboards.organisationId, organisationId)
    ))
    .returning()

  if (deleted.length === 0) {
    return c.json({ error: 'Dashboard not found' }, 404)
  }

  return c.json({ message: 'Dashboard deleted successfully' })
})
```

## Client Integration

### AnalyticsDashboard Props

The `AnalyticsDashboard` component accepts these persistence-related props:

```typescript
interface AnalyticsDashboardProps {
  config: DashboardConfig
  editable?: boolean
  onConfigChange?: (config: DashboardConfig) => void  // Local state update
  onSave?: (config: DashboardConfig) => Promise<void> | void  // Persist to server
  onSaveThumbnail?: (thumbnailData: string) => Promise<string | void>  // Optional
  onDirtyStateChange?: (isDirty: boolean) => void  // Track unsaved changes
}
```

### Complete Client Example

```tsx
import { useState, useCallback, useEffect } from 'react'
import { CubeProvider, AnalyticsDashboard } from 'drizzle-cube/client'
import type { DashboardConfig } from 'drizzle-cube/client'

function DashboardPage({ dashboardId }: { dashboardId: string }) {
  const [config, setConfig] = useState<DashboardConfig | null>(null)

  // Fetch dashboard on mount
  useEffect(() => {
    fetch(`/api/dashboards/${dashboardId}`)
      .then(res => res.json())
      .then(data => setConfig(data.data.config))
  }, [dashboardId])

  // Handle local config changes (before save)
  const handleConfigChange = useCallback((newConfig: DashboardConfig) => {
    setConfig(newConfig)
  }, [])

  // Persist to server
  const handleSave = useCallback(async (configToSave: DashboardConfig) => {
    const response = await fetch(`/api/dashboards/${dashboardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: configToSave })
    })

    if (!response.ok) {
      throw new Error('Failed to save dashboard')
    }
  }, [dashboardId])

  // Optional: Save thumbnail
  const handleSaveThumbnail = useCallback(async (thumbnailData: string) => {
    const response = await fetch(`/api/dashboards/${dashboardId}/thumbnail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thumbnailData })
    })

    if (response.ok) {
      const result = await response.json()
      return result.thumbnailUrl
    }
  }, [dashboardId])

  if (!config) return <div>Loading...</div>

  return (
    <CubeProvider
      apiOptions={{ apiUrl: '/api/cubejs-api/v1' }}
      features={{
        thumbnail: { enabled: true, width: 400, height: 300, format: 'png' }
      }}
    >
      <AnalyticsDashboard
        config={config}
        editable={true}
        onConfigChange={handleConfigChange}
        onSave={handleSave}
        onSaveThumbnail={handleSaveThumbnail}
      />
    </CubeProvider>
  )
}
```

## Thumbnail Feature (Optional)

The thumbnail feature captures dashboard screenshots for list views and previews.

### Installation

Install the optional peer dependency:

```bash
npm install modern-screenshot
```

> **Note:** The feature gracefully degrades if `modern-screenshot` is not installed. You'll see a development warning but the dashboard will work normally.

### Configuration

Enable thumbnails via the `CubeProvider` features config:

```typescript
interface ThumbnailFeatureConfig {
  enabled: boolean
  width?: number    // default: 800 (capture width in pixels)
  height?: number   // default: 600 (capture height in pixels)
  format?: 'png' | 'jpeg'
  quality?: number  // 0-1, jpeg only (default: 0.9)
}
```

```tsx
<CubeProvider
  apiOptions={{ apiUrl: '/api/cubejs-api/v1' }}
  features={{
    thumbnail: {
      enabled: true,
      width: 400,
      height: 300,
      format: 'png'
    }
  }}
>
  <App />
</CubeProvider>
```

### How Thumbnails Work

```
User edits dashboard → Exits edit mode
                            ↓
            thumbnailDirty flag checked
                            ↓
         captureThumbnail(gridContentRef)
                            ↓
       onSaveThumbnail(base64DataUri) called
                            ↓
        Server processes and returns URL
                            ↓
       config.thumbnailUrl updated
```

Thumbnails are captured automatically when the user exits edit mode after making changes. The `onSaveThumbnail` callback receives a base64 data URI that you can upload to your server or cloud storage.

### Server-Side Thumbnail Storage

**Development Pattern (store in database):**

```typescript
app.post('/api/dashboards/:id/thumbnail', async (c) => {
  const id = parseInt(c.req.param('id'))
  const organisationId = getOrgFromAuth(c)
  const { thumbnailData } = await c.req.json()

  if (!thumbnailData || typeof thumbnailData !== 'string') {
    return c.json({ error: 'thumbnailData required' }, 400)
  }

  const existingPage = await db
    .select()
    .from(dashboards)
    .where(and(
      eq(dashboards.id, id),
      eq(dashboards.organisationId, organisationId)
    ))
    .limit(1)

  if (existingPage.length === 0) {
    return c.json({ error: 'Dashboard not found' }, 404)
  }

  const updatedConfig = {
    ...existingPage[0].config,
    thumbnailData,  // Store base64 directly for development
    thumbnailUrl: undefined
  }

  await db
    .update(dashboards)
    .set({ config: updatedConfig, updatedAt: new Date() })
    .where(eq(dashboards.id, id))

  return c.json({ thumbnailUrl: thumbnailData })
})
```

**Production Pattern (upload to S3/R2):**

```typescript
app.post('/api/dashboards/:id/thumbnail', async (c) => {
  const id = parseInt(c.req.param('id'))
  const { thumbnailData } = await c.req.json()

  // Convert base64 to buffer
  const base64Data = thumbnailData.split(',')[1]
  const buffer = Buffer.from(base64Data, 'base64')

  // Upload to cloud storage
  const key = `dashboards/${id}/thumbnail-${Date.now()}.png`
  await s3.putObject({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'image/png'
  })

  const url = `https://cdn.example.com/${key}`

  // Store URL only (not base64)
  const existingPage = await db.select().from(dashboards).where(eq(dashboards.id, id)).limit(1)

  await db
    .update(dashboards)
    .set({
      config: { ...existingPage[0].config, thumbnailUrl: url, thumbnailData: undefined },
      updatedAt: new Date()
    })
    .where(eq(dashboards.id, id))

  return c.json({ thumbnailUrl: url })
})
```

### Displaying Thumbnails

Use the `DashboardThumbnailPlaceholder` component for dashboards without thumbnails:

```tsx
import { DashboardThumbnailPlaceholder } from 'drizzle-cube/client'

function DashboardCard({ dashboard }) {
  const thumbnailSrc = dashboard.config.thumbnailUrl || dashboard.config.thumbnailData

  return (
    <div className="dashboard-card">
      <div className="aspect-video bg-dc-bg-secondary">
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={`${dashboard.name} preview`}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <DashboardThumbnailPlaceholder className="w-full h-full" />
        )}
      </div>
      <h3>{dashboard.name}</h3>
    </div>
  )
}
```

### Utility Functions

For advanced use cases, these utility functions are available:

```tsx
import {
  captureThumbnail,
  isThumbnailCaptureAvailable,
  warnIfScreenshotLibMissing
} from 'drizzle-cube/client'

// Check if thumbnail capture is available
const available = await isThumbnailCaptureAvailable(thumbnailConfig)

// Manual capture (if needed outside the normal flow)
const dataUri = await captureThumbnail(elementRef, thumbnailConfig)

// Show dev warning if library missing
warnIfScreenshotLibMissing(thumbnailConfig)
```

## Reference Implementation

The drizzle-cube development site includes a complete working example. View the source code on GitHub:

| File | Description |
|------|-------------|
| [`dev/server/analytics-routes.ts`](https://github.com/cliftonc/drizzle-cube/blob/main/dev/server/analytics-routes.ts) | Complete REST API with all CRUD endpoints |
| [`dev/server/schema.ts`](https://github.com/cliftonc/drizzle-cube/blob/main/dev/server/schema.ts) | Database schema with `analyticsPages` table |
| [`dev/client/src/pages/DashboardViewPage.tsx`](https://github.com/cliftonc/drizzle-cube/blob/main/dev/client/src/pages/DashboardViewPage.tsx) | Client integration with `onSave` and `onSaveThumbnail` |
| [`dev/client/src/pages/DashboardListPage.tsx`](https://github.com/cliftonc/drizzle-cube/blob/main/dev/client/src/pages/DashboardListPage.tsx) | Dashboard list with thumbnail display |
| [`dev/client/src/App.tsx`](https://github.com/cliftonc/drizzle-cube/blob/main/dev/client/src/App.tsx) | CubeProvider with `features.thumbnail` config |
| [`src/client/utils/thumbnail.ts`](https://github.com/cliftonc/drizzle-cube/blob/main/src/client/utils/thumbnail.ts) | Thumbnail capture utility functions |
| [`src/client/components/DashboardThumbnailPlaceholder.tsx`](https://github.com/cliftonc/drizzle-cube/blob/main/src/client/components/DashboardThumbnailPlaceholder.tsx) | Placeholder component for missing thumbnails |

## Best Practices

### API Best Practices

- Always validate that `config.portlets` is an array
- Implement limits (10 dashboards per org, 50 portlets per dashboard recommended)
- Use soft deletes (`isActive` flag) for data recovery
- Include `organisationId` filtering for multi-tenant isolation
- Return the updated entity after mutations for client sync

### Thumbnail Best Practices

- Use smaller dimensions (400x300) for list view thumbnails
- Use PNG format for dashboards with text/charts (sharper edges)
- Use JPEG format for image-heavy dashboards (smaller file size)
- Handle capture failures gracefully (keep existing thumbnail)
- Clean up old thumbnails when uploading new ones (S3/R2)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Changes not persisting | Ensure `onSave` callback returns a Promise and completes successfully |
| Thumbnails not capturing | Install `modern-screenshot`: `npm install modern-screenshot` |
| Console warning about missing library | Install the optional dependency (warning is dev-mode only) |
| Captures blank/white image | Ensure charts are fully rendered before exiting edit mode |
| Large thumbnail file sizes | Reduce width/height or use JPEG format |
| CORS issues with chart images | Ensure all images in charts are from the same origin |
| 404 on dashboard fetch | Check that `organisationId` matches and `isActive` is true |

## Next Steps

- Learn about [Dashboard Components](/client/dashboards/) for layout and editing
- Explore [Hooks](/client/hooks/) for data fetching patterns
- Review [Charts](/client/charts/) for visualization options
