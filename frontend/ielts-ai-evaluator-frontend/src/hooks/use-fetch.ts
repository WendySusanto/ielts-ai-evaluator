import { useState, useCallback, useEffect } from "react";
import { AxiosRequestConfig } from "axios";
import ApiResponse from "@/types/ApiResponse";
import axiosInstance from "@/lib/axiosInstance";

interface UseFetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

interface UseFetchOptions extends AxiosRequestConfig {
  skipInitialFetch?: boolean;
}

interface MutateOptions<T, R = T> {
  url?: string;
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  data?: R;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseFetchResponse<T> extends UseFetchState<T> {
  refetch: () => Promise<void>;
  mutate: <R>(options: MutateOptions<T, R>) => Promise<void>;
}

export function useFetch<T>(
  url: string,
  config?: UseFetchOptions
): UseFetchResponse<T> {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const response = await axiosInstance<ApiResponse<T>>(url, {
        ...config,
        headers: {
          "Content-Type": "application/json",
          ...config?.headers,
        },
      });

      setState({ data: response.data.data, isLoading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        isLoading: false,
        error: error instanceof Error ? error : new Error("An error occurred"),
      });
    }
  }, [url, config]);

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

        const response = await axiosInstance<T>({
          url,
          method,
          data,
          headers: {
            "Content-Type": "application/json",
            ...config?.headers,
          },
          ...config,
        });

        setState((prev) => ({
          ...prev,
          data: response.data,
          isLoading: false,
        }));
        onSuccess?.(response.data);
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error("An error occurred");
        setState((prev) => ({ ...prev, error: err, isLoading: false }));
        onError?.(err);
      }
    },
    [url, config]
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
