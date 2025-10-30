import { useLocation } from 'wouter';
import { useCallback } from 'react';
import { useUTMParams } from './use-utm-params';

export function useUTMNavigate() {
  const [, setLocation] = useLocation();
  const { addParamsToURL } = useUTMParams();
  
  const navigate = useCallback((path: string, options?: { replace?: boolean; preserveParams?: boolean }) => {
    const preserveParams = options?.preserveParams !== false; // По умолчанию true
    const enhancedPath = preserveParams ? addParamsToURL(path) : path;
    
    setLocation(enhancedPath, options);
  }, [setLocation, addParamsToURL]);
  
  return navigate;
}
