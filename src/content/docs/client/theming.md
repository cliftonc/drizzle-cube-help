---
title: Theming
---

Drizzle Cube provides a comprehensive theming system that allows you to customize the appearance of all client components. The theming system supports light mode, dark mode, and even custom themes like the built-in neon theme.

## Theme System Overview

Drizzle Cube uses CSS custom properties (variables) prefixed with `--dc-` for all theming. This approach allows you to:

- Switch between built-in themes (light, dark, neon)
- Create custom themes by overriding CSS variables
- Integrate with parent application themes (including DaisyUI)
- Support system preference detection
- Persist user theme preferences

## Quick Start

### Basic Theme Switching

The simplest way to implement theming is to use the built-in theme functions:

```tsx
import { getTheme, setTheme, watchThemeChanges } from '@drizzle-cube/client'

// Get the current theme
const currentTheme = getTheme() // Returns: 'light' | 'dark' | 'neon'

// Set a theme
setTheme('dark') // Switches to dark theme

// Watch for theme changes
const unwatch = watchThemeChanges((theme) => {
  console.log('Theme changed to:', theme)
})

// Clean up the watcher when done
unwatch()
```

### Theme Toggle Component Example

Here's a complete example of a theme toggle component:

```tsx
import { useEffect, useState } from 'react'
import { getTheme, setTheme, watchThemeChanges, type Theme } from '@drizzle-cube/client'

export default function ThemeToggle() {
  const [currentTheme, setCurrentTheme] = useState<Theme>('light')

  useEffect(() => {
    // Initialize theme state
    setCurrentTheme(getTheme())

    // Watch for theme changes from other sources
    const unwatch = watchThemeChanges((theme) => {
      setCurrentTheme(theme)
    })

    return unwatch
  }, [])

  const toggleTheme = () => {
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
  }

  return (
    <button onClick={toggleTheme}>
      {currentTheme === 'light' ? '🌙 Dark' : '☀️ Light'}
    </button>
  )
}
```

## Built-in Themes

### Light Theme (Default)

The default theme with clean, professional colors suitable for most applications.

```tsx
setTheme('light')
```

**Key characteristics:**
- White surfaces with subtle gray backgrounds
- Dark text on light backgrounds
- Blue primary colors
- Excellent readability

### Dark Theme

A modern dark theme with reduced eye strain for low-light environments.

```tsx
setTheme('dark')
```

**Key characteristics:**
- Slate dark backgrounds
- Light text on dark surfaces
- Lighter blue primary colors
- Reduced contrast for comfort

### Neon Theme

A bold, vibrant theme with fluorescent colors for a modern, eye-catching look.

```tsx
setTheme('neon')
```

**Key characteristics:**
- Deep purple-black backgrounds
- Electric cyan and magenta accents
- Bright neon borders and highlights
- Glow effects on shadows

## Custom Theming

### Using CSS Variables

You can customize any theme by overriding the CSS custom properties in your application's CSS:

```css
/* Custom theme in your app's CSS */
:root {
  --dc-primary: #ff6b6b;
  --dc-primary-hover: #ee5a52;
  --dc-surface: #ffffff;
  --dc-text: #2d3748;
}

/* Custom dark theme variant */
[data-theme="dark"] {
  --dc-primary: #ffa5a5;
  --dc-primary-hover: #ff8787;
  --dc-surface: #1a202c;
  --dc-text: #f7fafc;
}
```

### Programmatic Theme Customization

Use the `applyTheme` function to apply a custom theme configuration:

```tsx
import { applyTheme, type ThemeConfig } from '@drizzle-cube/client'

const customTheme: ThemeConfig = {
  name: 'corporate',
  colors: {
    primary: '#0066cc',
    primaryHover: '#0052a3',
    surface: '#ffffff',
    surfaceSecondary: '#f5f7fa',
    text: '#1a1a1a',
    textSecondary: '#4a4a4a',
    border: '#e0e0e0',
  }
}

applyTheme(customTheme)
```

### Using Theme Presets

Drizzle Cube exports preset configurations you can use as a starting point:

