import { useState, useCallback, useEffect } from "react";
import { api, ApiError } from "@/lib/api";

interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: ApiError | null;
}

interface UseApiOptions {
  skipInitialFetch?: boolean;
}

interface MutateOptions<T, R = T> {
  url?: string;
  method?: "POST" | "PUT" | "DELETE";
  data?: R;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
}

interface UseApiResponse<T> extends UseApiState<T> {
  refetch: () => Promise<void>;
  mutate: <R>(options: MutateOptions<T, R>) => Promise<void>;
}

function asApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError(0, error instanceof Error ? error.message : "An error occurred");
}

export function useApi<T>(
  url: string,
  config?: UseApiOptions
): UseApiResponse<T> {
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

  const mutate = useCallback(
    async <R>({
      url,
      method = "POST",
      data,
      onSuccess,
      onError,
    }: MutateOptions<T, R>): Promise<void> => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const requestUrl = url ?? "";
        const response =
          method === "PUT"
            ? await api.put<T>(requestUrl, data)
            : method === "DELETE"
              ? await api.delete<T>(requestUrl)
              : await api.post<T>(requestUrl, data);

        setState((prev) => ({ ...prev, data: response, isLoading: false }));
        onSuccess?.(response);
      } catch (error) {
        const err = asApiError(error);
        setState((prev) => ({ ...prev, error: err, isLoading: false }));
        onError?.(err);
      }
    },
    []
  );

  useEffect(() => {
    if (!config?.skipInitialFetch) {
      fetchData();
    }
  }, [url, config?.skipInitialFetch]);

  return {
    ...state,
    refetch: fetchData,
    mutate,
  };
}
