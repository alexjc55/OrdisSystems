import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';

export interface RenderOptions {
  url: string;
  language?: string;
}

/**
 * Server-side render function for bots/crawlers
 * Renders the React app to HTML string with meta tags
 * 
 * IMPORTANT: Creates fresh QueryClient per render to prevent
 * cross-request contamination
 */
export async function render(url: string, options?: Partial<RenderOptions>): Promise<{ html: string; helmet: any }> {
  const helmetContext = {};
  
  // Create fresh QueryClient for this SSR render (prevent cross-contamination)
  const ssrQueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        retry: false,
        // Disable all queries during SSR to prevent hanging
        enabled: false,
      },
    },
  });
  
  try {
    // Render React app to string
    const html = renderToString(
      <HelmetProvider context={helmetContext}>
        <QueryClientProvider client={ssrQueryClient}>
          <App />
        </QueryClientProvider>
      </HelmetProvider>
    );

    return {
      html,
      helmet: (helmetContext as any).helmet
    };
  } catch (error) {
    console.error('[SSR] Error during render:', error);
    throw error;
  } finally {
    // Clean up to prevent memory leaks
    ssrQueryClient.clear();
  }
}
