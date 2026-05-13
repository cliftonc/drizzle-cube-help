import { getCollection } from 'astro:content';
import type { APIRoute, GetStaticPaths } from 'astro';

export const getStaticPaths: GetStaticPaths = async () => {
  const docs = await getCollection('docs');
  return docs.map((doc) => ({
    params: { slug: doc.id },
    props: { doc },
  }));
};

export const GET: APIRoute = async ({ props, site }) => {
  const origin = (site?.origin ?? 'https://www.drizzle-cube.dev').replace(/\/$/, '');
  const doc = props.doc;
  const canonical =
    doc.id === 'index' ? `${origin}/` : `${origin}/${doc.id}/`;

  const frontmatter = [
    '---',
    `title: ${JSON.stringify(doc.data.title)}`,
    doc.data.description
      ? `description: ${JSON.stringify(doc.data.description)}`
      : null,
    `canonical: ${canonical}`,
    '---',
    '',
    doc.body ?? '',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  return new Response(frontmatter, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
