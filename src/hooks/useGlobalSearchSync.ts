import * as React from 'react';
import { useApp } from '@/contexts/app-context';

/**
 * useGlobalSearchSync — Synchronizes workspace-level search with the shell Global Search bar.
 *
 * - When user types into the topbar Global Search, the local query updates automatically.
 * - When user types into the in-page search bar, the topbar Global Search reflects it.
 * - Calling handleSearchChange provides a single unified handler for <Input onChange={...} />.
 */
export function useGlobalSearchSync(
  localQuery: string,
  setLocalQuery: (val: string) => void
) {
  const { globalSearchQuery, setGlobalSearchQuery } = useApp();

  // Sync global query into local state if they diverge
  React.useEffect(() => {
    if (globalSearchQuery !== undefined && globalSearchQuery !== localQuery) {
      setLocalQuery(globalSearchQuery);
    }
  }, [globalSearchQuery, localQuery, setLocalQuery]);

  // Synchronized input change handler
  const handleSearchChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement> | string) => {
      const val = typeof e === 'string' ? e : e.target.value;
      setLocalQuery(val);
      setGlobalSearchQuery(val);
    },
    [setLocalQuery, setGlobalSearchQuery]
  );

  const clearSearch = React.useCallback(() => {
    setLocalQuery('');
    setGlobalSearchQuery('');
  }, [setLocalQuery, setGlobalSearchQuery]);

  return {
    searchQuery: localQuery,
    setSearchQuery: setLocalQuery,
    handleSearchChange,
    clearSearch,
    globalSearchQuery,
  };
}
