import { useLocation } from 'wouter';
import { useCallback } from 'react';
import { useUTMParams } from './use-utm-params';

export function useUTMNavigate() {
  const [, setLocation] = useLocation();
  const { addParamsToURL } = useUTMParams();
  
  const navigate = useCallback((path: string, options?: { replace?: boolean; preserveParams?: boolean; state?: unknown }) => {
    const preserveParams = options?.preserveParams !== false; // По умолчанию true
    const enhancedPath = preserveParams ? addParamsToURL(path) : path;
    
    // Wouter's setLocation can accept either boolean or { replace, state }
    if (options?.state !== undefined) {
      setLocation(enhancedPath, { replace: options.replace ?? false, state: options.state });
    } else {
      setLocation(enhancedPath, options?.replace ?? false);
    }
  }, [setLocation, addParamsToURL]);
  
  return navigate;
}
