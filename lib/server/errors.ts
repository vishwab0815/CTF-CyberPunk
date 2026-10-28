/** An error that is safe to show to the client, with an HTTP status. */
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const unauthorized = () => new AppError(401, 'unauthorized', 'Start a session first.');
export const forbidden = (msg = 'Not allowed.') => new AppError(403, 'forbidden', msg);
export const notFound = (msg = 'Not found.') => new AppError(404, 'not_found', msg);
export const badRequest = (msg: string) => new AppError(400, 'bad_request', msg);
export const tooMany = (retryAfterMs: number) =>
  new AppError(429, 'rate_limited', 'Too many requests. Slow down and try again shortly.', { retryAfterMs });
