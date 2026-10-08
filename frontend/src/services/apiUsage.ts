export interface ApiUsage {
    twelvedata: number;
    marketaux: number;
    goldApi: number;
    lastReset: {
        daily: string;
        monthly: string;
    };
}

export const API_USAGE_STORAGE_KEY = 'api_usage';

export const API_LIMITS = {
    MARKETAUX_DAILY: 100,
    GOLD_API_MONTHLY: 1000,
    WARNING_THRESHOLD: 0.8,
    DANGER_THRESHOLD: 0.9,
} as const;

export function getStoredUsage(): ApiUsage {
    const stored = localStorage.getItem(API_USAGE_STORAGE_KEY);
    if (stored) {
        return JSON.parse(stored) as ApiUsage;
    }
    return {
        twelvedata: 0,
        marketaux: 0,
        goldApi: 0,
        lastReset: {
            daily: new Date().toISOString(),
            monthly: new Date().toISOString(),
        },
    };
}

export function saveUsage(usage: ApiUsage): void {
    localStorage.setItem(API_USAGE_STORAGE_KEY, JSON.stringify(usage));
}

/** Same UTC calendar day (year + month + date). */
export function isSameUtcDay(a: Date, b: Date): boolean {
    return (
        a.getUTCFullYear() === b.getUTCFullYear() &&
        a.getUTCMonth() === b.getUTCMonth() &&
        a.getUTCDate() === b.getUTCDate()
    );
}

/** Same UTC calendar month (year + month). */
export function isSameUtcMonth(a: Date, b: Date): boolean {
    return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

/**
 * Apply daily/monthly counter resets using full UTC period identity
 * (avoids day-of-month / month-of-year collisions across years).
 */
export function applyUsageResets(usage: ApiUsage, now: Date = new Date()): ApiUsage {
    const lastDailyReset = new Date(usage.lastReset.daily);
    const lastMonthlyReset = new Date(usage.lastReset.monthly);
    let updated = false;
    const next: ApiUsage = {
        ...usage,
        lastReset: { ...usage.lastReset },
    };

    if (!isSameUtcDay(now, lastDailyReset)) {
        next.marketaux = 0;
        next.lastReset.daily = now.toISOString();
        updated = true;
    }

    if (!isSameUtcMonth(now, lastMonthlyReset)) {
        next.goldApi = 0;
        next.lastReset.monthly = now.toISOString();
        updated = true;
    }

    if (updated) {
        saveUsage(next);
    }
    return next;
}

export function getUsageWithResets(now: Date = new Date()): ApiUsage {
    return applyUsageResets(getStoredUsage(), now);
}
