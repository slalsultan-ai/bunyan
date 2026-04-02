'use client';
import { useState, useEffect, useRef } from 'react';

// In-memory cache shared across all hook instances
let featuresCache: Record<string, boolean> | null = null;
let fetchPromise: Promise<Record<string, boolean>> | null = null;

async function fetchFeatures(): Promise<Record<string, boolean>> {
  try {
    const res = await fetch('/api/features');
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

function getFeatures(): Promise<Record<string, boolean>> {
  if (featuresCache) return Promise.resolve(featuresCache);
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetchFeatures().then((data) => {
    featuresCache = data;
    fetchPromise = null;
    return data;
  });
  return fetchPromise;
}

// Allow external cache invalidation (e.g. after admin toggle)
export function invalidateFeatureCache() {
  featuresCache = null;
  fetchPromise = null;
}

export function useFeatureFlag(flagKey: string): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    getFeatures().then((features) => {
      if (mounted.current) {
        setEnabled(features[flagKey] ?? false);
        setLoading(false);
      }
    });
    return () => { mounted.current = false; };
  }, [flagKey]);

  return { enabled, loading };
}
