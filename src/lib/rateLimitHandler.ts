import { toast } from 'sonner';

export interface RateLimitError {
  message: string;
  retryAfter?: number;
  limit?: number;
  remaining?: number;
}

export const handleRateLimitError = (error: any): boolean => {
  // Check for common rate limit indicators
  const errorMessage = error?.message?.toLowerCase() || '';
  const statusCode = error?.status || error?.code;

  // HTTP 429 Too Many Requests
  if (statusCode === 429 || errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    const retryAfter = error?.retryAfter || error?.headers?.['retry-after'] || 60;
    const remaining = error?.remaining || 0;

    let message = 'Too many requests. Please slow down.';
    
    if (retryAfter) {
      const minutes = Math.ceil(retryAfter / 60);
      message += ` Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
    }

    if (remaining !== undefined) {
      message += ` (${remaining} requests remaining)`;
    }

    toast.error(message, {
      duration: 5000,
      action: retryAfter ? {
        label: 'Retry',
        onClick: () => {
          setTimeout(() => window.location.reload(), retryAfter * 1000);
        },
      } : undefined,
    });

    return true;
  }

  // Quota exceeded
  if (errorMessage.includes('quota') || errorMessage.includes('quota exceeded')) {
    toast.error('API quota exceeded. Please try again later or upgrade your plan.', {
      duration: 8000,
    });
    return true;
  }

  return false;
};

export const checkRateLimit = (headers: Headers): RateLimitError | null => {
  const remaining = headers.get('x-ratelimit-remaining');
  const limit = headers.get('x-ratelimit-limit');
  const retryAfter = headers.get('retry-after');

  if (remaining && parseInt(remaining) < 5) {
    return {
      message: `You have ${remaining} requests remaining. Please slow down.`,
      remaining: parseInt(remaining),
      limit: limit ? parseInt(limit) : undefined,
      retryAfter: retryAfter ? parseInt(retryAfter) : undefined,
    };
  }

  return null;
};




