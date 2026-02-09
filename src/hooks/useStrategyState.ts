'use client';

import { useState, useCallback } from 'react';
import { StrategyType } from '@/lib/strategies';

const STORAGE_KEY = 'calcSync-strategy';

function getInitialStrategy(): StrategyType {
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === 'canvas' || stored === 'opencv') {
      return stored;
    }
  }
  return 'canvas';
}

export function useStrategyState(): [StrategyType, (strategy: StrategyType) => void] {
  const [strategy, setStrategyState] = useState<StrategyType>(getInitialStrategy);

  const setStrategy = useCallback((newStrategy: StrategyType) => {
    setStrategyState(newStrategy);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, newStrategy);
    }
  }, []);

  return [strategy, setStrategy];
}
