import { useRef, useEffect } from 'react';

export const useNextTick = (ticker: () => void, delay: number = 0) => {
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    }
  }, []);

  return () => {
    timer.current = setTimeout(ticker, delay);
  }
}
