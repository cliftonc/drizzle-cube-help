export const SECTIONS: Array<{ key: string; title: string }> = [
  { key: '_root', title: 'Overview' },
  { key: 'getting-started', title: 'Getting Started' },
  { key: 'semantic-layer', title: 'Semantic Layer' },
  { key: 'ai', title: 'AI Features' },
  { key: 'client', title: 'Client Components' },
  { key: 'adapters', title: 'Adapters' },
  { key: 'examples', title: 'Examples' },
  { key: 'advanced', title: 'Advanced' },
  { key: 'guides', title: 'Guides' },
  { key: 'api-reference', title: 'API Reference' },
  { key: 'contributing', title: 'Contributing' },
];

export interface LlmsDocEntry {
  id: string;
  data: {
    title?: string;
    description?: string;
  };
}

export function sectionKey(id: string): string {
  if (!id.includes('/')) return '_root';
  const first = id.split('/')[0];
  return SECTIONS.some((s) => s.key === first) ? first : '_root';
}

export function mdUrl(origin: string, id: string): string {
  return id === 'index' ? `${origin}/index.md` : `${origin}/${id}.md`;
}

export function groupDocsBySection<T extends LlmsDocEntry>(docs: readonly T[]): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};

  for (const entry of docs) {
    const key = sectionKey(entry.id);
    (grouped[key] ??= []).push(entry);
  }

  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.id.localeCompare(b.id));
  }

  return grouped;
}

export function formatLlmsTxt(docs: readonly LlmsDocEntry[], origin: string): string {
  const normalizedOrigin = origin.replace(/\/$/, '');
  const grouped = groupDocsBySection(docs);

  const lines: string[] = [
    '# Drizzle Cube',
    '',
    '> Open source embeddable analytics — a Cube.js-compatible semantic layer for SaaS apps, built on Drizzle ORM.',
    '',
    'Drizzle Cube lets developers add a semantic layer (cubes, measures, dimensions, joins) to an existing Drizzle ORM project, then expose it via Cube.js-compatible REST and MCP endpoints. Dashboards, AI agents, or any Cube.js client can query it directly. Multi-tenant security, caching, and TypeScript end-to-end.',
    '',
  ];

  for (const section of SECTIONS) {
    const entries = grouped[section.key];
    if (!entries || entries.length === 0) continue;
    lines.push(`## ${section.title}`);
    lines.push('');
    for (const entry of entries) {
      const title = entry.data.title ?? entry.id;
      const desc = entry.data.description ? `: ${entry.data.description}` : '';
      lines.push(`- [${title}](${mdUrl(normalizedOrigin, entry.id)})${desc}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
