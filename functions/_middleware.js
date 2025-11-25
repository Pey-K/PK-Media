/**
 * Cloudflare Pages Function to ensure JSON files are served with correct content-type
 * This prevents data files from being served as HTML
 */
export function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  
  // If it's a JSON file, ensure it's served with correct content-type
  if (url.pathname.endsWith('.json')) {
    return next().then(response => {
      // Clone the response to modify headers
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Content-Type', 'application/json');
      return newResponse;
    });
  }
  
  // For all other requests, pass through
  return next();
}

