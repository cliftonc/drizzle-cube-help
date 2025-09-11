export interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle routing for static site
    try {
      // Try to fetch the asset first (for files with extensions)
      if (url.pathname.includes('.') || url.pathname === '/') {
        const assetResponse = await env.ASSETS.fetch(request.url);
        if (assetResponse.status < 400) {
          return assetResponse;
        }
      }
      
      // For paths without extensions, try to fetch index.html in that directory first
      if (!url.pathname.includes('.') && url.pathname !== '/') {
        const indexPath = url.pathname.endsWith('/') 
          ? `${url.pathname}index.html` 
          : `${url.pathname}/index.html`;
        const indexRequest = new Request(new URL(indexPath, request.url).toString(), request);
        const indexResponse = await env.ASSETS.fetch(indexRequest);
        
        if (indexResponse.status < 400) {
          return indexResponse;
        }
      }
      
      // Try the original path
      const assetResponse = await env.ASSETS.fetch(request.url);
      if (assetResponse.status < 400) {
        return assetResponse;
      }
      
      // If all else fails, serve the root index.html for SPA fallback
      const rootIndexRequest = new Request(new URL('/index.html', request.url).toString(), request);
      return env.ASSETS.fetch(rootIndexRequest);
      
    } catch (error) {
      // If there's an error fetching, serve root index.html
      const rootIndexRequest = new Request(new URL('/index.html', request.url).toString(), request);
      return env.ASSETS.fetch(rootIndexRequest);
    }
  },
};