export type NormalizedErrorKind =
  | 'auth'
  | 'network'
  | 'validation'
  | 'server'
  | 'timeout'
  | 'cancellation'
  | 'unknown';

export interface NormalizedError {
  kind: NormalizedErrorKind;
  message: string;
  status?: number;
  code?: string;
  requestId?: string;
  endpoint?: string;
  safeHeaders?: Record<string, string>;
  details?: unknown;
  isRetryable: boolean;
  originalName?: string;
}

export interface NormalizeErrorOptions {
  fallbackMessage?: string;
  requestId?: string;
  endpoint?: string;
  status?: number;
  safeHeaders?: Record<string, string>;
}
