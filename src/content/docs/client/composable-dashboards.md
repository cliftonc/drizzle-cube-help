---
title: Composable Dashboards
---

`DashboardGrid` renders a complete dashboard — toolbar, filter bar, grid surface, and modals — from a single config. That is the right choice for most apps. But when you need to **replace the toolbar with your own design system**, embed a **grid-only** view for print/export, or otherwise rearrange the parts, you can drop down to the composable pieces that `DashboardGrid` is itself built from.

The edit/save state machine lives in a per-instance store and is shared through React context, so every piece — and any component you write — stays in sync without prop drilling.

## When to use this

- **Custom toolbar** — render the Edit / Add / layout-mode / palette controls with your own buttons while Drizzle Cube keeps owning edit/save state.
- **Grid-only or filter-only embeds** — show just the portlets (e.g. a read-only print view) or just the filter bar.
- **Custom layout** — move the filter bar below the grid, wrap pieces in your own panels, etc.

If you only want to hide the built-in toolbar, you don't need to compose anything — use the [`hideToolbar` prop](#quick-opt-out-hidetoolbar).

## The pieces

All of these are exported from `drizzle-cube/client` (and `drizzle-cube/client/components`):

| Export | Role |
|--------|------|
| `DashboardProvider` | Owns the store + state machine. Takes the same props as `DashboardGrid` and renders your composition as `children`. |
| `DashboardToolbar` | The sticky edit bar (Edit / layout toggle / palette / Add) plus the floating toolbar. |
| `DashboardFilterBar` | The dashboard-level filter UI and the filter-selection banner. |
| `DashboardGridSurface` | The portlet layout (grid / rows / scaled / mobile) and the empty-state placeholder. |
| `DashboardModals` | The add/edit portlet, add/edit text, filter-config, and delete-confirm modals. |
| `useDashboardContext()` | Hook exposing the live state machine + actions to any descendant of `DashboardProvider`. |

`DashboardProvider` must be rendered inside a [`CubeProvider`](/client/), exactly like `DashboardGrid`.

## Recreating DashboardGrid

`<DashboardGrid />` is just this composition. Start here and swap out the parts you want to own:

```tsx
import {
  DashboardProvider,
  DashboardToolbar,
  DashboardFilterBar,
  DashboardGridSurface,
  DashboardModals,
} from 'drizzle-cube/client'

function MyDashboard({ config, setConfig }) {
  return (
    <DashboardProvider
      config={config}
      editable
      onConfigChange={setConfig}
      onSave={saveDashboardConfig}
    >
      <DashboardToolbar />
      <DashboardFilterBar />
      <DashboardGridSurface />
      <DashboardModals />
    </DashboardProvider>
  )
}
```

The pieces take **no props** — they read everything from the provider's context. Order and placement are up to you; for example, render the filter bar below the grid, or drop `DashboardToolbar` entirely and supply your own (see below).

`DashboardProvider` accepts the same props as `DashboardGrid`: `config`, `editable`, `dashboardFilters`, `loadingComponent`, `onConfigChange`, `onPortletRefresh`, `onSave`, `onSaveThumbnail`, `colorPalette`, `schema`, `onDashboardFiltersChange`, `dashboardModes`, and `hideToolbar`.

## Quick opt-out: `hideToolbar`

