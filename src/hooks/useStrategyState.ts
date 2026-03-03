'use client';

import { useState, useCallback, useEffect } from 'react';
import { StrategyType } from '@/lib/strategies';
import { STORAGE_KEYS } from '@/lib/constants';

export function useStrategyState(): [StrategyType, (strategy: StrategyType) => void] {
  // Default to 'opencv' for better accuracy (robust detection)
  const [strategy, setStrategyState] = useState<StrategyType>('opencv');
  const [isHydrated, setIsHydrated] = useState(false);

  // Read from sessionStorage after hydration
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEYS.STRATEGY_PREFERENCE);
    if (stored === 'canvas' || stored === 'opencv') {
      setStrategyState(stored);
    }
    setIsHydrated(true);
  }, []);

  const setStrategy = useCallback((newStrategy: StrategyType) => {
    setStrategyState(newStrategy);
    sessionStorage.setItem(STORAGE_KEYS.STRATEGY_PREFERENCE, newStrategy);
  }, []);

  return [strategy, setStrategy];
}
