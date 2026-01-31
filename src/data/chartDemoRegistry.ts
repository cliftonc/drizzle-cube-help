/**
 * Registry mapping chart types to their demo configurations
 */

import {
  timeSeriesData,
  categoryData,
  scatterData,
  bubbleData,
  radarData,
  radialBarData,
  treemapData,
  funnelData,
  activityGridData,
  tableData,
  kpiNumberValue,
  kpiDeltaData,
  kpiTextValue,
  markdownContent,
  sankeyData,
  sunburstData,
  retentionData,
  heatmapData,
} from "./chartDemoData";

export interface ChartDemoConfig {
  chartType: string;
  data: unknown[];
  chartConfig: {
    xAxis?: string[];
    yAxis?: string[];
    series?: string[];
    sizeField?: string;
    dateField?: string[];
    valueField?: string[];
  };
  displayConfig?: {
    showLegend?: boolean;
    showGrid?: boolean;
    showTooltip?: boolean;
    content?: string;
    template?: string;
    [key: string]: unknown;
  };
}

export const chartDemoRegistry: Record<string, ChartDemoConfig> = {
  bar: {
    chartType: "bar",
    data: timeSeriesData,
    chartConfig: {
      xAxis: ["date"],
      yAxis: ["revenue", "orders"],
    },
    displayConfig: {
      showLegend: true,
      showGrid: true,
      showTooltip: true,
    },
  },

  line: {
    chartType: "line",
    data: timeSeriesData,
    chartConfig: {
      xAxis: ["date"],
      yAxis: ["revenue", "orders"],
    },
    displayConfig: {
      showLegend: true,
      showGrid: true,
      showTooltip: true,
    },
  },

  area: {
    chartType: "area",
    data: timeSeriesData,
    chartConfig: {
      xAxis: ["date"],
      yAxis: ["revenue", "customers"],
    },
    displayConfig: {
      showLegend: true,
      showGrid: true,
      showTooltip: true,
    },
  },

  pie: {
    chartType: "pie",
    data: categoryData,
    chartConfig: {
      xAxis: ["category"],
      yAxis: ["value"],
    },
    displayConfig: {
      showLegend: true,
      showTooltip: true,
    },
  },

  scatter: {
    chartType: "scatter",
    data: scatterData,
    chartConfig: {
      xAxis: ["x"],
      yAxis: ["y"],
      series: ["category"],
    },
    displayConfig: {
      showLegend: true,
      showGrid: true,
      showTooltip: true,
    },
  },

  radar: {
    chartType: "radar",
    data: radarData,
    chartConfig: {
      xAxis: ["metric"],
      yAxis: ["A", "B"],
    },
    displayConfig: {
      showLegend: true,
      showGrid: true,
      showTooltip: true,
    },
  },

  radialBar: {
    chartType: "radialBar",
    data: radialBarData,
    chartConfig: {
      xAxis: ["name"],
      yAxis: ["value"],
    },
    displayConfig: {
      showLegend: true,
      showTooltip: true,
    },
  },

  treemap: {
    chartType: "treemap",
    data: treemapData,
    chartConfig: {
      xAxis: ["name"],
      yAxis: ["size"],
    },
    displayConfig: {
      showLegend: true,
      showTooltip: true,
    },
  },

  bubble: {
    chartType: "bubble",
    data: bubbleData,
    chartConfig: {
      xAxis: ["x"],
      yAxis: ["y"],
      sizeField: "z",
      series: ["category"],
    },
    displayConfig: {
      showLegend: true,
      showGrid: true,
      showTooltip: true,
      minBubbleSize: 10,
      maxBubbleSize: 50,
      bubbleOpacity: 0.7,
    },
  },

  activityGrid: {
    chartType: "activityGrid",
    data: activityGridData,
    chartConfig: {
      dateField: ["date"],
      valueField: ["count"],
    },
    displayConfig: {
      showLabels: true,
      showTooltip: true,
    },
  },

  table: {
    chartType: "table",
    data: tableData,
    chartConfig: {
      xAxis: ["product", "category"],
      yAxis: ["revenue", "units"],
    },
    displayConfig: {},
  },

  kpiNumber: {
    chartType: "kpiNumber",
    data: [{ value: kpiNumberValue }],
    chartConfig: {
      yAxis: ["value"],
    },
    displayConfig: {
      prefix: "$",
      decimals: 0,
    },
  },

  kpiDelta: {
    chartType: "kpiDelta",
    data: kpiDeltaData,
    chartConfig: {
      xAxis: ["period"],
      yAxis: ["value"],
    },
    displayConfig: {
      prefix: "$",
      decimals: 0,
      showHistogram: true,
    },
  },

  kpiText: {
    chartType: "kpiText",
    data: [{ value: kpiTextValue }],
    chartConfig: {
      yAxis: ["value"],
    },
    displayConfig: {
      template: "Plan: ${value}",
    },
  },

  markdown: {
    chartType: "markdown",
    data: [],
    chartConfig: {},
    displayConfig: {
      content: markdownContent,
    },
  },

  funnel: {
    chartType: "funnel",
    data: funnelData,
    chartConfig: {
      xAxis: ["stage"],
      yAxis: ["value"],
    },
    displayConfig: {
      showLegend: true,
      showTooltip: true,
    },
  },

  sankey: {
    chartType: "sankey",
    data: [sankeyData],
    chartConfig: {},
    displayConfig: {
      showTooltip: true,
    },
  },

  sunburst: {
    chartType: "sunburst",
    data: [sunburstData],
    chartConfig: {},
    displayConfig: {
      showTooltip: true,
    },
  },

  retentionHeatmap: {
    chartType: "retentionHeatmap",
    data: retentionData as unknown as unknown[],
    chartConfig: {},
    displayConfig: {
      showTooltip: true,
    },
  },

  heatmap: {
    chartType: "heatmap",
    data: heatmapData,
    chartConfig: {
      xAxis: ["hour"],
      yAxis: ["day"],
      valueField: ["activity"],
    },
    displayConfig: {
      showTooltip: true,
    },
  },
};