If you just want the grid without the built-in toolbar (and you'll drive edit mode from your own UI), pass `hideToolbar` to `DashboardGrid`. It suppresses **both** the top edit bar and the floating toolbar:

```tsx
<DashboardGrid config={config} editable hideToolbar onSave={save} />
```

`DashboardToolbar` honours the same flag, so it also works in a composition.

## Building your own toolbar

Render any descendant of `DashboardProvider` and call `useDashboardContext()` to read state and trigger actions. Replace `<DashboardToolbar />` with your own component:

```tsx
import { DashboardProvider, DashboardFilterBar, DashboardGridSurface, DashboardModals, useDashboardContext } from 'drizzle-cube/client'
import { Button, Toolbar } from 'your-design-system'

function CustomToolbar() {
  const { isEditMode, canEdit, layoutMode, allowedModes, actions } = useDashboardContext()

  return (
    <Toolbar>
      <Button onClick={actions.toggleEditMode}>
        {isEditMode ? 'Done' : 'Edit'}
      </Button>

      {isEditMode && (
        <>
          <Button onClick={actions.openAddPortlet}>Add chart</Button>
          <Button onClick={actions.openAddText}>Add text</Button>

          {allowedModes.length > 1 && (
            <Button
              onClick={() => actions.handleLayoutModeChange(layoutMode === 'grid' ? 'rows' : 'grid')}
            >
              {layoutMode === 'grid' ? 'Switch to rows' : 'Switch to grid'}
            </Button>
          )}
        </>
      )}
    </Toolbar>
  )
}

function MyDashboard({ config, setConfig }) {
  return (
    <DashboardProvider config={config} editable onConfigChange={setConfig} onSave={save}>
      <CustomToolbar />
      <DashboardFilterBar />
      <DashboardGridSurface />
      <DashboardModals />   {/* keep this so Add chart / Add text open their builders */}
    </DashboardProvider>
  )
}
```

Keep `<DashboardModals />` in the tree if your toolbar uses `openAddPortlet` / `openAddText` / edit / delete — those actions open the corresponding modal.

### What `useDashboardContext()` exposes

State (read-only):

| Field | Description |
|-------|-------------|
| `isEditMode` | Whether the dashboard is currently in edit mode. |
| `canEdit` | `editable` **and** in edit mode **and** on a desktop-width viewport **and** not assigning a filter — i.e. drag/resize is live. |
| `canChangeLayoutMode` | Whether the grid/rows toggle should be enabled. |
| `layoutMode` / `allowedModes` | The active layout mode and which modes are permitted. |
| `selectedFilterId` / `selectedFilter` | The filter currently being assigned to portlets (filter-selection mode), if any. |
| `displayMode` | `'desktop' \| 'scaled' \| 'mobile'` from the responsive engine. |
| `isResponsiveEditable` | `false` on viewports too narrow to edit (mobile/tablet). |

Actions (`actions.*`):

| Action | Description |
|--------|-------------|
| `toggleEditMode()` / `enterEditMode()` / `exitEditMode()` | Control edit mode. `exitEditMode` triggers thumbnail capture when enabled. |
| `openAddPortlet()` / `openAddText()` | Open the chart or text portlet builder. |
| `openEditPortlet(portlet)` / `openEditText(portlet)` | Open a builder for an existing portlet. |
| `handleLayoutModeChange(mode)` | Switch between `'grid'` and `'rows'`. |
| `handlePaletteChange(name)` | Apply a color palette. |
| `selectFilter(id)` / `exitFilterSelectionMode()` | Enter/leave filter-assignment mode. |
| `savePortlet(data)` / `deletePortlet(id)` / `duplicatePortlet(id)` | Portlet CRUD. |

`useDashboardContext()` throws if called outside a `DashboardProvider`, so a missing provider fails fast rather than silently no-op'ing.

## Grid-only embed

For a read-only or print/export view, render just the surface — no toolbar, no filter bar, no modals:

```tsx
<DashboardProvider config={config} editable={false}>
  <DashboardGridSurface />
</DashboardProvider>
```

## Notes

- **Back-compat:** `DashboardGrid` continues to work exactly as before; it is now a thin composition of these pieces. Existing code needs no changes.
- **One provider per dashboard:** each `DashboardProvider` (and each `DashboardGrid`) creates its own isolated store instance, so multiple dashboards on a page don't interfere.
- **`AnalyticsDashboard`** still wraps `DashboardGrid` with filter merging, palette resolution, and dirty-state tracking — reach for the composable pieces only when you need to restructure the dashboard's own chrome.

## Next steps

- [Dashboards](/client/dashboards/) — the standard `DashboardGrid` API
- [Dashboard Persistence](/client/dashboard-persistence/) — wiring `onSave` to your backend
- [Theming](/client/theming/) — restyling the built-in components
- [Hooks](/client/hooks/) — data-fetching patterns
