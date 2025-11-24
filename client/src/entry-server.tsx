import { renderToString } from 'react-dom/server';
import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import { queryClient } from './lib/queryClient';

export interface RenderOptions {
  url: string;
  language?: string;
}

/**
 * Server-side render function for bots/crawlers
 * Renders the React app to HTML string with meta tags
 */
export async function render(url: string, options?: Partial<RenderOptions>): Promise<{ html: string; helmet: any }> {
  const helmetContext = {};
  
  try {
    // Render React app to string
    const html = renderToString(
      <HelmetProvider context={helmetContext}>
        <QueryClientProvider client={queryClient}>
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
  }
}
