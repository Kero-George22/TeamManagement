const cache = new Map();

const DEFAULT_TTL = 30 * 1000; // 30 seconds

export function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.data;
}

export function setCache(key, data, ttl = DEFAULT_TTL) {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
}

export function invalidateCache(key) {
  cache.delete(key);
}

export function invalidateCachePrefix(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

export function clearCache() {
  cache.clear();
}
