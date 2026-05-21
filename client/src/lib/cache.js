const CACHE_PREFIX = 'tf_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

function getStorageKey(key) {
  return CACHE_PREFIX + key;
}

function getFromStorage(key) {
  try {
    const raw = localStorage.getItem(getStorageKey(key));
    if (!raw) return undefined;
    const entry = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(getStorageKey(key));
      return undefined;
    }
    return entry.data;
  } catch {
    return undefined;
  }
}

function setToStorage(key, data, ttl = DEFAULT_TTL) {
  try {
    const entry = {
      data,
      expiresAt: Date.now() + ttl,
    };
    localStorage.setItem(getStorageKey(key), JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable - silently fail
  }
}

function removeFromStorage(key) {
  try {
    localStorage.removeItem(getStorageKey(key));
  } catch {
    // ignore
  }
}

function clearAllStorage() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // ignore
  }
}

// In-memory cache for fast access (falls back to localStorage)
const memoryCache = new Map();

export function getCache(key) {
  // Check memory first
  const memoryEntry = memoryCache.get(key);
  if (memoryEntry && Date.now() <= memoryEntry.expiresAt) {
    return memoryEntry.data;
  }
  if (memoryEntry) {
    memoryCache.delete(key);
  }

  // Fall back to localStorage
  const storageData = getFromStorage(key);
  if (storageData !== undefined) {
    // Sync to memory cache
    memoryCache.set(key, {
      data: storageData,
      expiresAt: Date.now() + DEFAULT_TTL,
    });
    return storageData;
  }

  return undefined;
}

export function setCache(key, data, ttl = DEFAULT_TTL) {
  // Update memory cache
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });

  // Persist to localStorage
  setToStorage(key, data, ttl);
}

export function invalidateCache(key) {
  memoryCache.delete(key);
  removeFromStorage(key);
}

export function invalidateCachePrefix(prefix) {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
  // Also clear from localStorage
  try {
    const keys = Object.keys(localStorage);
    const storagePrefix = CACHE_PREFIX + prefix;
    keys.forEach(key => {
      if (key.startsWith(storagePrefix)) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // ignore
  }
}

export function clearCache() {
  memoryCache.clear();
  clearAllStorage();
}
