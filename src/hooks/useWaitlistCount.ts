import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
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
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const fetchInitial = async () => {
      const { count: c, error } = await supabase
        .from('waitlist')
        .select('*', { count: 'exact', head: true });
      if (!error && typeof c === 'number') {
        setCount(c);
        setDisplay(formatCount(c));
      }
    };

    fetchInitial();

    channel = supabase
      .channel('waitlist_count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'waitlist' },
        async () => {
          const { count: c } = await supabase
            .from('waitlist')
            .select('*', { count: 'exact', head: true });
          if (typeof c === 'number') {
            setCount(c);
            setDisplay(formatCount(c));
            track('waitlist_count_update', { count: c });
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return { count, display };
}
