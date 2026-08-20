import { useNavigate, useRouterState } from "@tanstack/react-router";

/**
 * Generic module routes are data-driven, so paths are plain strings rather than
 * literal route types. These helpers keep the necessary casts in one place.
 */
export function useModuleNavigate() {
  const navigate = useNavigate();
  return (path: string, search?: Record<string, string | undefined>) => {
    void navigate({ to: path, search: search ?? {} } as never);
  };
}

export function useModuleSearch(): Record<string, string | undefined> {
  return useRouterState({
    select: (s) => (s.location.search ?? {}) as Record<string, string | undefined>,
  });
}
