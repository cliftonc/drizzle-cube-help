import { describe, expect, it } from 'vitest';
import { chartDemoRegistry } from './chartDemoRegistry';

const expectedKeys = [
  'bar',
  'line',
  'area',
  'pie',
  'scatter',
  'radar',
  'radialBar',
  'treemap',
  'bubble',
  'activityGrid',
  'table',
  'kpiNumber',
  'kpiDelta',
  'kpiText',
  'markdown',
  'funnel',
  'sankey',
  'sunburst',
  'retentionHeatmap',
  'heatmap',
];

describe('chart demo registry', () => {
  it('contains the current chart demo keys exactly', () => {
    expect(Object.keys(chartDemoRegistry)).toEqual(expectedKeys);
  });

  it('provides a chart type, data array, and chart config for every demo', () => {
    for (const [key, entry] of Object.entries(chartDemoRegistry)) {
      expect(entry.chartType, key).toBeTruthy();
      expect(Array.isArray(entry.data), key).toBe(true);
      expect(entry.chartConfig, key).toBeTypeOf('object');
    }
  });

  it('preserves selected critical demo mappings', () => {
    expect(chartDemoRegistry.bar.chartConfig.xAxis).toEqual(['date']);
    expect(chartDemoRegistry.bar.chartConfig.yAxis).toEqual(['revenue', 'orders']);
    expect(chartDemoRegistry.bubble.chartConfig.sizeField).toBe('z');
    expect(chartDemoRegistry.activityGrid.data).toHaveLength(365);
    expect(chartDemoRegistry.markdown.displayConfig?.content).toEqual(expect.any(String));
    expect(chartDemoRegistry.markdown.displayConfig?.content?.trim().length).toBeGreaterThan(0);
  });
});
