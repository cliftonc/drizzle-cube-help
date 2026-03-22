// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  site: "https://www.drizzle-cube.dev",
  trailingSlash: "always",
  integrations: [
    react(),
    starlight({
      title: "Drizzle Cube",
      description: "Drizzle Cube: Open Source Embedded Analytics",
      favicon: "/favicon-32x32.png",
      head: [
        {
          tag: "link",
          attrs: {
            rel: "icon",
            type: "image/png",
            sizes: "16x16",
            href: "/favicon-16x16.png",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "icon",
            type: "image/png",
            sizes: "32x32",
            href: "/favicon-32x32.png",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "icon",
            type: "image/png",
            sizes: "96x96",
            href: "/favicon-96x96.png",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "apple-touch-icon",
            sizes: "180x180",
            href: "/apple-touch-icon.png",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "manifest",
            href: "/site.webmanifest",
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: "https://drizzle-cube.com/drizzle-og.png",
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image:width",
            content: "1200",
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image:height",
            content: "630",
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "twitter:image",
            content: "https://drizzle-cube.com/drizzle-og.png",
          },
        },
        {
          tag: "script",
          attrs: {
            async: true,
            src: "https://scripts.simpleanalyticscdn.com/latest.js",
          },
        },
      ],
      social: [
        {
          icon: "discord",
          label: "Discord",
          href: "https://discord.gg/kFvT97hZsv",
        },
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/cliftonc/drizzle-cube",
        },
      ],
      components: {
        SocialIcons: "./src/components/SocialIcons.astro",
        Header: "./src/components/Header.astro",
      },
      logo: {
        src: "./src/assets/drizzle-cube.png",
        replacesTitle: false,
      },
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Introduction", slug: "getting-started" },
            { label: "Quick Start", slug: "getting-started/quick-start" },
            { label: "How It Works", slug: "getting-started/how-it-works" },
            { label: "Comparison", slug: "getting-started/comparison" },
            { label: "Scaling Your SaaS", slug: "getting-started/scaling" },
          ],
        },
        {
          label: "Semantic Layer",
          items: [
            { label: "Overview", slug: "semantic-layer" },
            { label: "Cubes", slug: "semantic-layer/cubes" },
            { label: "Dimensions", slug: "semantic-layer/dimensions" },
            {
              label: "Time Dimensions",
              slug: "semantic-layer/time-dimensions",
            },
            {
              label: "Period Comparisons",
              slug: "semantic-layer/period-comparisons",
            },
            { label: "Measures", slug: "semantic-layer/measures" },
            {
              label: "Calculated Measures",
              slug: "semantic-layer/calculated-measures",
            },
            {
              label: "Statistical Functions",
              slug: "semantic-layer/statistical-functions",
            },
            { label: "Joins", slug: "semantic-layer/joins" },
            { label: "Ungrouped Queries", slug: "semantic-layer/ungrouped-queries" },
            { label: "Security", slug: "semantic-layer/security" },
          ],
        },
        {
          label: "AI Features",
          items: [
            { label: "Overview", slug: "ai" },
            { label: "MCP Endpoints", slug: "ai/mcp-endpoints" },
            { label: "Semantic Metadata", slug: "ai/semantic-metadata" },
            { label: "Claude Desktop Setup", slug: "ai/claude-desktop-setup" },
            { label: "Claude Code Plugin", slug: "ai/claude-code-plugin" },
            { label: "Query Generation", slug: "ai/query-generation" },
            { label: "Query Analysis", slug: "ai/query-analysis" },
            { label: "Agent Notebooks", slug: "ai/agent-notebooks" },
            { label: "Observability (Langfuse)", slug: "ai/observability" },
            { label: "Adding AI Endpoints", slug: "ai/adding-ai-endpoints" },
          ],
        },
        {
          label: "Client Components",
          items: [
            { label: "React Client", slug: "client" },
            { label: "Analysis Builder", slug: "client/analysis-builder" },
            { label: "Data Browser", slug: "client/data-browser" },
            { label: "Dashboards", slug: "client/dashboards" },
            { label: "Funnel Analysis", slug: "client/funnel-analysis" },
            { label: "Charts", slug: "client/charts" },
            { label: "Schema Visualization", slug: "client/schema-visualization" },
            { label: "Drill-Down Navigation", slug: "client/drill-down" },
            { label: "Dashboard Persistence", slug: "client/dashboard-persistence" },
            { label: "Hooks", slug: "client/hooks" },
            { label: "Agent Notebooks", slug: "client/agent-notebooks" },
            { label: "Theming", slug: "client/theming" },
            { label: "Icons", slug: "client/icons" },
          ],
        },
        {
          label: "Adapters",
          items: [
            { label: "Overview", slug: "adapters" },
            { label: "Express", slug: "adapters/express" },
            { label: "Fastify", slug: "adapters/fastify" },
            { label: "Hono", slug: "adapters/hono" },
            { label: "Next.js", slug: "adapters/nextjs" },
            { label: "Custom Adapters", slug: "adapters/custom" },
          ],
        },
        {
          label: "Examples",
          items: [
            { label: "Overview", slug: "examples" },
            { label: "Express", slug: "examples/express" },
            { label: "Fastify", slug: "examples/fastify" },
            { label: "Hono", slug: "examples/hono" },
            { label: "Next.js", slug: "examples/nextjs" },
          ],
        },
        {
          label: "Advanced",
          items: [
            { label: "Performance", slug: "advanced/performance" },
            { label: "Caching", slug: "advanced/caching" },
            {
              label: "Bundle Optimization",
              slug: "advanced/bundle-optimization",
            },
            { label: "Troubleshooting", slug: "advanced/troubleshooting" },
            { label: "TypeScript", slug: "advanced/typescript" },
          ],
        },
        {
          label: "Contributing",
          items: [
            { label: "Helping with the project", slug: "contributing/helping" },
            { label: "Guidelines", slug: "contributing/guidelines" },
          ],
        },
      ],
      customCss: [
        "./src/styles/custom.css",
        "drizzle-cube/client/styles.css",
      ],
    }),
  ],
});
