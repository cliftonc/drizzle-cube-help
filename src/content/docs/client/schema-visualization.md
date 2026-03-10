---
title: Schema Visualization
---

The Schema Visualization component renders an interactive entity-relationship diagram (ERD) of your cube schemas. It shows cubes as cards with their measures, dimensions, and time dimensions, connected by relationship edges.

## Installation

The schema visualization requires two optional peer dependencies:

```bash
npm install @xyflow/react elkjs
```

These packages are **not bundled** with drizzle-cube — they are loaded on demand only when the component is rendered. If they are not installed, a helpful fallback message is displayed.

## Quick Start

### Standalone Page

```tsx
import { CubeProvider, SchemaVisualization } from 'drizzle-cube/client'
import 'drizzle-cube/client/styles.css'

function SchemaPage() {
  return (
    <CubeProvider apiOptions={{ apiUrl: '/api/cubejs-api/v1' }} token={token}>
      <SchemaVisualization height="calc(100vh - 100px)" />
    </CubeProvider>
  )
}
```

### Inside AnalysisBuilder

Enable the schema diagram button in the AnalysisBuilder results panel via the `showSchemaDiagram` feature flag:

```tsx
<CubeProvider
  apiOptions={{ apiUrl: '/api/cubejs-api/v1' }}
  token={token}
  features={{ showSchemaDiagram: true }}
>
  <AnalysisBuilder />
</CubeProvider>
```

When enabled, a diagram icon button appears in the results panel toolbar. Clicking it toggles the schema visualization overlay, where you can:

- **Click measures** to toggle them as metrics in the query builder
- **Click dimensions** to toggle them as breakdowns
- **See highlighted fields** that are currently selected in the query

## Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `''` | Additional CSS classes for the container |
| `height` | `string \| number` | `'100%'` | Height of the visualization container |
| `onFieldClick` | `(cubeName, fieldName, fieldType) => void` | — | Callback when a field row is clicked |
| `highlightedCubes` | `string[]` | — | Cube names to highlight (accent border + ring) |
| `highlightedFields` | `string[]` | — | Field names to highlight (e.g. `['Employees.count']`) |
| `searchTerm` | `string` | — | External search term (hides built-in search bar) |

## Features

### Automatic Layout

The component uses [ELK.js](https://github.com/kieler/elkjs) (Eclipse Layout Kernel) with the layered algorithm to automatically position nodes. ELK calculates optimal placement considering edge connections, using per-edge ports to spread connections along node sides for clean routing.

React Flow's native bezier curves handle edge rendering, producing smooth paths between nodes.

### Drag and Persist

Drag any cube card to reposition it. Positions are automatically saved to `localStorage` and restored on the next visit. Right-click the canvas and select **Auto Layout** to reset to the computed layout.

### Search and Filter

The built-in search bar (shown when no external `searchTerm` prop is provided) filters across all cube names, field names, and titles. Matching fields are highlighted while non-matching fields are dimmed.

### Node Cards

Each cube is rendered as a card with collapsible sections:

- **Measures** — with amber indicator dot
- **Time Dimensions** — with blue indicator dot
- **Dimensions** — with green indicator dot

Sections with many fields scroll internally (mouse wheel works inside the card without zooming the canvas). The header shows the total field count and a summary badge (e.g. `9M 11D`).

### Relationship Edges

Edges display the relationship type between cubes:

| Symbol | Relationship |
|--------|-------------|
| `1:1` | hasOne |
| `1:M` | hasMany |
| `M:M` | belongsToMany |

Edge labels also show the join field mappings (e.g. `id → employeeId`).

### Dark Mode

The visualization fully supports dark mode through the drizzle-cube theming system. Section headers use subtle color tints that adapt to the current surface color.

## Advanced Usage

### Custom Field Click Handler

Wire up field clicks to your own logic:

```tsx
<SchemaVisualization
  height="600px"
  onFieldClick={(cubeName, fieldName, fieldType) => {
    console.log(`Clicked ${fieldType}: ${cubeName}.${fieldName}`)
    // Add to query, show details, etc.
  }}
  highlightedFields={['Employees.count', 'Employees.name']}
/>
```

### Controlled Search

Provide an external search term to hide the built-in search bar and control filtering externally:

```tsx
const [search, setSearch] = useState('')

<input value={search} onChange={e => setSearch(e.target.value)} />
<SchemaVisualization searchTerm={search} />
```

## Troubleshooting

### "Schema Visualization requires additional packages"

Install the optional dependencies:

```bash
npm install @xyflow/react elkjs
```

### Layout looks wrong on first load

Clear saved positions from localStorage:

```js
localStorage.removeItem('drizzle-cube-erd-node-positions')
```

Then refresh. The component will compute a fresh auto-layout.

### Edges pass through nodes

This can happen when using saved positions from a previous layout. Right-click the canvas and select **Auto Layout** to recompute positions with ELK's edge-aware algorithm.
