import redis from '@lib/cache';

/** TTL presets in seconds */
export const TTL = {
  MENU_TREE: 3600,
  USER_ACCESS: 300,
  ROLE_ALL: 1800,
  MODULE_ALL: 3600,
  COURTS_ALL: 1800,
  COURT_SCHEDULES: 900,
  BOOKINGS: 300,
};

/**
 * Get cached data by key
 * @param {string} key Cache key
 * @returns {any|null} Parsed data or null if not found
 */
export const getCache = async (key) => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Cache get error [${key}]:`, error.message);
    return null;
  }
};

/**
 * Set data in cache with TTL
 * @param {string} key Cache key
 * @param {any} data Data to cache (will be JSON-serialized)
 * @param {number} ttl Time to live in seconds
 */
export const setCache = async (key, data, ttl) => {
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttl);
  } catch (error) {
    console.error(`Cache set error [${key}]:`, error.message);
  }
};

/**
 * Invalidate cache entries matching a pattern
 * @param {string} pattern Glob pattern (e.g., "menu:*", "user:access:*")
 */
export const invalidateCache = async (pattern) => {
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch (error) {
    console.error(`Cache invalidate error [${pattern}]:`, error.message);
  }
};
