import { createStorage, noopStorage } from 'wagmi';

/**
 * Memory storage fallback implementation for environments where
 * localStorage or IndexedDB is restricted or throws DOMException.
 */
class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export const inMemoryStorage = new MemoryStorage();

/**
 * Returns a working Storage instance.
 * Checks if localStorage can be written/read without DOMException/SecurityError.
 * If blocked or corrupted, falls back to inMemoryStorage.
 */
export function getSafeStorage() {
  if (typeof window === 'undefined') {
    return noopStorage;
  }

  try {
    const testKey = '__unifyvault_storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch (error) {
    console.warn(
      '[Storage] LocalStorage or IndexedDB is unavailable or restricted in this browser environment. Falling back to in-memory storage.',
      error,
    );
    return inMemoryStorage;
  }
}

/**
 * Creates a Wagmi storage configuration with graceful in-memory fallback.
 */
export function createSafeWagmiStorage() {
  return createStorage({
    storage: getSafeStorage(),
    key: 'unifyvault-v2-wagmi',
  });
}

/**
 * Protects against uncaught promise rejections and DOMExceptions caused by IndexedDB backing store errors
 * (e.g., DOMException: Internal error opening backing store for indexedDB.open).
 */
export function setupIndexedDBGuard(): void {
  if (typeof window === 'undefined') return;

  // Intercept unhandled promise rejections related to IndexedDB backing store errors
  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = String(event?.reason?.message || event?.reason || '');
    const isIndexedDBError =
      reasonStr.includes('indexedDB') ||
      reasonStr.includes('backing store') ||
      reasonStr.includes('Internal error opening backing store');

    if (isIndexedDBError) {
      console.warn('[StorageGuard] Suppressed uncaught IndexedDB error:', reasonStr);
      event.preventDefault(); // Prevent uncaught promise rejection crash
    }
  });

  // Polyfill / Safe Guard for window.indexedDB.open
  if (window.indexedDB && typeof window.indexedDB.open === 'function') {
    const originalOpen = window.indexedDB.open.bind(window.indexedDB);
    window.indexedDB.open = function (...args: Parameters<typeof originalOpen>) {
      try {
        const request = originalOpen(...args);
        // Intercept error events on the IDBOpenDBRequest
        request.addEventListener('error', (event) => {
          const error = request.error;
          if (
            error &&
            (error.name === 'DOMException' ||
              error.message?.includes('backing store') ||
              error.message?.includes('Internal error'))
          ) {
            console.warn('[StorageGuard] Caught IndexedDB open error on request:', error.message);
            event.stopPropagation();
          }
        });
        return request;
      } catch (error: unknown) {
        const errMessage = error instanceof Error ? error.message : String(error);
        console.warn(
          '[StorageGuard] Synchronous IndexedDB open failure caught. Using fallback.',
          errMessage,
        );

        const dummyRequest = {
          result: null,
          error: error instanceof Error ? error : new DOMException('IndexedDB restricted'),
          readyState: 'done',
          onerror: null,
          onsuccess: null,
          onupgradeneeded: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        } as unknown as IDBOpenDBRequest;

        setTimeout(() => {
          if (typeof dummyRequest.onerror === 'function') {
            dummyRequest.onerror(new Event('error') as unknown as ProgressEvent<IDBOpenDBRequest>);
          }
        }, 0);

        return dummyRequest;
      }
    };
  }
}
