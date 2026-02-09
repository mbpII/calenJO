'use client';

import { useState, useCallback, useEffect } from 'react';
import { StrategyType } from '@/lib/strategies';

const STORAGE_KEY = 'calcSync-strategy';

export function useStrategyState(): [StrategyType, (strategy: StrategyType) => void] {
  // Default to 'canvas' for SSR to avoid hydration mismatch
  const [strategy, setStrategyState] = useState<StrategyType>('canvas');
  const [isHydrated, setIsHydrated] = useState(false);

  // Read from sessionStorage after hydration
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === 'canvas' || stored === 'opencv') {
      setStrategyState(stored);
    }
    setIsHydrated(true);
  }, []);

  const setStrategy = useCallback((newStrategy: StrategyType) => {
    setStrategyState(newStrategy);
    sessionStorage.setItem(STORAGE_KEY, newStrategy);
  }, []);

  return [strategy, setStrategy];
}
