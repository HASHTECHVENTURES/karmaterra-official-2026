// Helper functions for API calls with retry and error handling

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  retryableErrors?: number[];
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableErrors: [408, 429, 500, 502, 503, 504],
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries!; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if error is retryable
      const status = error?.status || error?.code || error?.statusCode;
      const isRetryable = 
        opts.retryableErrors?.includes(status) ||
        error?.message?.includes('network') ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('ECONNREFUSED');

      if (attempt < opts.maxRetries! && isRetryable) {
        const delay = opts.retryDelay! * Math.pow(2, attempt); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

export function getErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error?.message) return error.error.message;
  if (error?.details) return error.details;
  return 'An unexpected error occurred. Please try again.';
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const message = String(error.message || '').toLowerCase();
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    error.code === 'NETWORK_ERROR' ||
    error.status === 0
  );
}




