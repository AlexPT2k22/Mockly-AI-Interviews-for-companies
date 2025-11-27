import { useEffect, useState } from 'react';
import { track } from '../lib/analytics';

function formatCount(n: number) {
  if (n < 1000) return n.toString();
  if (n < 10000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k';
  if (n < 1000000) return Math.round(n / 1000) + 'k';
  return (n / 1000000).toFixed(1) + 'M';
}

export function useWaitlistCount() {
  const [count, setCount] = useState<number | null>(null);
  const [display, setDisplay] = useState<string>('—');

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch('https://landingpagewaitlistinterview.onrender.com/api/waitlist/count');
        const result = await response.json();

        if (result.success && typeof result.count === 'number') {
          setCount(result.count);
          setDisplay(formatCount(result.count));
          track('waitlist_count_loaded', { count: result.count });
        }
      } catch (error) {
        console.error('Failed to fetch waitlist count:', error);
        // Keep default display if fetch fails
      }
    };

    fetchCount();

    // Refresh count every 30 seconds
    const interval = setInterval(fetchCount, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return { count, display };
}
