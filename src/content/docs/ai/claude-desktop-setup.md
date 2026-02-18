---
title: Connect Claude Desktop to Your Data
description: Step-by-step guide to connecting Claude Desktop to your Drizzle Cube semantic layer
---

Connect Claude Desktop to your Drizzle Cube API and query your data using natural language. This guide shows you how to set up the connection using the MCP endpoints built into Drizzle Cube.

## Prerequisites

- [Claude Desktop](https://claude.ai/download) installed
- A running Drizzle Cube API server
- Your API URL (e.g., `http://localhost:3001/cubejs-api/v1`)

## Option 1: Use the Drizzle Cube Plugin (Recommended)

The easiest way to connect is using the official Drizzle Cube plugin for Claude Code.

### Install the Plugin

```bash
claude /install-plugin github:cliftonc/drizzle-cube-plugin
```

### Configure the Connection

Create `.drizzle-cube.json` in your project directory:

```json
{
  "apiUrl": "http://localhost:3001/cubejs-api/v1",
  "apiToken": "your-optional-auth-token"
}
```

Or run the setup command in Claude:

```
/dc-setup
```

### Start Querying

Once configured, you can ask Claude questions about your data:

**You:** How many employees do we have by department?

**Claude:** *Fetches metadata, builds query, executes, and returns:*

| Department | Employee Count |
|------------|----------------|
| Engineering | 45 |
| Sales | 32 |
| Marketing | 18 |

See [Claude Code Plugin](/ai/claude-code-plugin/) for full documentation.

## Option 2: Manual MCP Configuration

You can also configure Claude Desktop directly using the MCP settings.

### 1. Locate Your Claude Config

Find your Claude Desktop configuration file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### 2. Add MCP Server Configuration

Edit the config file and add your Drizzle Cube server:

```json
{
  "mcpServers": {
    "drizzle-cube": {
      "command": "npx",
      "args": ["-y", "drizzle-cube-mcp-server"],
      "env": {
        "DRIZZLE_CUBE_API_URL": "http://localhost:3001/cubejs-api/v1",
        "DRIZZLE_CUBE_API_TOKEN": "your-optional-token"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

Close and reopen Claude Desktop to load the new configuration.

### 4. Verify the Connection

Ask Claude to check the connection:

**You:** Can you list the available data cubes?

Claude should respond with your cube metadata.

## Option 3: Claude.ai Web (Connectors)

You can also connect Claude.ai directly to your MCP server using Connectors:

1. Go to **Settings → Connectors → Add Connector**
2. Enter your MCP server URL: `http://localhost:3001/mcp`
3. The tools will be available in your conversations

:::note[Authentication]
Claude.ai connectors support **OAuth 2.1** for authentication. If your MCP endpoint publishes an OAuth discovery document, Claude.ai handles the auth flow automatically. For programmatic access via the Messages API, you can pass an `authorization_token` in the MCP connector configuration.
:::

### Available MCP Tools

Your Drizzle Cube MCP server exposes these tools:

| Tool | Purpose |
|------|---------|
| `drizzle_cube_meta` | Fetch cube metadata |
| `drizzle_cube_discover` | Find relevant cubes by topic/intent |
| `drizzle_cube_validate` | Validate queries with auto-corrections |
| `drizzle_cube_load` | Execute queries and return results |

## Authentication

> **Important**: MCP endpoints do **not** include built-in authentication. You are responsible for protecting them with your authentication middleware, just like the standard Cube API routes.

### Your Responsibility

Drizzle Cube provides the endpoints—you provide the security. Add authentication middleware **before** mounting the cube router:

```typescript
import { createCubeRouter } from 'drizzle-cube/adapters/express'
import { authMiddleware } from './auth'

const app = express()

// 1. Apply authentication middleware FIRST
app.use(authMiddleware)

// 2. Then mount the cube router (includes both /cubejs-api/* and /mcp/*)
app.use('/', createCubeRouter({ ... }))
```

See [MCP Server — Protecting MCP Endpoints](/ai/mcp-endpoints/#protecting-mcp-endpoints) for framework-specific middleware examples.

### Passing Auth from MCP Clients

When connecting to a **remote** server that requires authentication, MCP clients need to send credentials with each request. Here's how to configure auth for each client:

#### Claude Desktop (remote server with `mcp-remote`)

```json
{
  "mcpServers": {
    "analytics": {
      "command": "npx",
      "args": [
        "-y", "@anthropic/mcp-remote",
        "https://your-app.com/mcp",
        "--header", "Authorization: Bearer YOUR_TOKEN"
      ]
    }
  }
}
```

#### Claude Code

```bash
claude mcp add --transport http analytics https://your-app.com/mcp \
  --header "Authorization: Bearer YOUR_TOKEN"
```

#### Claude.ai Connectors

Claude.ai supports **OAuth 2.1** for connector authentication. If your MCP endpoint publishes an OAuth discovery document, Claude.ai handles the flow automatically. For the Messages API, pass `authorization_token` in the MCP connector config.

#### Plugin (Local Development)

For the Drizzle Cube plugin, add your token to `.drizzle-cube.json`:

```json
{
  "apiUrl": "http://localhost:3001/cubejs-api/v1",
  "apiToken": "your-token-here"
}
```

### Security Context (Authorization)

The `extractSecurityContext` function handles **authorization** (what data can this user see), not authentication (who is this user):

```typescript
createCubeRouter({
  // ...
  extractSecurityContext: async (req) => {
    // Authentication already happened via middleware
    // Now extract the user's context for data filtering
    return {
      organisationId: req.user.orgId,
      userId: req.user.id
    }
  }
})
```

This ensures:
- Users only see data they have access to
- Multi-tenant isolation is enforced
- All queries are scoped to the user's organization

## What Claude Can Do

Once connected, Claude can:

### Query Your Data

> "Show me total revenue by product category for last quarter"

### Explore Your Schema

> "What measures and dimensions are available in the Sales cube?"

### Build Complex Queries

> "Compare employee count this year vs last year, broken down by department"

### Create Dashboards

> "Generate a dashboard config for an executive sales overview"

### Debug Queries

> "Why is this query returning unexpected results? [paste query]"

## Troubleshooting

### "Cannot connect to API"

1. Verify your server is running: `curl http://localhost:3001/cubejs-api/v1/meta`
2. Check the URL in your config matches your server
3. Ensure no firewall is blocking the connection

### "No cubes found"

1. Verify cubes are registered in your server
2. Check the `/meta` endpoint returns your cubes
3. Ensure security context allows access to the cubes

### "Authentication failed"

1. Check your token is correct
2. Verify the token format (Bearer vs raw)
3. Check server logs for authentication errors

### MCP Connection Issues

1. Restart Claude Desktop after config changes
2. Check Claude's developer console for errors
3. Verify the MCP server path is correct

## Best Practices

### Add Rich Metadata

The more metadata you add to your cubes, the better Claude can understand your data:

```typescript
defineCube({
  name: 'Sales',
  description: 'Revenue and order data',
  exampleQuestions: [
    'What was total revenue last month?',
    'Show me sales by region'
  ],
  measures: {
    revenue: {
      type: 'sum',
      sql: () => orders.amount,
      synonyms: ['sales', 'income', 'earnings']
    }
  }
})
```

See [Adding Semantic Metadata](/ai/semantic-metadata/) for details.

### Use Clear Naming

Claude works best when your cube, measure, and dimension names are clear:

```typescript
// ✅ Clear names
'Employees.averageSalary'
'Departments.name'
'Orders.totalRevenue'

// ❌ Unclear names
'emp.avg_sal'
'dept.nm'
'ord.tr'
```

### Test Your Connection

Before deploying, verify your MCP server is working by testing the REST API:

```bash
# Test the metadata endpoint
curl http://localhost:3001/cubejs-api/v1/meta | jq .

# Test a simple query
curl -X POST http://localhost:3001/cubejs-api/v1/load \
  -H "Content-Type: application/json" \
  -d '{"query": {"measures": ["Employees.count"]}}' | jq .
```

Then connect Claude and ask: "List the available data cubes"

## Next Steps

- [MCP Server Reference](/ai/mcp-endpoints/) - Full MCP server documentation
- [Adding Semantic Metadata](/ai/semantic-metadata/) - Make your cubes AI-friendly
- [Claude Code Plugin](/ai/claude-code-plugin/) - Full plugin documentation
