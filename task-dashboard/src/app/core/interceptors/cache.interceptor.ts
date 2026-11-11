import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, tap } from 'rxjs';

/** Simple in-memory GET cache keyed by full request URL. */
const cache = new Map<string, HttpResponse<unknown>>();

/**
 * Caches successful GET responses for task/statistics reads.
 * Mutations clear the cache so subsequent reads stay fresh.
 */
export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (isMutating) {
    cache.clear();
    return next(req);
  }

  if (req.method !== 'GET' || req.headers.get('x-skip-cache') === '1') {
    return next(req);
  }

  const cached = cache.get(req.urlWithParams);
  if (cached) {
    return of(cached.clone());
  }

  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse && event.ok) {
        cache.set(req.urlWithParams, event.clone());
      }
    }),
  );
};

/** Clears the HTTP GET cache (used by tests and force-refresh flows). */
export function clearHttpCache(): void {
  cache.clear();
}
