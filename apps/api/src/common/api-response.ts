export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
}

export const ok = <T>(data: T): ApiResponse<T> => ({
  code: 0,
  message: "ok",
  data,
});

export const emptyPage = <T>(page = 1, pageSize = 20) => ({
  list: [] as T[],
  total: 0,
  page,
  pageSize,
});