```tsx
import { THEME_PRESETS, applyTheme } from '@drizzle-cube/client'

// Apply a preset
applyTheme(THEME_PRESETS.dark)

// Extend a preset
const myTheme = {
  ...THEME_PRESETS.dark,
  colors: {
    ...THEME_PRESETS.dark.colors,
    primary: '#ff00ff', // Override specific colors
  }
}
applyTheme(myTheme)
```

## Theme Variables Reference

### Surface Colors

Background colors for cards, modals, and panels:

| Variable | Description |
|----------|-------------|
| `--dc-surface` | Primary surface background |
| `--dc-surface-secondary` | Secondary surface background |
| `--dc-surface-tertiary` | Tertiary surface background |
| `--dc-surface-hover` | Hover state for surfaces |

### Text Colors

Text colors at various emphasis levels:

| Variable | Description |
|----------|-------------|
| `--dc-text` | Primary text color |
| `--dc-text-secondary` | Secondary text color |
| `--dc-text-muted` | Muted text color |
| `--dc-text-disabled` | Disabled text color |

### Border Colors

Colors for dividers, outlines, and borders:

| Variable | Description |
|----------|-------------|
| `--dc-border` | Primary border color |
| `--dc-border-secondary` | Secondary border color |
| `--dc-border-hover` | Hover state for borders |

### Primary Colors

Main interactive element colors:

| Variable | Description |
|----------|-------------|
| `--dc-primary` | Primary action color |
| `--dc-primary-hover` | Hover state for primary |
| `--dc-primary-content` | Text color on primary background |

### Semantic State Colors

Colors for success, warning, error, and info states:

| Variable | Description |
|----------|-------------|
| `--dc-success` | Success state color |
| `--dc-success-bg` | Success background color |
| `--dc-success-border` | Success border color |
| `--dc-warning` | Warning state color |
| `--dc-warning-bg` | Warning background color |
| `--dc-warning-border` | Warning border color |
| `--dc-error` | Error state color |
| `--dc-error-bg` | Error background color |
| `--dc-error-border` | Error border color |
| `--dc-info` | Info state color |
| `--dc-info-bg` | Info background color |
| `--dc-info-border` | Info border color |

### Danger Colors

Colors for destructive actions:

| Variable | Description |
|----------|-------------|
| `--dc-danger` | Danger action color |
| `--dc-danger-hover` | Hover state for danger |
| `--dc-danger-bg` | Danger background color |

### Overlay Colors

Colors for modal backdrops and overlays:

| Variable | Description |
|----------|-------------|
| `--dc-overlay` | Primary overlay color |
| `--dc-overlay-light` | Light overlay color |

### Field Type Colors

Colors for semantic field type badges in the Query Builder:

| Variable | Description |
|----------|-------------|
| `--dc-dimension-bg` | Dimension badge background |
| `--dc-dimension-text` | Dimension badge text |
| `--dc-dimension-border` | Dimension badge border |
| `--dc-time-dimension-bg` | Time dimension badge background |
| `--dc-time-dimension-text` | Time dimension badge text |
| `--dc-time-dimension-border` | Time dimension badge border |
| `--dc-measure-bg` | Measure badge background |
| `--dc-measure-text` | Measure badge text |
| `--dc-measure-border` | Measure badge border |

### Shadow Variables

Pre-configured shadow styles for elevation:

| Variable | Description |
|----------|-------------|
| `--dc-shadow-sm` | Small shadow |
| `--dc-shadow` | Default shadow |
| `--dc-shadow-md` | Medium shadow |
| `--dc-shadow-lg` | Large shadow |
| `--dc-shadow-xl` | Extra large shadow |
| `--dc-shadow-2xl` | 2X large shadow |

## Advanced Features

### System Preference Detection

Drizzle Cube automatically detects the user's system color scheme preference:

```tsx
// The getTheme() function checks in this order:
// 1. localStorage saved preference
// 2. data-theme attribute
// 3. .dark or .neon class on html/body
// 4. System preference (prefers-color-scheme)
// 5. Defaults to 'light'

const theme = getTheme()
```

### Watching Theme Changes

Monitor theme changes from any source (user action, system preference change, etc.):

```tsx
import { watchThemeChanges } from '@drizzle-cube/client'

const unwatch = watchThemeChanges((newTheme) => {
  console.log('Theme changed to:', newTheme)
  // Update your app state, analytics, etc.
})

// Remember to clean up
unwatch()
```

