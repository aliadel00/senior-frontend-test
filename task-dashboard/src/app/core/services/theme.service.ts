import { Injectable, effect, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'tm-theme';

function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark') {
      return value;
    }
  } catch {
    // jsdom / private mode
  }
  if (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
}

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themeState = signal<Theme>(readStoredTheme());
  private transitioning = false;

  readonly theme = this.themeState.asReadonly();

  constructor() {
    applyTheme(this.themeState());
    effect(() => {
      const theme = this.themeState();
      applyTheme(theme);
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // jsdom / private mode may lack writable storage
      }
    });
  }

  setTheme(theme: Theme): void {
    this.themeState.set(theme);
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // jsdom / private mode
    }
  }

  toggle(): void {
    this.setTheme(this.themeState() === 'dark' ? 'light' : 'dark');
  }

  async toggleAnimated(): Promise<void> {
    const next: Theme = this.themeState() === 'dark' ? 'light' : 'dark';
    await this.setThemeAnimated(next);
  }

  /** Soft whole-app fade on every viewport. */
  async setThemeAnimated(next: Theme): Promise<void> {
    if (this.transitioning || this.themeState() === next) {
      return;
    }

    if (prefersReducedMotion()) {
      this.setTheme(next);
      return;
    }

    this.transitioning = true;
    const root = document.documentElement;
    root.classList.add('tm-theme-fading');
    // Allow the fade class to paint, then swap tokens and settle.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        this.setTheme(next);
        window.setTimeout(() => {
          root.classList.remove('tm-theme-fading');
          this.transitioning = false;
        }, 280);
      });
    });
  }
}
