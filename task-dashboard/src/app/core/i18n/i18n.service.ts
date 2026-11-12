import { Injectable, computed, effect, signal } from '@angular/core';
import { TaskPriority, TaskStatus } from '../models/task.model';
import { ar } from './ar';
import { en } from './en';
import { Locale, Messages } from './types';

const STORAGE_KEY = 'tm-locale';
const CATALOG: Record<Locale, Messages> = { en, ar };

function readStoredLocale(): Locale {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'ar' || value === 'en' ? value : 'en';
  } catch {
    return 'en';
  }
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly localeState = signal<Locale>(readStoredLocale());

  readonly locale = this.localeState.asReadonly();
  readonly messages = computed(() => CATALOG[this.localeState()]);
  readonly dir = computed(() => (this.localeState() === 'ar' ? 'rtl' : 'ltr'));

  constructor() {
    effect(() => {
      const locale = this.localeState();
      const dir = locale === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = locale;
      document.documentElement.dir = dir;
      try {
        localStorage.setItem(STORAGE_KEY, locale);
      } catch {
        // jsdom / private mode may lack writable storage
      }
    });
  }

  t<K extends keyof Messages>(key: K): Messages[K] {
    return this.messages()[key];
  }

  fill(template: string, vars: Record<string, string | number>): string {
    return Object.entries(vars).reduce(
      (out, [key, value]) => out.replaceAll(`{${key}}`, String(value)),
      template,
    );
  }

  statusLabel(status: TaskStatus | 'all'): string {
    const m = this.messages();
    switch (status) {
      case 'all':
        return m.statusAll;
      case 'todo':
        return m.statusTodo;
      case 'in_progress':
        return m.statusInProgress;
      case 'done':
        return m.statusDone;
    }
  }

  priorityLabel(priority: TaskPriority): string {
    const m = this.messages();
    switch (priority) {
      case 'high':
        return m.priorityHigh;
      case 'medium':
        return m.priorityMedium;
      case 'low':
        return m.priorityLow;
    }
  }

  actionLabel(action: string): string {
    const m = this.messages();
    switch (action.toLowerCase()) {
      case 'created':
        return m.actionCreated;
      case 'updated':
        return m.actionUpdated;
      case 'completed':
        return m.actionCompleted;
      case 'deleted':
        return m.actionDeleted;
      default:
        return action;
    }
  }

  setLocale(locale: Locale): void {
    this.localeState.set(locale);
  }

  toggleLocale(): void {
    this.setLocale(this.localeState() === 'en' ? 'ar' : 'en');
  }
}
