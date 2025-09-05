const RETURN_TO_KEY = 'returnTo';
const RETURN_TO_TTL_KEY = 'returnToTTL';
const TTL_MINUTES = 15; // 15 minutes

// Check if path is safe for internal redirect
const isSafePath = (path: string): boolean => {
  if (!path || typeof path !== 'string') return false;
  
  // Must start with '/' but not '//' (protocol-relative URLs)
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  
  // Check for protocol schemes
  if (path.includes('://')) return false;
  
  // Normalize and check if it resolves to auth page
  try {
    const url = new URL(path, window.location.origin);
    if (url.pathname === '/auth') return false;
    return true;
  } catch {
    return false;
  }
};

// Normalize path to ensure it's clean
const normalizePath = (path: string): string => {
  try {
    const url = new URL(path, window.location.origin);
    return url.pathname + url.search + url.hash;
  } catch {
    return '/';
  }
};

export const setReturnTo = (path: string): void => {
  // Don't overwrite if URL already contains returnTo param
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('returnTo')) return;
  
  if (isSafePath(path)) {
    const normalizedPath = normalizePath(path);
    const expiryTime = Date.now() + (TTL_MINUTES * 60 * 1000);
    
    sessionStorage.setItem(RETURN_TO_KEY, normalizedPath);
    sessionStorage.setItem(RETURN_TO_TTL_KEY, expiryTime.toString());
  }
};

export const getReturnTo = (): string => {
  // Check URL params first (for email links)
  const urlParams = new URLSearchParams(window.location.search);
  const urlReturnTo = urlParams.get('returnTo');
  
  if (urlReturnTo && isSafePath(urlReturnTo)) {
    return normalizePath(urlReturnTo);
  }
  
  // Check sessionStorage
  const storedPath = sessionStorage.getItem(RETURN_TO_KEY);
  const expiryTime = sessionStorage.getItem(RETURN_TO_TTL_KEY);
  
  if (!storedPath || !expiryTime) {
    return '/';
  }
  
  // Check if expired
  if (Date.now() > parseInt(expiryTime, 10)) {
    clearReturnTo();
    return '/';
  }
  
  if (isSafePath(storedPath)) {
    return storedPath;
  }
  
  return '/';
};

export const clearReturnTo = (): void => {
  sessionStorage.removeItem(RETURN_TO_KEY);
  sessionStorage.removeItem(RETURN_TO_TTL_KEY);
};