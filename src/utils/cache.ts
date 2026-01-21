/**
 * Simple in-memory cache with TTL (Time To Live)
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class Cache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Set a value in the cache
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Get a value from the cache
   * Returns null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > entry.ttl) {
      // Entry expired, remove it
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Get a value from the cache, ignoring TTL expiration
   * Returns null only if not found
   * Useful for manual refresh scenarios where cache should persist until explicit refresh
   */
  getIgnoreTTL<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    return entry.data as T;
  }

  /**
   * Check if a key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remove a specific key from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear all cache entries matching a prefix
   */
  clearPrefix(prefix: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// Export singleton instance
export const cache = new Cache();

// Clean up expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 5 * 60 * 1000);
}

// Cache key generators
export const cacheKeys = {
  courses: () => 'courses:all',
  course: (courseId: string) => `course:${courseId}`,
  tasks: (courseId?: string, moduleId?: string) => {
    if (moduleId) return `tasks:${courseId}:${moduleId}`;
    if (courseId) return `tasks:${courseId}`;
    return 'tasks:all';
  },
  students: (teacherId: string, courseId: string) => `students:${teacherId}:${courseId}`,
  dashboard: (teacherId: string) => `dashboard:${teacherId}`,
  managedCourses: (teacherId: string) => `managedCourses:${teacherId}`,
  courseOverview: (teacherId: string, courseId: string) => `courseOverview:${teacherId}:${courseId}`,
  courseModules: (teacherId: string, courseId: string) => `courseModules:${teacherId}:${courseId}`,
  courseStudents: (teacherId: string, courseId: string) => `courseStudents:${teacherId}:${courseId}`,
};




