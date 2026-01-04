/**
 * Simple in-memory cache for server-side reference data.
 * Useful for data that doesn't change frequently (countries list, available years, etc.)
 */

type CacheEntry<T> = {
  data: T;
  expires: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Default cache TTL in milliseconds (5 minutes)
 */
const DEFAULT_TTL = 5 * 60 * 1000;

/**
 * Get a value from cache if it exists and hasn't expired
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Set a value in cache with optional TTL
 */
export function setCache<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL): void {
  cache.set(key, {
    data,
    expires: Date.now() + ttlMs,
  });
}

/**
 * Get cached value or execute fetcher function if not cached
 */
export async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL
): Promise<T> {
  const cached = getCached<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetcher();
  setCache(key, data, ttlMs);
  return data;
}

/**
 * Clear a specific cache entry
 */
export function clearCache(key: string): void {
  cache.delete(key);
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  cache.clear();
}

/**
 * Get cache stats for debugging
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

// Cache key constants for reference data
export const CACHE_KEYS = {
  COUNTRIES_LIST: 'countries_list',
  AVAILABLE_YEARS: 'available_years',
  FUNDING_TREND: 'funding_trend',
} as const;

// Extended TTL for reference data that rarely changes (1 hour)
export const REFERENCE_DATA_TTL = 60 * 60 * 1000;
