import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { formatLlmsTxt } from '../lib/llms';

export const GET: APIRoute = async ({ site }) => {
  const origin = site?.origin ?? 'https://www.drizzle-cube.dev';
  const docs = await getCollection('docs');

  return new Response(formatLlmsTxt(docs, origin), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
