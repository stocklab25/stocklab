'use client';

import { SWRConfig } from 'swr';

export default function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        // Disable global fetcher since hooks use their own authenticated fetchers
        fetcher: undefined,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateOnMount: true, // Changed back to true to enable data fetching
        revalidateIfStale: false,
        dedupingInterval: 0, // Disable deduplication
        focusThrottleInterval: 0, // Disable focus throttling
        errorRetryCount: 0, // Disable error retries
        errorRetryInterval: 0,
        refreshInterval: 0, // Disable automatic refresh
        refreshWhenHidden: false,
        refreshWhenOffline: false,
        shouldRetryOnError: false, // Disable retry on error
      }}
    >
      {children}
    </SWRConfig>
  );
} 
