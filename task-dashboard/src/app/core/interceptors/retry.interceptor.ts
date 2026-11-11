import { HttpInterceptorFn } from '@angular/common/http';
import { retry, timer } from 'rxjs';

/**
 * Retries failed GET requests up to twice with exponential backoff.
 */
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') {
    return next(req);
  }

  return next(req).pipe(
    retry({
      count: 2,
      delay: (_error, retryCount) => timer(retryCount * 300),
    }),
  );
};
