import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Clone response to avoid "Body has already been consumed" error
    const responseClone = res.clone();
    try {
      const errorData = await res.json();
      const error = new Error(errorData.message || res.statusText);
      // Preserve error data for specific error handling
      Object.assign(error, errorData);
      throw error;
    } catch (parseError) {
      // Use cloned response to read as text if JSON parsing failed
      const text = (await responseClone.text()) || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    // Clone response to avoid "Body has already been consumed" error
    const responseClone = res.clone();
    try {
      const errorData = await res.json();
      const error = new Error(errorData.message || res.statusText);
      // Preserve error data for specific error handling
      Object.assign(error, errorData);
      throw error;
    } catch (parseError) {
      // Use cloned response to read as text if JSON parsing failed
      const text = (await responseClone.text()) || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }
  }

  // Check if response has content before trying to parse JSON
  const contentType = res.headers.get('content-type');
  const hasContent = contentType && contentType.includes('application/json');
  
  if (hasContent) {
    return await res.json();
  } else {
    // For responses like 200 OK without JSON content (e.g., logout)
    return {};
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Re-enable for development
      staleTime: 0, // No caching for development
      // gcTime: 0, // No cache retention (disabled as not supported in this version)
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
