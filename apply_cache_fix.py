"""
Safe file patcher for twelvedata.ts cache improvements
Run: python apply_cache_fix.py
"""
import re

FILE_PATH = r"worker\src\integrations\twelvedata.ts"

def apply_fixes():
    print("Reading file...")
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Fix 1: Update getCachedData function signature and logic
    print("Applying Fix 1: getCachedData function...")
    old_func = r'''function getCachedData<T>\(key: string\): T \| null \{
    const cached = cache\.get\(key\);
    if \(cached && \(Date\.now\(\) - cached\.timestamp\) < CACHE_TTL\) \{
        const ageSeconds = Math\.round\(\(Date\.now\(\) - cached\.timestamp\) / 1000\);
        console\.log\(`\[Cache\] Hit for \$\{key\} \(\$\{ageSeconds\}s old\)`\);
        return cached\.data;
    \}
    return null;
\}'''
    
    new_func = '''function getCachedData<T>(key: string, ignoreExpiry: boolean = false): T | null {
    const cached = cache.get(key);
    if (!cached) return null;
    
    const ageSeconds = Math.round((Date.now() - cached.timestamp) / 1000);
    
    // When rate limited, return cache regardless of age
    if (ignoreExpiry) {
        console.log(`[Cache] Hit for ${key} (${ageSeconds}s old) - ignoring expiry`);
        return cached.data;
    }
    
    // Normal: check TTL
    if ((Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log(`[Cache] Hit for ${key} (${ageSeconds}s old)`);
        return cached.data;
    }
    
    return null;
}'''
    
    content = re.sub(old_func, new_func, content, flags=re.DOTALL)
    
    # Fix 2: Update getStockCandles rate limit handling
    print("Applying Fix 2: getStockCandles...")
    content = content.replace(
        "const cachedData = getCachedData<PricePoint[]>(cacheKey);",
        "const cachedData = getCachedData<PricePoint[]>(cacheKey, true);"
    )
    
    # Fix 3 & 4: Update getStockQuote rate limit and error handling
    print("Applying Fix 3 & 4: getStockQuote...")
    content = content.replace(
        "const cachedData = getCachedData<{ price: number; change: number; changePercent: number }>(cacheKey);",
        "const cachedData = getCachedData<{ price: number; change: number; changePercent: number }>(cacheKey, true);"
    )
    
    if content == original:
        print("❌ No changes applied - pattern matching failed!")
        return False
    
    print("Writing updated file...")
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Successfully applied all cache fixes!")
    print("\nNext steps:")
    print("1. cd worker")
    print("2. npm run deploy")
    return True

if __name__ == "__main__":
    try:
        success = apply_fixes()
        exit(0 if success else 1)
    except Exception as e:
        print(f"❌ Error: {e}")
        exit(1)
