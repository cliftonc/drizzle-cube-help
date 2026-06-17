import { describe, expect, it } from 'vitest';
import worker, { type Env } from './worker';

function createEnv(responses: Record<string, Response>): Env & { requestedPaths: string[] } {
  const requestedPaths: string[] = [];

  return {
    requestedPaths,
    ASSETS: {
      async fetch(input: RequestInfo | URL): Promise<Response> {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        requestedPaths.push(url.pathname);
        return responses[url.pathname] ?? new Response('missing', { status: 404 });
      },
    },
  };
}

async function fetchPath(path: string, env: Env): Promise<Response> {
  return worker.fetch(new Request(`https://example.test${path}`), env);
}

describe('worker asset routing', () => {
  it('serves root directly when it exists', async () => {
    const env = createEnv({ '/': new Response('root') });

    const response = await fetchPath('/', env);

    expect(await response.text()).toBe('root');
    expect(env.requestedPaths).toEqual(['/']);
  });

  it('serves extension paths directly when they exist', async () => {
    const env = createEnv({ '/favicon.ico': new Response('icon') });

    const response = await fetchPath('/favicon.ico', env);

    expect(await response.text()).toBe('icon');
    expect(env.requestedPaths).toEqual(['/favicon.ico']);
  });

  it('serves extensionless paths from their directory index', async () => {
    const env = createEnv({ '/semantic-layer/index.html': new Response('semantic layer') });

    const response = await fetchPath('/semantic-layer', env);

    expect(await response.text()).toBe('semantic layer');
    expect(env.requestedPaths).toEqual(['/semantic-layer/index.html']);
  });

  it('serves trailing-slash extensionless paths from their directory index', async () => {
    const env = createEnv({ '/semantic-layer/index.html': new Response('semantic layer') });

    const response = await fetchPath('/semantic-layer/', env);

    expect(await response.text()).toBe('semantic layer');
    expect(env.requestedPaths).toEqual(['/semantic-layer/index.html']);
  });

  it('falls back to root index for missing paths', async () => {
    const env = createEnv({ '/index.html': new Response('fallback') });

    const response = await fetchPath('/missing', env);

    expect(await response.text()).toBe('fallback');
    expect(env.requestedPaths).toEqual(['/missing/index.html', '/missing', '/index.html']);
  });
});
