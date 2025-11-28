// Cache helpers using Cloudflare Workers Cache API

const CACHE_VERSION = 'v1';
const DEFAULT_TTL = 30 * 60; // 30 minutes in seconds

export async function getCachedData<T>(key: string): Promise<T | null> {
    const cache = caches.default;
    const cacheKey = `${CACHE_VERSION}:${key}`;
    const cacheUrl = new URL(`https://cache.marketmind/${cacheKey}`);

    const response = await cache.match(cacheUrl);

    if (!response) {
        return null;
    }

    try {
        return await response.json();
    } catch {
        return null;
    }
}

export async function setCachedData<T>(
    key: string,
    data: T,
    ttl: number = DEFAULT_TTL
): Promise<void> {
    const cache = caches.default;
    const cacheKey = `${CACHE_VERSION}:${key}`;
    const cacheUrl = new URL(`https://cache.marketmind/${cacheKey}`);

    const response = new Response(JSON.stringify(data), {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `max-age=${ttl}`,
        },
    });

    await cache.put(cacheUrl, response);
}

export async function invalidateCache(key: string): Promise<void> {
    const cache = caches.default;
    const cacheKey = `${CACHE_VERSION}:${key}`;
    const cacheUrl = new URL(`https://cache.marketmind/${cacheKey}`);

    await cache.delete(cacheUrl);
}
