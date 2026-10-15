export class APIError extends Error {
  public code: string;
  public status: number;
  public details?: Record<string, unknown>;
  public recoverable: boolean;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    status: number = 500,
    details?: Record<string, unknown>,
    recoverable: boolean = true
  ) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.recoverable = recoverable;
  }

  static fromResponse(response: Response, data?: unknown): APIError {
    const status = response.status;
    let code = 'UNKNOWN_ERROR';
    let message = '请求失败';
    let recoverable = true;

    if (status === 400) {
      code = 'BAD_REQUEST';
      message = '请求参数错误';
    } else if (status === 401) {
      code = 'UNAUTHORIZED';
      message = '未授权，请重新登录';
      recoverable = false;
    } else if (status === 403) {
      code = 'FORBIDDEN';
      message = '没有权限访问此资源';
      recoverable = false;
    } else if (status === 404) {
      code = 'NOT_FOUND';
      message = '请求的资源不存在';
    } else if (status === 408) {
      code = 'REQUEST_TIMEOUT';
      message = '请求超时，请重试';
    } else if (status === 429) {
      code = 'RATE_LIMITED';
      message = '请求过于频繁，请稍后再试';
    } else if (status >= 500) {
      code = 'SERVER_ERROR';
      message = '服务器错误，请稍后再试';
    }

    if (data && typeof data === 'object' && 'detail' in data) {
      message = String((data as { detail: unknown }).detail);
    }

    return new APIError(message, code, status, data as Record<string, unknown>, recoverable);
  }

  static networkError(): APIError {
    return new APIError(
      '网络连接失败，请检查网络设置',
      'NETWORK_ERROR',
      0,
      undefined,
      true
    );
  }

  static timeoutError(): APIError {
    return new APIError(
      '请求超时，请重试',
      'TIMEOUT_ERROR',
      0,
      undefined,
      true
    );
  }

  static parseError(originalError: Error): APIError {
    return new APIError(
      '数据解析错误',
      'PARSE_ERROR',
      0,
      { originalError: originalError.message },
      true
    );
  }
}

export class StreamError extends Error {
  public code: string;
  public recoverable: boolean;

  constructor(message: string, code: string = 'STREAM_ERROR', recoverable: boolean = true) {
    super(message);
    this.name = 'StreamError';
    this.code = code;
    this.recoverable = recoverable;
  }

  static connectionLost(): StreamError {
    return new StreamError('流式连接中断', 'CONNECTION_LOST', true);
  }

  static parseError(): StreamError {
    return new StreamError('流式数据解析错误', 'PARSE_ERROR', true);
  }

  static serverError(message: string): StreamError {
    return new StreamError(message, 'SERVER_ERROR', true);
  }
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof APIError) {
    return error.recoverable && [0, 408, 429, 500, 502, 503, 504].includes(error.status);
  }
  if (error instanceof StreamError) {
    return error.recoverable;
  }
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  return false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    backoff?: boolean;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, delay = 1000, backoff = true, onRetry } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error;
      }
      
      if (onRetry) {
        onRetry(attempt, lastError);
      }
      
      const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof APIError) {
    return error.message;
  }
  if (error instanceof StreamError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '发生未知错误';
}

export function getErrorAction(error: unknown): { label: string; action: () => void } | null {
  if (error instanceof APIError) {
    if (error.code === 'UNAUTHORIZED') {
      return {
        label: '重新登录',
        action: () => {
          window.location.href = '/login';
        },
      };
    }
    if (error.recoverable) {
      return {
        label: '重试',
        action: () => {
          window.location.reload();
        },
      };
    }
  }
  if (isRetryableError(error)) {
    return {
      label: '重试',
      action: () => {
        window.location.reload();
      },
    };
  }
  return null;
}
