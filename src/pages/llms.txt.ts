import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

const SECTIONS: Array<{ key: string; title: string }> = [
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

function sectionKey(id: string): string {
  if (!id.includes('/')) return '_root';
  const first = id.split('/')[0];
  return SECTIONS.some((s) => s.key === first) ? first : '_root';
}

function mdUrl(origin: string, id: string): string {
  return id === 'index' ? `${origin}/index.md` : `${origin}/${id}.md`;
}

export const GET: APIRoute = async ({ site }) => {
  const origin = (site?.origin ?? 'https://www.drizzle-cube.dev').replace(/\/$/, '');
  const docs = await getCollection('docs');

  const grouped: Record<string, typeof docs> = {};
  for (const entry of docs) {
    const k = sectionKey(entry.id);
    (grouped[k] ??= []).push(entry);
  }
  for (const k of Object.keys(grouped)) {
    grouped[k].sort((a, b) => a.id.localeCompare(b.id));
  }

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
      lines.push(`- [${title}](${mdUrl(origin, entry.id)})${desc}`);
    }
    lines.push('');
  }

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
