/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * In-memory fallback map when localStorage is full or blocked.
 */
const inMemoryFallback = new Map<string, string>();

/**
 * Storage utility with automatic QuotaExceededError recovery and cleanup.
 */
export function cleanStorageQuota(): void {
  try {
    if (typeof window === 'undefined') return;
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      return;
    }
    if (!storage) return;
    // 1. Remove non-essential transient caches
    const ephemeralKeys = [
      'kgcns_search_cache',
      'kgcns_temp_preview',
      'kgcns_ai_cache',
      'kgcns_last_viewed_tab',
      'kgcns_migration_history',
      'kgcns_temp_export',
      'kgcns_preview_state'
    ];
    for (const k of ephemeralKeys) {
      try {
        localStorage.removeItem(k);
      } catch {
        // ignore
      }
    }

    // 2. Scan for transient / heavy keys to prune
    const keysToRemove: string[] = [];
    const keysToTrim: { key: string; maxItems: number }[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Clean old temp keys or temporary export blobs
      if (key.startsWith('kgcns_temp_') || key.startsWith('temp_') || key.includes('backup_raw')) {
        keysToRemove.push(key);
        continue;
      }

      // Trim audit log stores (keep last 15 logs max)
      if (key.includes('audit_logs') || key.includes('survey_sync_audits')) {
        keysToTrim.push({ key, maxItems: 15 });
      }

      // Trim graduation comments (keep last 20 comments)
      if (key.includes('graduation_comments')) {
        keysToTrim.push({ key, maxItems: 20 });
      }

      // Trim AI conversations
      if (key.includes('kgcns_ai_conversations') || key.includes('ai_conversations')) {
        keysToTrim.push({ key, maxItems: 5 });
      }
    }

    // Execute removals
    for (const k of keysToRemove) {
      try {
        localStorage.removeItem(k);
      } catch {
        // ignore
      }
    }

    // Execute trims
    for (const item of keysToTrim) {
      try {
        const raw = localStorage.getItem(item.key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > item.maxItems) {
            localStorage.setItem(item.key, JSON.stringify(parsed.slice(-item.maxItems)));
          }
        }
      } catch {
        // If trimming fails, remove the non-critical log key entirely
        try {
          localStorage.removeItem(item.key);
        } catch {
          // ignore
        }
      }
    }
  } catch (err) {
    console.warn('Storage cleanup encountered an error:', err);
  }
}

/**
 * Emergency deep pruning for when quota is still exceeded after standard cleanup.
 */
function emergencyPrune(criticalKeys: string[] = []): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const allKeys: { key: string; size: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && !criticalKeys.includes(k) && k !== 'kgcns_auth_session' && k !== 'kgcns_current_user_role') {
        const val = localStorage.getItem(k) || '';
        allKeys.push({ key: k, size: val.length });
      }
    }
    // Sort descending by size to prune largest non-critical items first
    allKeys.sort((a, b) => b.size - a.size);
    for (const item of allKeys.slice(0, 5)) {
      try {
        localStorage.removeItem(item.key);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

const rawSetItem = typeof window !== 'undefined' && window.localStorage ? window.localStorage.setItem.bind(window.localStorage) : null;
const rawGetItem = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem.bind(window.localStorage) : null;
const rawRemoveItem = typeof window !== 'undefined' && window.localStorage ? window.localStorage.removeItem.bind(window.localStorage) : null;

/**
 * Safely saves data to localStorage with automatic quota recovery and in-memory fallback.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  // Always update in-memory fallback
  inMemoryFallback.set(key, value);

  if (!rawSetItem) return true;

  try {
    rawSetItem(key, value);
    return true;
  } catch (err: any) {
    const isQuotaError =
      err?.name === 'QuotaExceededError' ||
      err?.code === 22 ||
      err?.code === 1014 ||
      err?.number === -2147024882 ||
      (err?.message && String(err.message).toLowerCase().includes('quota'));

    if (isQuotaError) {
      console.warn(`[Storage] Quota exceeded when setting key "${key}". Running automatic cleanup...`);
      cleanStorageQuota();

      try {
        rawSetItem(key, value);
        return true;
      } catch {
        // Run emergency deep prune
        emergencyPrune([key]);
        try {
          rawSetItem(key, value);
          return true;
        } catch (retryErr) {
          console.warn(`[Storage] Storage full for key "${key}". Maintained in active memory.`, retryErr);
          // Return true since inMemoryFallback was updated and app continues working
          return true;
        }
      }
    }

    console.warn(`[Storage] Storage write failed for key "${key}", using memory store:`, err);
    return true;
  }
}

/**
 * Safely retrieves data from localStorage or in-memory fallback.
 */
export function safeLocalStorageGet(key: string): string | null {
  if (rawGetItem) {
    try {
      const val = rawGetItem(key);
      if (val !== null) return val;
    } catch {
      // ignore
    }
  }
  return inMemoryFallback.get(key) ?? null;
}

/**
 * Safely removes an item from localStorage and in-memory store.
 */
export function safeLocalStorageRemove(key: string): void {
  inMemoryFallback.delete(key);
  if (!rawRemoveItem) return;
  try {
    rawRemoveItem(key);
  } catch {
    // ignore
  }
}

// Global safeguard on Storage.prototype.setItem to intercept any rogue setItem calls
if (typeof window !== 'undefined' && typeof window.Storage !== 'undefined' && window.Storage.prototype) {
  try {
    const protoSetItem = window.Storage.prototype.setItem;
    window.Storage.prototype.setItem = function(this: Storage, key: string, value: string) {
      try {
        if (this === window.localStorage) {
          safeLocalStorageSet(key, value);
          return;
        }
      } catch {
        // fallback
      }
      protoSetItem.call(this, key, value);
    };
  } catch (err) {
    console.warn('[Storage] Could not patch window.Storage.prototype.setItem:', err);
  }
}
