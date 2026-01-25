---
title: MCP Server (AI-Ready Data Layer)
description: Connect AI agents to your semantic layer using the Model Context Protocol
---

Drizzle Cube includes a **built-in MCP server** that lets AI agents like Claude, ChatGPT, and n8n query your semantic layer directly. The server follows the [Model Context Protocol specification](https://modelcontextprotocol.io/) and exposes tools for discovering cubes, validating queries, and executing them.

## MCP Server Endpoint

All framework adapters expose an MCP server at `/mcp`:

```
https://your-app.com/mcp
```

This endpoint implements the full MCP specification including:
- **Tools** - Functions the AI can call
- **Prompts** - Pre-built prompts for common tasks
- **Server-Sent Events (SSE)** - For streaming responses

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `drizzle_cube_discover` | Find relevant cubes based on topic or intent |
| `drizzle_cube_validate` | Validate queries and get auto-corrections |
| `drizzle_cube_load` | Execute queries and return results |

## Connecting AI Tools

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "your-app-analytics": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-remote", "https://your-app.com/mcp"]
    }
  }
}
```

### Claude.ai (Web)

1. Go to **Settings → Connectors → Add Connector**
2. Enter your MCP server URL: `https://your-app.com/mcp`
3. The tools will be available in your conversations

### ChatGPT

1. Go to **Settings → Connectors → Advanced → Developer Mode**
2. Add your MCP server URL: `https://your-app.com/mcp`
3. The tools will be available in ChatGPT

### n8n

Use the **MCP Client** node:

1. Add an MCP Client node to your workflow
2. Set the server URL: `https://your-app.com/mcp`
3. Connect it to an AI Agent node

See [n8n MCP Client documentation](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.mcpclienttool/) for details.

## The AI Workflow

When an AI agent connects to your MCP server, it typically follows this workflow:

```
User: "Show me average salary by department"
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  1. drizzle_cube_discover                           │
│     Find cubes related to "salary" and "department" │
│     → Returns: Employees, Departments cubes with    │
│       suggested measures and dimensions             │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  2. AI builds query using metadata                  │
│     The AI uses cube metadata to construct a query  │
│     → Query: { measures: ['Employees.avgSalary'],   │
│                dimensions: ['Departments.name'] }   │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  3. drizzle_cube_validate (optional)                │
│     Check query validity, get corrections if needed │
│     → Returns: { isValid: true, correctedQuery }    │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  4. drizzle_cube_load                               │
│     Execute query with security context             │
│     → Returns: { data: [...], annotation: {...} }   │
└─────────────────────────────────────────────────────┘
```

## Tool Reference

### drizzle_cube_discover

Find cubes relevant to a topic or intent.

```json
// Parameters
{
  "topic": "salary",
  "intent": "I want to analyze compensation",
  "limit": 5,
  "minScore": 0.3
}

// Response
{
  "cubes": [
    {
      "cube": "Employees",
      "relevanceScore": 0.85,
      "matchedOn": ["measure:avgSalary", "measure:totalSalary"],
      "suggestedMeasures": ["Employees.avgSalary", "Employees.totalSalary"],
      "suggestedDimensions": ["Employees.department", "Employees.location"]
    }
  ]
}
```

### drizzle_cube_validate

Validate a query and get helpful corrections.

```json
// Parameters
{
  "query": {
    "measures": ["Employees.cont"],
    "dimensions": ["Departments.nam"]
  }
}

// Response
{
  "isValid": false,
  "errors": [
    "Unknown measure 'Employees.cont' - did you mean 'Employees.count'?",
    "Unknown dimension 'Departments.nam' - did you mean 'Departments.name'?"
  ],
  "correctedQuery": {
    "measures": ["Employees.count"],
    "dimensions": ["Departments.name"]
  }
}
```

### drizzle_cube_load

Execute a query and return results.

```json
// Parameters
{
  "query": {
    "measures": ["Employees.count", "Employees.avgSalary"],
    "dimensions": ["Departments.name"]
  }
}

// Response
{
  "data": [
    { "Departments.name": "Engineering", "Employees.count": 45, "Employees.avgSalary": 125000 },
    { "Departments.name": "Sales", "Employees.count": 32, "Employees.avgSalary": 85000 }
  ],
  "annotation": {
    "measures": {
      "Employees.count": { "title": "Total Employees", "type": "count" },
      "Employees.avgSalary": { "title": "Average Salary", "type": "avg" }
    },
    "dimensions": {
      "Departments.name": { "title": "Department Name", "type": "string" }
    }
  }
}
```

## Configuration

### Disabling MCP

If you don't want the MCP server exposed:

```typescript
createCubeRouter({
  // ... other options
  mcp: {
    enabled: false
  }
})
```

### Selective Tool Exposure

Expose only specific MCP tools:

```typescript
createCubeRouter({
  // ... other options
  mcp: {
    enabled: true,
    tools: ['discover', 'validate', 'load']  // Only expose these
  }
})
```

### Origin Restrictions

Restrict which origins can connect to your MCP server:

```typescript
createCubeRouter({
  // ... other options
  mcp: {
    enabled: true,
    allowedOrigins: ['https://claude.ai', 'https://chat.openai.com']
  }
})
```

## Security & Authentication

> **Important**: The MCP server does **not** include built-in authentication. You are responsible for adding authentication middleware, just like with the standard Cube API routes.

### Authentication Is Your Responsibility

Apply authentication middleware **before** mounting the cube router:

```typescript
import { createCubeRouter } from 'drizzle-cube/adapters/express'
import { authMiddleware } from './auth'

const app = express()

// Apply authentication BEFORE mounting the cube router
app.use(authMiddleware)

// Now both /cubejs-api/v1/* AND /mcp require authentication
const cubeRouter = createCubeRouter({
  cubes: [employeesCube],
  drizzle: db,
  schema,
  extractSecurityContext: async (req) => ({
    organisationId: req.user.orgId,
    userId: req.user.id
  })
})

app.use('/', cubeRouter)
```

### Security Context Enforcement

All MCP tools respect your security context:

- `drizzle_cube_load` executes queries with the security context
- `drizzle_cube_discover` only returns cubes the user has access to
- Multi-tenant isolation is enforced on all data access

## Enhancing AI Discovery

The MCP tools work best when your cubes have rich semantic metadata. See [Adding Semantic Metadata](/ai/semantic-metadata/) for how to add:

- **Descriptions** for cubes, measures, and dimensions
- **Synonyms** for alternate names ("revenue" → "sales", "income")
- **Example questions** that help AI understand the cube's purpose

## Try It Live

Connect to the demo MCP server to try it out:

```
https://try.drizzle-cube.dev/mcp
```

## Next Steps

- [Adding Semantic Metadata](/ai/semantic-metadata/) - Make your cubes more discoverable
- [Claude Desktop Setup](/ai/claude-desktop-setup/) - Connect Claude Desktop to your data
- [Claude Code Plugin](/ai/claude-code-plugin/) - Query from Claude Code
