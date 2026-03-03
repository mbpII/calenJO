'use client';

import { useState, useEffect, useCallback } from 'react';

// Check if localStorage is available (handles private browsing mode)
const isLocalStorageAvailable = () => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

export function usePersistentState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [state, setState] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isStorageAvailable] = useState(() => isLocalStorageAvailable());

  useEffect(() => {
    if (!isStorageAvailable) {
      setIsHydrated(true);
      return;
    }

    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        setState(parsed);
      }
    } catch {
      // Invalid JSON or parse error, use default
      setState(defaultValue);
    }
    setIsHydrated(true);
  }, [key, defaultValue, isStorageAvailable]);

  // Listen for storage changes from other tabs (useful for multi-tab sync)
  useEffect(() => {
    if (!isStorageAvailable) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setState(JSON.parse(e.newValue));
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, isStorageAvailable]);

  const setPersistentState = useCallback((value: T | ((prev: T) => T)) => {
    setState((prev) => {
      const newValue = typeof value === 'function' 
        ? (value as (prev: T) => T)(prev)
        : value;
      
      if (isStorageAvailable) {
        try {
          localStorage.setItem(key, JSON.stringify(newValue));
        } catch (e) {
          // Storage quota exceeded or other error - gracefully fall back to memory only
          console.warn('Failed to save to localStorage:', e);
        }
      }
      
      return newValue;
    });
  }, [key, isStorageAvailable]);

  return [state, setPersistentState, isHydrated];
}