### Persisting Theme Preference

Theme preferences are automatically saved to `localStorage`:

```tsx
import { setTheme } from '@drizzle-cube/client'

// This will save 'dark' to localStorage
setTheme('dark')

// On next page load, getTheme() will return 'dark'
```

### Resetting to Defaults

Remove all custom theme properties and reset to the built-in theme:

```tsx
import { resetTheme } from '@drizzle-cube/client'

// Removes all --dc-* custom properties from inline styles
resetTheme()
```

### Reading Current Theme Variables

Get the current value of any theme variable:

```tsx
import { getThemeVariable } from '@drizzle-cube/client'

const primaryColor = getThemeVariable('primary')
// Returns the computed value, e.g., '#3b82f6'
```

### Setting Individual Variables

Set specific theme variables programmatically:

```tsx
import { setThemeVariable } from '@drizzle-cube/client'

setThemeVariable('primary', '#ff00ff')
setThemeVariable('surface', '#ffffff')
```

## Integration with Parent Applications

### DaisyUI Integration

If your application uses DaisyUI, you can map Drizzle Cube theme variables to DaisyUI's theme system:

```css
/* In your app's CSS */
:root {
  --dc-surface: var(--color-base-100);
  --dc-surface-secondary: var(--color-base-200);
  --dc-surface-tertiary: var(--color-base-300);
  --dc-text: var(--color-base-content);
  --dc-primary: var(--color-primary);
  --dc-primary-hover: var(--color-primary-focus);
  --dc-success: var(--color-success);
  --dc-warning: var(--color-warning);
  --dc-error: var(--color-error);
  --dc-info: var(--color-info);
}
```

### Tailwind CSS Integration

Drizzle Cube exports Tailwind utility classes for theme variables:

```tsx
<div className="bg-dc-surface border-dc-border text-dc-text">
  <h1 className="text-dc-text-secondary">Title</h1>
  <button className="bg-dc-primary hover:bg-dc-primary-hover">
    Click me
  </button>
</div>
```

Available utility classes:
- Background: `bg-dc-surface`, `bg-dc-surface-secondary`, `bg-dc-surface-tertiary`
- Text: `text-dc-text`, `text-dc-text-secondary`, `text-dc-text-muted`
- Border: `border-dc-border`, `border-dc-border-secondary`
- Hover: `hover:bg-dc-surface-hover`, `hover:border-dc-border-hover`
- Field types: `bg-dc-dimension`, `text-dc-dimension`, `border-dc-dimension`, etc.

### Custom Theme Sync

Sync Drizzle Cube themes with your application's theme system:

```tsx
import { watchThemeChanges, setTheme } from '@drizzle-cube/client'

// Watch your app's theme changes
appTheme.onChange((theme) => {
  // Map your theme to Drizzle Cube theme
  if (theme === 'dark') {
    setTheme('dark')
  } else {
    setTheme('light')
  }
})

// Watch Drizzle Cube theme changes
watchThemeChanges((dcTheme) => {
  // Update your app's theme system
  appTheme.set(dcTheme)
})
```

## TypeScript Support

All theme functions and types are fully typed:

```tsx
import type { Theme, ThemeConfig, ThemeColorTokens } from '@drizzle-cube/client'

// Theme type is a union of valid theme names
const myTheme: Theme = 'dark' // ✓ Valid
const invalidTheme: Theme = 'purple' // ✗ Type error

// ThemeConfig for custom themes
const config: ThemeConfig = {
  name: 'custom',
  colors: {
    primary: '#ff0000',
    surface: '#ffffff',
    // All colors are optional and typed
  }
}

// ThemeColorTokens for complete color definitions
const colors: ThemeColorTokens = {
  surface: '#ffffff',
  surfaceSecondary: '#f9fafb',
  surfaceTertiary: '#f3f4f6',
  surfaceHover: '#f3f4f6',
  text: '#111827',
  textSecondary: '#374151',
  textMuted: '#6b7280',
  textDisabled: '#9ca3af',
  // ... all other color tokens
}
```

## Best Practices

### 1. Initialize Theme Early

Set the theme as early as possible to avoid flash of unstyled content:

