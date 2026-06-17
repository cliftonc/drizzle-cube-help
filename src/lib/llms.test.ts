import { describe, expect, it } from 'vitest';
import { formatLlmsTxt, mdUrl, sectionKey } from './llms';

describe('llms helpers', () => {
  it('maps document ids to known llms.txt sections', () => {
    expect(sectionKey('index')).toBe('_root');
    expect(sectionKey('getting-started/quick-start')).toBe('getting-started');
    expect(sectionKey('reference/foo')).toBe('_root');
  });

  it('builds markdown URLs for root and nested docs', () => {
    expect(mdUrl('https://example.test', 'index')).toBe('https://example.test/index.md');
    expect(mdUrl('https://example.test', 'client/charts')).toBe('https://example.test/client/charts.md');
  });

  it('formats llms.txt with normalized origin, section order, sorted entries, and optional descriptions', () => {
    const output = formatLlmsTxt(
      [
        { id: 'client/charts', data: { title: 'Charts', description: 'Chart component guide' } },
        { id: 'getting-started/quick-start', data: { title: 'Quick Start' } },
        { id: 'index', data: { title: 'Home', description: 'Start here' } },
        { id: 'client/analysis-builder', data: { title: 'Analysis Builder' } },
        { id: 'reference/foo', data: { title: 'Unknown Section' } },
      ],
      'https://example.test/',
    );

    expect(output).toContain('# Drizzle Cube\n\n> Open source embeddable analytics');
    expect(output).toContain('Drizzle Cube lets developers add a semantic layer');
    expect(output).toContain('- [Home](https://example.test/index.md): Start here');
    expect(output).toContain('- [Unknown Section](https://example.test/reference/foo.md)');
    expect(output).toContain('- [Quick Start](https://example.test/getting-started/quick-start.md)');
    expect(output).toContain('- [Charts](https://example.test/client/charts.md): Chart component guide');

    expect(output.indexOf('## Overview')).toBeLessThan(output.indexOf('## Getting Started'));
    expect(output.indexOf('## Getting Started')).toBeLessThan(output.indexOf('## Client Components'));
    expect(output.indexOf('- [Analysis Builder]')).toBeLessThan(output.indexOf('- [Charts]'));
    expect(output).not.toContain('https://example.test//');
  });
});
