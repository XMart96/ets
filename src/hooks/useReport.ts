import { errorText } from "@/api/errors";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Loads a report: on mount and whenever `key` changes, on pull-to-refresh, and
 * every `pollMs` if given. A response to an outdated request is dropped.
 */
export function useReport<T>(
  fetcher: () => Promise<T>,
  key: string,
  pollMs: number | null = null,
) {
  const [data, setData] = useState<T | null>(null);
  // key whose first load has finished; loading = the current key is not it
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const fetcherRef = useRef(fetcher);
  // declared before the load effect, so load always sees the latest fetcher
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    try {
      const result = await fetcherRef.current();
      if (request !== requestRef.current) return;
      setError(null);
      setData(result);
    } catch (e) {
      if (request !== requestRef.current) return;
      setError(errorText(e));
    }
  }, []);

  // `key` stands for everything the fetcher depends on: reload when it changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => setLoadedKey(key));
  }, [load, key]);

  useEffect(() => {
    if (pollMs === null) return;
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
  }, [load, pollMs]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return { data, loading: loadedKey !== key, refreshing, error, refresh };
}
