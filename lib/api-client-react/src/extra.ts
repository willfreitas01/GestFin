/**
 * Hooks escritos manualmente, fora do pipeline de geração do orval
 * (que vive em ./generated/). Adicionados aqui para não correr o risco de
 * serem sobrescritos numa regeneração futura da spec OpenAPI.
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  MutationFunction,
  QueryFunction,
  QueryKey,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";

import { customFetch } from "./custom-fetch";
import type { ErrorType, BodyType } from "./custom-fetch";
import type { CategoryTotal } from "./generated/api.schemas";

type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];

export type CloseMonthlyReportInput = {
  month: string;
};

export type ClosedMonthlyReport = {
  month: string;
  closed: true;
  closedAt: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
  transactionCount: number;
  byCategory: CategoryTotal[];
};

export type ClosedMonthSummary = {
  month: string;
  closedAt: string;
};

export type ApiErrorBody = {
  error: string;
};

// ---- POST /api/reports/monthly/close ----

export const getCloseMonthlyReportUrl = () => {
  return `/api/reports/monthly/close`;
};

/**
 * @summary Close (freeze) a monthly report
 */
export const closeMonthlyReport = async (
  data: CloseMonthlyReportInput,
  options?: RequestInit,
): Promise<ClosedMonthlyReport> => {
  return customFetch<ClosedMonthlyReport>(getCloseMonthlyReportUrl(), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(data),
  });
};

export const getCloseMonthlyReportMutationOptions = <
  TError = ErrorType<ApiErrorBody>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof closeMonthlyReport>>,
    TError,
    { data: BodyType<CloseMonthlyReportInput> },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationOptions<
  Awaited<ReturnType<typeof closeMonthlyReport>>,
  TError,
  { data: BodyType<CloseMonthlyReportInput> },
  TContext
> => {
  const mutationKey = ["closeMonthlyReport"];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation &&
      "mutationKey" in options.mutation &&
      options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };

  const mutationFn: MutationFunction<
    Awaited<ReturnType<typeof closeMonthlyReport>>,
    { data: BodyType<CloseMonthlyReportInput> }
  > = (props) => {
    const { data } = props ?? {};
    return closeMonthlyReport(data, requestOptions);
  };

  return { mutationFn, ...mutationOptions };
};

export type CloseMonthlyReportMutationResult = NonNullable<
  Awaited<ReturnType<typeof closeMonthlyReport>>
>;
export type CloseMonthlyReportMutationBody = BodyType<CloseMonthlyReportInput>;
export type CloseMonthlyReportMutationError = ErrorType<ApiErrorBody>;

/**
 * @summary Close (freeze) a monthly report
 */
export const useCloseMonthlyReport = <
  TError = ErrorType<ApiErrorBody>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof closeMonthlyReport>>,
    TError,
    { data: BodyType<CloseMonthlyReportInput> },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationResult<
  Awaited<ReturnType<typeof closeMonthlyReport>>,
  TError,
  { data: BodyType<CloseMonthlyReportInput> },
  TContext
> => {
  return useMutation(getCloseMonthlyReportMutationOptions(options));
};

// ---- GET /api/reports/monthly/closed ----

export const getListClosedMonthsUrl = () => {
  return `/api/reports/monthly/closed`;
};

/**
 * @summary List all months that have been closed (frozen) by the user
 */
export const listClosedMonths = async (
  options?: RequestInit,
): Promise<ClosedMonthSummary[]> => {
  return customFetch<ClosedMonthSummary[]>(getListClosedMonthsUrl(), {
    ...options,
    method: "GET",
  });
};

export const getListClosedMonthsQueryKey = () => {
  return [`/api/reports/monthly/closed`] as const;
};

export const getListClosedMonthsQueryOptions = <
  TData = Awaited<ReturnType<typeof listClosedMonths>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<
    Awaited<ReturnType<typeof listClosedMonths>>,
    TError,
    TData
  >;
  request?: SecondParameter<typeof customFetch>;
}) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getListClosedMonthsQueryKey();

  const queryFn: QueryFunction<
    Awaited<ReturnType<typeof listClosedMonths>>
  > = ({ signal }) => listClosedMonths({ signal, ...requestOptions });

  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
    Awaited<ReturnType<typeof listClosedMonths>>,
    TError,
    TData
  > & { queryKey: QueryKey };
};

export type ListClosedMonthsQueryResult = NonNullable<
  Awaited<ReturnType<typeof listClosedMonths>>
>;
export type ListClosedMonthsQueryError = ErrorType<unknown>;

/**
 * @summary List all months that have been closed (frozen) by the user
 */
export function useListClosedMonths<
  TData = Awaited<ReturnType<typeof listClosedMonths>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<
    Awaited<ReturnType<typeof listClosedMonths>>,
    TError,
    TData
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getListClosedMonthsQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
  };
  return { ...query, queryKey: queryOptions.queryKey };
}
