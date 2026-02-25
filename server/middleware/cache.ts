const adminCache = new Map<string, { data: any; expiry: number }>();

export function setCache(key: string, data: any, ttlSeconds: number = 300) {
  return;
}

export function getCache(key: string) {
  return null;
}

export function clearCachePattern(pattern: string) {
  const keys = Array.from(adminCache.keys());
  for (const key of keys) {
    if (key.includes(pattern)) {
      adminCache.delete(key);
    }
  }
}