```tsx
// In your app's entry point or root component
import { useEffect } from 'react'
import { getTheme, setTheme } from '@drizzle-cube/client'

export function App() {
  useEffect(() => {
    // This will read from localStorage or system preference
    const savedTheme = getTheme()
    setTheme(savedTheme)
  }, [])

  return <YourApp />
}
```

### 2. Provide User Control

Always give users control over the theme:

```tsx
<ThemeToggle />
{/* or */}
<select onChange={(e) => setTheme(e.target.value as Theme)}>
  <option value="light">Light</option>
  <option value="dark">Dark</option>
  <option value="neon">Neon</option>
</select>
```

### 3. Respect System Preferences

Consider respecting the user's system preferences by default:

```tsx
import { getTheme, setTheme } from '@drizzle-cube/client'

// On app load
const theme = getTheme() // Automatically checks system preference
if (!localStorage.getItem('theme')) {
  // User hasn't explicitly chosen, respect system
  setTheme(theme)
}
```

### 4. Use Semantic Variables

When customizing, use the semantic variable names rather than hardcoding colors in components:

```css
/* Good - uses theme variables */
.my-component {
  background-color: var(--dc-surface);
  color: var(--dc-text);
  border: 1px solid var(--dc-border);
}

/* Avoid - hardcoded colors won't respond to theme changes */
.my-component {
  background-color: #ffffff;
  color: #111827;
  border: 1px solid #e5e7eb;
}
```

### 5. Test All Themes

When creating custom themes, test all components in each theme mode to ensure good contrast and readability.

## Migration Guide

### From Legacy `isDarkMode()`

If you're using the deprecated `isDarkMode()` function:

```tsx
// Old way (deprecated)
import { isDarkMode } from '@drizzle-cube/client'
const dark = isDarkMode()

// New way
import { getTheme } from '@drizzle-cube/client'
const theme = getTheme()
const dark = theme === 'dark' || theme === 'neon'
```

### Adding Theme Support to Existing Apps

If you're adding theming to an existing Drizzle Cube integration:

1. Import the theme utilities:
   ```tsx
   import { getTheme, setTheme, watchThemeChanges } from '@drizzle-cube/client'
   ```

2. Create a theme toggle component (see example above)

3. Initialize the theme on app load:
   ```tsx
   useEffect(() => {
     setTheme(getTheme())
   }, [])
   ```

4. Replace any hardcoded colors with theme variables

## Examples

### Complete Theme System Implementation

```tsx
import { useState, useEffect } from 'react'
import {
  getTheme,
  setTheme,
  watchThemeChanges,
  type Theme,
  CubeProvider,
  AnalyticsDashboard
} from '@drizzle-cube/client'

export function ThemedDashboardApp() {
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    // Initialize theme
    const currentTheme = getTheme()
    setTheme(currentTheme)
    setThemeState(currentTheme)

    // Watch for changes
    const unwatch = watchThemeChanges((newTheme) => {
      setThemeState(newTheme)
    })

    return unwatch
  }, [])

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
  }

  return (
    <div className="app">
      <header>
        <h1>My Analytics Dashboard</h1>
        <select
          value={theme}
          onChange={(e) => handleThemeChange(e.target.value as Theme)}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="neon">Neon</option>
        </select>
      </header>

      <CubeProvider apiUrl="/api/cube">
        <AnalyticsDashboard
          dashboardId="sales"
          layout={{ lg: [...], md: [...], sm: [...], xs: [...] }}
        />
      </CubeProvider>
    </div>
  )
}
```

### Custom Brand Theme

```tsx
import { applyTheme, type ThemeConfig } from '@drizzle-cube/client'

// Define your brand colors
const brandTheme: ThemeConfig = {
  name: 'brand',
  colors: {
    // Brand colors
    primary: '#6366f1',        // Indigo
    primaryHover: '#4f46e5',
    primaryContent: '#ffffff',

    // Light mode surfaces
    surface: '#ffffff',
    surfaceSecondary: '#f8fafc',
    surfaceTertiary: '#f1f5f9',

    // Text colors
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',

    // Border colors
    border: '#e2e8f0',
    borderSecondary: '#cbd5e1',

    // Semantic colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  }
}

// Apply on app load
applyTheme(brandTheme)
```

This comprehensive theming system gives you complete control over the appearance of Drizzle Cube components while maintaining consistency and accessibility across all themes.
