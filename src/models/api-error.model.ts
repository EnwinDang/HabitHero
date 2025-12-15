export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}
