---
title: Icons
---

Drizzle Cube provides a centralized, configurable icon system that allows you to customize every icon used in the client components. The icon system uses [Iconify](https://iconify.design/) as the rendering engine, giving you access to 100,000+ icons from popular icon sets.

## Icon System Overview

All icons in Drizzle Cube are managed through a central registry. This approach allows you to:

- Use any icon from the Iconify ecosystem (HeroIcons, Tabler, Material Design, etc.)
- Override any icon with your own choice
- Maintain consistent icon usage across all components
- Reduce bundle size through tree-shaking

## Quick Start

### Using Icons in Components

Get an icon component from the registry:

```tsx
import { getIcon } from 'drizzle-cube/client'

const CloseIcon = getIcon('close')
const AddIcon = getIcon('add')

function MyComponent() {
  return (
    <div>
      <button>
        <AddIcon className="w-4 h-4" />
        Add Item
      </button>
      <button>
        <CloseIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
```

### Overriding Icons

Override icons at application initialization:

```tsx
import { registerIcons } from 'drizzle-cube/client'
import myCloseIcon from '@iconify-icons/mdi/close'
import myAddIcon from '@iconify-icons/mdi/plus'

// Override specific icons with your preferred icons
registerIcons({
  close: myCloseIcon,
  add: myAddIcon
})
```

## Available Icons

Icons are organized by category for easy discovery.

### Action Icons

Icons for user interactions and actions:

| Name | Description | Default |
|------|-------------|---------|
| `close` | Close/dismiss actions | HeroIcons x-mark |
| `add` | Add/create actions | HeroIcons plus |
| `edit` | Edit/modify actions | HeroIcons pencil |
| `delete` | Delete/remove actions | HeroIcons trash |
| `refresh` | Refresh/reload actions | HeroIcons arrow-path |
| `copy` | Copy to clipboard | HeroIcons clipboard-document |
| `duplicate` | Duplicate item | HeroIcons document-duplicate |
| `settings` | Settings/configuration | HeroIcons cog |
| `filter` | Filter actions | HeroIcons funnel |
| `share` | Share actions | HeroIcons share |
| `search` | Search actions | HeroIcons magnifying-glass |
| `menu` | Menu/hamburger | HeroIcons bars-3 |
| `run` | Execute/play | HeroIcons play (solid) |
| `check` | Confirm/check | HeroIcons check (solid) |
| `link` | Link/connect | HeroIcons link |
| `eye` | Show/visible | HeroIcons eye |
| `eyeOff` | Hide/invisible | HeroIcons eye-slash |
| `adjustments` | Adjustments | HeroIcons adjustments-horizontal |
| `desktop` | Desktop/display | HeroIcons computer-desktop |
| `table` | Table/grid | HeroIcons table-cells |

### Field Type Icons

Icons for semantic field types in the Query Builder:

| Name | Description | Default |
|------|-------------|---------|
| `measure` | Measure fields | HeroIcons chart-bar (solid) |
| `dimension` | Dimension fields | HeroIcons tag (solid) |
| `timeDimension` | Time dimension fields | HeroIcons calendar (solid) |
| `segment` | Segment fields | HeroIcons rectangle-group (solid) |

### Chart Type Icons

Icons for chart type selection:

| Name | Description | Default |
|------|-------------|---------|
| `chartBar` | Bar chart | Tabler chart-bar |
| `chartLine` | Line chart | Tabler chart-line |
| `chartArea` | Area chart | Tabler chart-area-line |
| `chartPie` | Pie chart | Tabler chart-pie |
| `chartScatter` | Scatter plot | Tabler chart-dots-2 |
| `chartBubble` | Bubble chart | Tabler chart-bubble |
| `chartRadar` | Radar chart | Tabler chart-radar |
| `chartRadialBar` | Radial bar chart | Tabler radar-2 |
| `chartTreemap` | Treemap | Tabler chart-treemap |
| `chartTable` | Data table | Tabler table |
| `chartActivityGrid` | Activity grid | Tabler calendar-stats |
| `chartKpiNumber` | KPI number | Tabler number |
| `chartKpiDelta` | KPI delta/trend | Tabler trending-up |
| `chartKpiText` | KPI text | Tabler typography |
| `chartMarkdown` | Markdown | Tabler file-text |

### Measure Type Icons

Icons for different measure aggregation types:

| Name | Description | Default |
|------|-------------|---------|
| `measureCount` | Count aggregation | HeroIcons bars-3-bottom-left (solid) |
| `measureCountDistinct` | Count distinct | HeroIcons finger-print (solid) |
| `measureCountDistinctApprox` | Approximate count distinct | HeroIcons chart-bar-square (solid) |
| `measureSum` | Sum aggregation | HeroIcons plus-circle (solid) |
| `measureAvg` | Average aggregation | HeroIcons scale (solid) |
| `measureMin` | Minimum value | HeroIcons arrow-down-circle (solid) |
| `measureMax` | Maximum value | HeroIcons arrow-up-circle (solid) |
| `measureRunningTotal` | Running total | HeroIcons arrow-trending-up (solid) |
| `measureCalculated` | Calculated measure | HeroIcons beaker (solid) |
| `measureNumber` | Numeric value | HeroIcons hashtag (solid) |

### State Icons

Icons for status and state indicators:

| Name | Description | Default |
|------|-------------|---------|
| `success` | Success state | HeroIcons check-circle |
| `warning` | Warning state | HeroIcons exclamation-triangle |
| `error` | Error state | HeroIcons exclamation-circle |
| `info` | Information | Tabler info-circle |
| `loading` | Loading state | HeroIcons arrow-path |
| `sparkles` | AI/special feature | HeroIcons sparkles |

### Navigation Icons

Icons for navigation and direction:

| Name | Description | Default |
|------|-------------|---------|
| `chevronUp` | Collapse/up | HeroIcons chevron-up |
| `chevronDown` | Expand/down | HeroIcons chevron-down |
| `chevronLeft` | Previous/left | HeroIcons chevron-left |
| `chevronRight` | Next/right | HeroIcons chevron-right |
| `chevronUpDown` | Sort/reorder | Tabler selector |
| `arrowUp` | Arrow up | HeroIcons arrow-up-circle (solid) |
| `arrowDown` | Arrow down | HeroIcons arrow-down-circle (solid) |
| `arrowRight` | Arrow right | HeroIcons arrow-right |
| `arrowPath` | Circular path | HeroIcons arrow-path |

## Icon Customization

### Override a Single Icon

```tsx
import { setIcon } from 'drizzle-cube/client'
import myCustomIcon from '@iconify-icons/mdi/account'

// Override a single icon
setIcon('close', myCustomIcon)
```

### Override Multiple Icons

```tsx
import { registerIcons } from 'drizzle-cube/client'
import closeIcon from '@iconify-icons/mdi/close'
import addIcon from '@iconify-icons/mdi/plus'
import editIcon from '@iconify-icons/mdi/pencil'

// Override multiple icons at once
registerIcons({
  close: closeIcon,
  add: addIcon,
  edit: editIcon
})
```

### Using Different Icon Libraries

Drizzle Cube uses Iconify, which provides access to many icon libraries. Here are examples using different libraries:

```tsx
import { registerIcons } from 'drizzle-cube/client'

// Material Design Icons
import mdiClose from '@iconify-icons/mdi/close'
import mdiPlus from '@iconify-icons/mdi/plus'

// Feather Icons
import featherX from '@iconify-icons/feather/x'
import featherPlus from '@iconify-icons/feather/plus'

// Lucide Icons
import lucideX from '@iconify-icons/lucide/x'
import lucidePlus from '@iconify-icons/lucide/plus'

// Carbon Icons
import carbonClose from '@iconify-icons/carbon/close'
import carbonAdd from '@iconify-icons/carbon/add'

// Use whichever library matches your design system
registerIcons({
  close: mdiClose,
  add: mdiPlus
})
```

### Reset to Default Icons

```tsx
import { resetIcons } from 'drizzle-cube/client'

// Reset all icons to their defaults
resetIcons()
```

## Helper Functions

### Get Icons by Category

```tsx
import { getIconsByCategory } from 'drizzle-cube/client'

// Get all action icons
const actionIcons = getIconsByCategory('action')
// Returns: { close: Component, add: Component, edit: Component, ... }

// Get all chart icons
const chartIcons = getIconsByCategory('chart')
// Returns: { chartBar: Component, chartLine: Component, ... }
```

### Get Measure Type Icon

A convenience function for getting measure type icons:

```tsx
import { getMeasureTypeIcon } from 'drizzle-cube/client'

// Get icon for a measure type
const CountIcon = getMeasureTypeIcon('count')
const AvgIcon = getMeasureTypeIcon('avg')
const SumIcon = getMeasureTypeIcon('sum')

function MeasureLabel({ type, label }) {
  const Icon = getMeasureTypeIcon(type)
  return (
    <span>
      <Icon className="w-4 h-4 inline" />
      {label}
    </span>
  )
}
```

### Get Chart Type Icon

A convenience function for getting chart type icons:

```tsx
import { getChartTypeIcon } from 'drizzle-cube/client'

// Get icon for a chart type
const BarIcon = getChartTypeIcon('bar')
const LineIcon = getChartTypeIcon('line')
const PieIcon = getChartTypeIcon('pie')

function ChartSelector({ types }) {
  return (
    <div>
      {types.map(type => {
        const Icon = getChartTypeIcon(type)
        return (
          <button key={type}>
            <Icon className="w-5 h-5" />
            {type}
          </button>
        )
      })}
    </div>
  )
}
```

### Get Field Type Icon

A convenience function for getting field type icons:

```tsx
import { getFieldTypeIcon } from 'drizzle-cube/client'

// Get icon for a field type
const MeasureIcon = getFieldTypeIcon('measure')
const DimensionIcon = getFieldTypeIcon('dimension')
const TimeIcon = getFieldTypeIcon('timeDimension')
```

## TypeScript Support

All icon functions and types are fully typed:

```tsx
import type {
  IconName,
  IconCategory,
  IconRegistry,
  IconProps
} from 'drizzle-cube/client'

// IconName is a union of all valid icon names
const iconName: IconName = 'close' // ✓ Valid
const invalidName: IconName = 'invalid' // ✗ Type error

// IconCategory for filtering
const category: IconCategory = 'action' // ✓ Valid

// IconProps for custom icon components
interface MyIconProps extends IconProps {
  size?: 'sm' | 'md' | 'lg'
}
```

## API Reference

### `getIcon(name: IconName): ComponentType<IconProps>`

Returns a React component for the specified icon.

```tsx
const CloseIcon = getIcon('close')
<CloseIcon className="w-4 h-4" aria-hidden="true" />
```

### `getIconData(name: IconName): IconifyIcon`

Returns the raw Iconify icon data for use with the Iconify `Icon` component directly.

```tsx
import { Icon } from '@iconify/react'
import { getIconData } from 'drizzle-cube/client'

const closeData = getIconData('close')
<Icon icon={closeData} className="w-4 h-4" />
```

### `setIcon(name: IconName, icon: IconifyIcon): void`

Override a single icon in the registry.

```tsx
import myIcon from '@iconify-icons/mdi/close'
setIcon('close', myIcon)
```

### `registerIcons(overrides: PartialIconRegistry): void`

Override multiple icons at once.

```tsx
registerIcons({
  close: myCloseIcon,
  add: myAddIcon
})
```

### `resetIcons(): void`

Reset all icons to their default values.

### `getIconRegistry(): IconRegistry`

Get the complete icon registry object.

### `getIconsByCategory(category: IconCategory): Record<string, ComponentType>`

Get all icons in a specific category.

### `getMeasureTypeIcon(measureType: string): ComponentType<IconProps>`

Get the icon for a measure aggregation type.

### `getChartTypeIcon(chartType: string): ComponentType<IconProps>`

Get the icon for a chart type.

### `getFieldTypeIcon(fieldType: string): ComponentType<IconProps>`

Get the icon for a field type (measure, dimension, timeDimension).

## Integration with Theming

Icons work seamlessly with the Drizzle Cube theming system. Icon colors are controlled by the text color of their container:

```tsx
// Icons inherit text color from their container
<div className="text-dc-text">
  <CloseIcon className="w-4 h-4" /> {/* Uses --dc-text color */}
</div>

<div className="text-dc-primary">
  <AddIcon className="w-4 h-4" /> {/* Uses --dc-primary color */}
</div>

<div className="text-dc-success">
  <CheckIcon className="w-4 h-4" /> {/* Uses --dc-success color */}
</div>
```

## Best Practices

### 1. Initialize Icons Early

Override icons before rendering components to avoid visual inconsistency:

```tsx
// In your app's entry point
import { registerIcons } from 'drizzle-cube/client'
import { myIcons } from './icons'

// Register before rendering
registerIcons(myIcons)

// Then render your app
ReactDOM.render(<App />, root)
```

### 2. Use Semantic Names

When creating a custom icon set, map icons by their semantic meaning rather than their visual appearance:

```tsx
// Good - semantic mapping
registerIcons({
  success: checkCircleIcon,  // What it represents
  error: alertCircleIcon
})

// Avoid - visual mapping
registerIcons({
  greenCircle: checkCircleIcon,  // What it looks like
  redCircle: alertCircleIcon
})
```

### 3. Maintain Consistency

Use icons from a single icon library for visual consistency:

```tsx
// Good - consistent library
import deleteIcon from '@iconify-icons/mdi/delete'
import editIcon from '@iconify-icons/mdi/pencil'
import addIcon from '@iconify-icons/mdi/plus'

// Avoid - mixed libraries
import deleteIcon from '@iconify-icons/mdi/delete'
import editIcon from '@iconify-icons/feather/edit'
import addIcon from '@iconify-icons/lucide/plus'
```

### 4. Consider Accessibility

Always provide appropriate ARIA attributes:

```tsx
// Decorative icons (accompanying text)
<button>
  <AddIcon className="w-4 h-4" aria-hidden="true" />
  Add Item
</button>

// Icon-only buttons (needs label)
<button aria-label="Close">
  <CloseIcon className="w-4 h-4" />
</button>
```

## Installing Additional Icon Packages

To use icons from a specific library, install the corresponding Iconify package:

```bash
# Material Design Icons
npm install @iconify-icons/mdi

# Feather Icons
npm install @iconify-icons/feather

# Lucide Icons
npm install @iconify-icons/lucide

# Carbon Icons
npm install @iconify-icons/carbon

# Tabler Icons (already included)
npm install @iconify-icons/tabler

# Font Awesome
npm install @iconify-icons/fa-solid @iconify-icons/fa-regular
```

Browse available icons at [icon-sets.iconify.design](https://icon-sets.iconify.design/).

## Example: Complete Icon Override

Here's a complete example overriding all action icons with Material Design Icons:

```tsx
import { registerIcons } from 'drizzle-cube/client'

// Import MDI icons
import mdiClose from '@iconify-icons/mdi/close'
import mdiPlus from '@iconify-icons/mdi/plus'
import mdiPencil from '@iconify-icons/mdi/pencil'
import mdiDelete from '@iconify-icons/mdi/delete'
import mdiRefresh from '@iconify-icons/mdi/refresh'
import mdiContentCopy from '@iconify-icons/mdi/content-copy'
import mdiContentDuplicate from '@iconify-icons/mdi/content-duplicate'
import mdiCog from '@iconify-icons/mdi/cog'
import mdiFilter from '@iconify-icons/mdi/filter'
import mdiShare from '@iconify-icons/mdi/share'
import mdiMagnify from '@iconify-icons/mdi/magnify'
import mdiMenu from '@iconify-icons/mdi/menu'

// Register all overrides
registerIcons({
  close: mdiClose,
  add: mdiPlus,
  edit: mdiPencil,
  delete: mdiDelete,
  refresh: mdiRefresh,
  copy: mdiContentCopy,
  duplicate: mdiContentDuplicate,
  settings: mdiCog,
  filter: mdiFilter,
  share: mdiShare,
  search: mdiMagnify,
  menu: mdiMenu
})
```

This icon system gives you complete control over the visual appearance of Drizzle Cube components while maintaining consistency and accessibility.
