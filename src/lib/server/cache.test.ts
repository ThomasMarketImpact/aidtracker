import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCached,
  setCache,
  getCachedOrFetch,
  clearCache,
  clearAllCache,
  getCacheStats,
} from './cache';

describe('cache', () => {
  beforeEach(() => {
    clearAllCache();
  });

  describe('getCached', () => {
    it('returns null for non-existent key', () => {
      expect(getCached('nonexistent')).toBeNull();
    });

    it('returns cached value', () => {
      setCache('test', { foo: 'bar' });
      expect(getCached('test')).toEqual({ foo: 'bar' });
    });

    it('returns null for expired entry', () => {
      vi.useFakeTimers();
      setCache('test', 'value', 1000); // 1 second TTL

      // Move time forward 2 seconds
      vi.advanceTimersByTime(2000);

      expect(getCached('test')).toBeNull();
      vi.useRealTimers();
    });
  });

  describe('setCache', () => {
    it('stores value with default TTL', () => {
      setCache('key', 'value');
      expect(getCached('key')).toBe('value');
    });

    it('stores complex objects', () => {
      const data = { items: [1, 2, 3], nested: { a: 'b' } };
      setCache('complex', data);
      expect(getCached('complex')).toEqual(data);
    });
  });

  describe('getCachedOrFetch', () => {
    it('returns cached value without calling fetcher', async () => {
      setCache('key', 'cached');
      const fetcher = vi.fn().mockResolvedValue('fresh');

      const result = await getCachedOrFetch('key', fetcher);

      expect(result).toBe('cached');
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('calls fetcher and caches result when not cached', async () => {
      const fetcher = vi.fn().mockResolvedValue('fresh');

      const result = await getCachedOrFetch('key', fetcher);

      expect(result).toBe('fresh');
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(getCached('key')).toBe('fresh');
    });

    it('calls fetcher when cache expired', async () => {
      vi.useFakeTimers();
      const fetcher = vi.fn().mockResolvedValue('fresh');

      // First call - caches result
      await getCachedOrFetch('key', fetcher, 1000);
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Move time forward past TTL
      vi.advanceTimersByTime(2000);

      // Second call - should fetch again
      await getCachedOrFetch('key', fetcher, 1000);
      expect(fetcher).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe('clearCache', () => {
    it('removes specific cache entry', () => {
      setCache('a', 1);
      setCache('b', 2);

      clearCache('a');

      expect(getCached('a')).toBeNull();
      expect(getCached('b')).toBe(2);
    });
  });

  describe('clearAllCache', () => {
    it('removes all cache entries', () => {
      setCache('a', 1);
      setCache('b', 2);
      setCache('c', 3);

      clearAllCache();

      expect(getCached('a')).toBeNull();
      expect(getCached('b')).toBeNull();
      expect(getCached('c')).toBeNull();
    });
  });

  describe('getCacheStats', () => {
    it('returns cache size and keys', () => {
      setCache('key1', 'a');
      setCache('key2', 'b');

      const stats = getCacheStats();

      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
    });
  });
});
