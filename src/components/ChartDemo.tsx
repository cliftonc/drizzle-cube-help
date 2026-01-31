/**
 * React component for rendering live chart demos in documentation
 * with interactive display config panel from Analysis Builder
 */

import { useState, useCallback } from "react";
import { LazyChart } from "drizzle-cube/client/charts";
import { CubeProvider } from "drizzle-cube/client/providers";
import { AnalysisDisplayConfigPanel } from "drizzle-cube/client/components";
import type { ChartDemoConfig } from "../data/chartDemoRegistry";

interface ChartDemoProps {
  config: ChartDemoConfig;
  height?: number;
}

// Dummy fetch function that returns empty data (we're using static demo data)
const dummyFetch = async () => new Response(JSON.stringify({ data: [] }));

// Default color palette for demos
const defaultColorPalette = {
  name: "demo",
  label: "Demo Palette",
  colors: [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7300",
    "#0088fe",
    "#00c49f",
    "#ffbb28",
    "#ff8042",
  ],
};

export default function ChartDemo({ config, height = 300 }: ChartDemoProps) {
  const [displayConfig, setDisplayConfig] = useState<Record<string, unknown>>(
    () => ({ ...config.displayConfig })
  );

  const handleDisplayConfigChange = useCallback(
    (newConfig: Record<string, unknown>) => {
      setDisplayConfig(newConfig);
    },
    []
  );

  return (
    <CubeProvider
      apiOptions={{
        baseUrl: "/api/cube",
        fetchFn: dummyFetch,
      }}
    >
      <div
        className="chart-demo-interactive"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: "1rem",
          width: "100%",
          margin: "1.5rem 0",
          padding: "1rem",
          border: "1px solid var(--sl-color-hairline)",
          borderRadius: "0.5rem",
          background: "var(--sl-color-bg)",
        }}
      >
        {/* Chart */}
        <div
          style={{
            minHeight: height,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflowX: "auto",
            overflowY: "visible",
          }}
        >
          <LazyChart
            chartType={config.chartType as any}
            data={config.data as any[]}
            chartConfig={config.chartConfig}
            displayConfig={displayConfig}
            height={height}
            colorPalette={defaultColorPalette as any}
          />
        </div>

        {/* Config Panel */}
        <div
          style={{
            borderLeft: "1px solid var(--sl-color-hairline)",
            paddingLeft: "1rem",
            overflowY: "auto",
            maxHeight: height + 100,
            fontSize: "0.875rem",
          }}
        >
          <AnalysisDisplayConfigPanel
            chartType={config.chartType as any}
            displayConfig={displayConfig as any}
            colorPalette={defaultColorPalette as any}
            onDisplayConfigChange={handleDisplayConfigChange as any}
          />
        </div>
      </div>
    </CubeProvider>
  );
}
