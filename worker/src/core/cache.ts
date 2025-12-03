// Cloudflare KV-based caching with stale fallback strategy
// Never generates mock data - always returns real market data (fresh or stale)

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

export class KVCache {
    constructor(private kv: KVNamespace) { }

    /**
     * Get cached data and check if it's stale
     * @returns null if no cache exists, otherwise returns data with staleness indicator
     */
    async get<T>(key: string): Promise<{ data: T; isStale: boolean } | null> {
        const raw = await this.kv.get(key, 'json');
        if (!raw) return null;

        const entry = raw as CacheEntry<T>;
        const now = Date.now();
        const isStale = now > entry.expiresAt;

        return { data: entry.data, isStale };
    }

    /**
     * Store data in KV cache with TTL for freshness detection
     * @param ttlSeconds Time in seconds before data is considered stale
     */
    async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + ttlSeconds * 1000,
        };

        // Store in KV with 7-day expiration (allows stale fallback)
        // KV will auto-delete after 7 days if not refreshed
        await this.kv.put(key, JSON.stringify(entry), {
            expirationTtl: 60 * 60 * 24 * 7, // 7 days
        });
    }

    /**
     * Get stale data (ignores expiration check)
     * Used as last-resort fallback when API fails
     */
    async getStale<T>(key: string): Promise<T | null> {
        const raw = await this.kv.get(key, 'json');
        if (!raw) return null;
        return (raw as CacheEntry<T>).data;
    }

    /**
     * Delete cache entry
     */
    async delete(key: string): Promise<void> {
        await this.kv.delete(key);
    }
}
