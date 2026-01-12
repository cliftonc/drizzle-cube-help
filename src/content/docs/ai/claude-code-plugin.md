---
title: Claude Code Plugin
description: Use natural language to query your Drizzle Cube semantic layer directly from Claude Code
---

The Drizzle Cube plugin for [Claude Code](https://claude.ai/code) lets you query your semantic layer using natural language. Ask questions like "show me revenue by region" and get real results, validated queries, and dashboard configurations.

## Installation

Install the plugin from the Claude Code marketplace:

```bash
claude /install-plugin github:cliftonc/drizzle-cube-plugin
```

Or add it manually to your Claude Code settings.

## Configuration

The plugin needs to know where your Drizzle Cube API is running. Create a `.drizzle-cube.json` file in your project:

```json
{
  "apiUrl": "http://localhost:4000/cubejs-api/v1",
  "apiToken": "your-optional-api-token"
}
```

Or use the setup command:

```
/dc-setup
```

### Configuration Priority

The plugin reads configuration in this order:
1. `.drizzle-cube.json` in current project directory
2. `~/.drizzle-cube/config.json` (global)
3. Environment variables (`DRIZZLE_CUBE_API_URL`, `DRIZZLE_CUBE_API_TOKEN`)

## Available Commands

| Command | Description |
|---------|-------------|
| `/dc-query` | Build and execute semantic queries with natural language |
| `/dc-debug` | Debug a query - validate, show SQL, explain plan |
| `/dc-setup` | Configure API URL and authentication |
| `/dc-create-cube` | Generate a new cube definition from a Drizzle table |
| `/dc-create-dashboard` | Create a dashboard configuration |
| `/dc-add-chart` | Add a chart to an existing dashboard |

## MCP Tools

The plugin provides these tools via the Model Context Protocol:

| Tool | Purpose |
|------|---------|
| `drizzle_cube_meta` | Fetch all cubes, measures, dimensions, relationships |
| `drizzle_cube_load` | Execute a query and return results |
| `drizzle_cube_dry_run` | Validate query and preview generated SQL |
| `drizzle_cube_explain` | Get query execution plan for performance analysis |
| `drizzle_cube_batch` | Execute multiple queries in parallel |
| `drizzle_cube_config` | Check current configuration status |

## Usage Examples

### Query with Natural Language

```
/dc-query show me average happiness by department for the last 3 months
```

Claude will:
1. Fetch available cubes from your API
2. Build the appropriate query
3. Validate it with a dry-run
4. Execute and show results

### Debug a Query

```
/dc-debug {"measures": ["Sales.revenue"], "dimensions": ["Products.category"]}
```

Returns:
- Validation status
- Generated SQL
- Execution plan
- Performance recommendations

### Create a Dashboard

```
/dc-create-dashboard Sales Overview
```

Claude will ask about your metrics and generate a complete `DashboardConfig` with KPIs, charts, and tables.

## Example Conversation

**You:** Show me total employees and average salary by department

**Claude:** *Uses `drizzle_cube_meta` to find available cubes, then builds query:*

```typescript
{
  measures: ['Employees.count', 'Employees.avgSalary'],
  dimensions: ['Departments.name']
}
```

*Validates with `drizzle_cube_dry_run`, then executes with `drizzle_cube_load`:*

| Department | Total Employees | Average Salary |
|------------|-----------------|----------------|
| Engineering | 45 | $125,000 |
| Sales | 32 | $85,000 |
| Marketing | 18 | $78,000 |

## Skills (Reference Documentation)

The plugin also includes reference skills that Claude can use for detailed information:

| Skill | Description |
|-------|-------------|
| `dc-query-building` | CubeQuery structure, filters, time dimensions |
| `dc-analysis-config` | AnalysisConfig for dashboards and persistence |
| `dc-chart-config` | Chart types, axis mapping, display options |
| `dc-cube-definition` | How to define cubes with measures and dimensions |
| `dc-dashboard-config` | Dashboard layout, portlets, filters |

## Requirements

- **Claude Code** - [Install Claude Code](https://claude.ai/code)
- **Running Drizzle Cube API** - Your semantic layer must be accessible
- **Node.js 18+** - For the MCP server

## Troubleshooting

### "MCP tools not available"

Make sure:
1. The plugin is installed: `claude /plugins`
2. Your API is running and accessible
3. Configuration file exists with correct URL

### "Authentication failed"

Check your API token in `.drizzle-cube.json` or environment variables.

### "No cubes found"

Verify your Drizzle Cube server is running and has cubes registered. Test with:

```bash
curl http://localhost:4000/cubejs-api/v1/meta
```

## Source Code

The plugin is open source:

- **Repository**: [github.com/cliftonc/drizzle-cube-plugin](https://github.com/cliftonc/drizzle-cube-plugin)
- **Issues**: [Report bugs or request features](https://github.com/cliftonc/drizzle-cube-plugin/issues)
