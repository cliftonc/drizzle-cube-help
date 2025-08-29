---
title: Charts
---

Drizzle Cube provides a comprehensive set of chart components for data visualization in your analytics dashboards. All charts are designed to work seamlessly with Cube.js-compatible data and provide interactive, responsive visualizations.

## Available Chart Types

### Bar Chart

Compare values across categories

![Bar Chart](/charts/bar.png)

**Use Case:** Best for comparing discrete categories, showing rankings, or displaying changes over time

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| showLegend | boolean | Show/hide chart legend |
| showGrid | boolean | Show/hide grid lines |
| showTooltip | boolean | Show/hide hover tooltips |
| stacked | boolean | Stack bars for grouped data |

---

### Line Chart

Show trends and changes over time

![Line Chart](/charts/line.png)

**Use Case:** Best for continuous data, trends, time series, and showing relationships between multiple series

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| showLegend | boolean | Show/hide chart legend |
| showGrid | boolean | Show/hide grid lines |
| showTooltip | boolean | Show/hide hover tooltips |

---

### Area Chart

Emphasize magnitude of change over time

![Area Chart](/charts/area.png)

**Use Case:** Best for showing cumulative totals, volume changes, or stacked comparisons over time

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| showLegend | boolean | Show/hide chart legend |
| showGrid | boolean | Show/hide grid lines |
| showTooltip | boolean | Show/hide hover tooltips |
| stacked | boolean | Stack areas for grouped data |

---

### Pie Chart

Show proportions of a whole

![Pie Chart](/charts/pie.png)

**Use Case:** Best for showing percentage distribution or composition of a total (limit to 5-7 slices)

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| showLegend | boolean | Show/hide chart legend |
| showTooltip | boolean | Show/hide hover tooltips |

---

### Scatter Chart

Reveal correlations between variables

![Scatter Chart](/charts/scatter.png)

**Use Case:** Best for identifying patterns, correlations, outliers, and relationships between two measures

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| showLegend | boolean | Show/hide chart legend |
| showGrid | boolean | Show/hide grid lines |
| showTooltip | boolean | Show/hide hover tooltips |

---

### Radar Chart

Compare multiple metrics across categories

![Radar Chart](/charts/radar.png)

**Use Case:** Best for multivariate comparisons, performance metrics, strengths/weaknesses analysis

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| showLegend | boolean | Show/hide chart legend |
| showGrid | boolean | Show/hide grid lines |
| showTooltip | boolean | Show/hide hover tooltips |

---

### Radial Bar Chart

Circular progress and KPI visualization

![Radial Bar Chart](/charts/radial.png)

**Use Case:** Best for showing progress toward goals, KPIs, or comparing percentages in a compact form

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| showLegend | boolean | Show/hide chart legend |
| showTooltip | boolean | Show/hide hover tooltips |

---

### Tree Map Chart

Visualize hierarchical data with nested rectangles

![Tree Map Chart](/charts/treemap.png)

**Use Case:** Best for showing part-to-whole relationships in hierarchical data, disk usage, budget allocation

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| showLegend | boolean | Show/hide chart legend |
| showTooltip | boolean | Show/hide hover tooltips |

---

### Bubble Chart

Compare three dimensions of data

![Bubble Chart](/charts/bubble.png)

**Use Case:** Best for showing relationships between three variables (X, Y, and size), market analysis

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| showLegend | boolean | Show/hide chart legend |
| showGrid | boolean | Show/hide grid lines |
| showTooltip | boolean | Show/hide hover tooltips |
| minBubbleSize | number | Minimum bubble size |
| maxBubbleSize | number | Maximum bubble size |
| bubbleOpacity | number | Transparency of bubbles |

---

### Activity Grid Chart

GitHub-style activity grid showing temporal patterns

![Activity Grid Chart](/charts/activity.png)

**Use Case:** Best for visualizing activity patterns over time, contribution calendars, and temporal heatmaps

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| showLabels | boolean | Show/hide date labels |
| showTooltip | boolean | Show/hide hover tooltips |
| colorIntensity | string | Intensity of color coding |

---

### Data Table

Display detailed tabular data

![Data Table](/charts/table.png)

**Use Case:** Best for precise values, detailed analysis, sortable/filterable data exploration

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| (No display options) | | |

---

### KPI Number

Display key performance indicators as large numbers

![KPI Number](/charts/kpi_number.png)

**Use Case:** Perfect for showing important metrics like revenue, user count, or other key business metrics in a prominent, easy-to-read format

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| prefix | string | Text to display before the number |
| suffix | string | Text to display after the number |
| decimals | number | Number of decimal places to display |
| valueColorIndex | number | Color from dashboard palette for the KPI value |

---

### KPI Text

Display key performance indicators as customizable text

![KPI Text](/charts/kpi_text.png)

**Use Case:** Perfect for showing metrics with custom formatting, combining multiple values, or displaying contextual KPI information using templates

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| template | string | Template for displaying text. Use ${value} to insert measure value |
| decimals | number | Number of decimal places to display for numeric values |
| valueColorIndex | number | Color from dashboard palette for the KPI value text |

---

### Markdown Chart

Display custom markdown content with formatting

![Markdown Chart](/charts/markdown.png)

**Use Case:** Perfect for adding documentation, notes, instructions, or formatted text to dashboards

**Display Options:**

| Option | Type | Description |
|--------|------|-------------|
| content | string | Markdown text content |
| accentColorIndex | number | Color from dashboard palette for headers, bullets, and links |
| fontSize | string | Overall text size (small, medium, large) |
| alignment | string | Horizontal alignment (left, center, right) |

