export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly retryAfter?: string | null;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    retryAfter?: string | null,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
