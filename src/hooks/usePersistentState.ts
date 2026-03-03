'use client';

import { useState, useEffect, useCallback } from 'react';

export function usePersistentState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [state, setState] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setState(JSON.parse(stored));
      } catch {
        setState(defaultValue);
      }
    }
    setIsHydrated(true);
  }, [key, defaultValue]);

  const setPersistentState = useCallback((value: T | ((prev: T) => T)) => {
    setState((prev) => {
      const newValue = typeof value === 'function' 
        ? (value as (prev: T) => T)(prev)
        : value;
      localStorage.setItem(key, JSON.stringify(newValue));
      return newValue;
    });
  }, [key]);

  return [state, setPersistentState, isHydrated];
}
