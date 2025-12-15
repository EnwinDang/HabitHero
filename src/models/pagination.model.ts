export interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
}

export interface PaginatedResponse<T> {
  pagination: PaginationMeta;
  data: T[];
}
