import { useState, useCallback, useEffect } from "react";
import { api, ApiError } from "@/lib/api";

interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: ApiError | null;
}

interface UseApiResponse<T> extends UseApiState<T> {
  refetch: () => Promise<void>;
  /** Edits the loaded data in place, e.g. with what a write through `api` returned. */
  setData: (update: (prev: T | null) => T | null) => void;
}

function asApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError(0, error instanceof Error ? error.message : "An error occurred");
}

/** Loads `url` on mount and whenever it changes. Writes go straight through `api`, so a
 * failed save never swaps the page for its load error or skeleton. */
export function useApi<T>(url: string): UseApiResponse<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const data = await api.get<T>(url);
      setState({ data, isLoading: false, error: null });
    } catch (error) {
      setState({ data: null, isLoading: false, error: asApiError(error) });
    }
  }, [url]);

  const setData = useCallback(
    (update: (prev: T | null) => T | null) =>
      setState((prev) => ({ ...prev, data: update(prev.data) })),
    []
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData,
    setData,
  };
}
