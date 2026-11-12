import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNativeDateAdapter } from '@angular/material/core';
import { routes } from './app.routes';
import { cacheInterceptor } from './core/interceptors/cache.interceptor';
import { retryInterceptor } from './core/interceptors/retry.interceptor';
import { staticMockInterceptor } from './core/interceptors/static-mock.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Shell owns scroll (Tasks board / Dashboard top). Router jumps cause stutter.
      withInMemoryScrolling({
        scrollPositionRestoration: 'disabled',
        anchorScrolling: 'disabled',
      }),
    ),
    provideHttpClient(
      withInterceptors([staticMockInterceptor, cacheInterceptor, retryInterceptor]),
    ),
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
  ],
};
