import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Rejects titles that are empty or shorter than 3 characters after trim. */
export function titleValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return { required: true };
    }
    if (value.length < 3) {
      return { minTitleLength: { requiredLength: 3, actualLength: value.length } };
    }
    return null;
  };
}

/** Ensures due date is a valid Date or ISO date string (YYYY-MM-DD). */
export function dueDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value == null || value === '') {
      return { required: true };
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? { invalidDate: true } : null;
    }

    const raw = String(value).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return { invalidDate: true };
    }
    const parsed = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return { invalidDate: true };
    }
    return null;
  };
}

/** Validates comma-separated tags (max 5, each max 20 chars). */
export function tagsValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = String(control.value ?? '').trim();
    if (!raw) {
      return null;
    }
    const tags = raw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length > 5) {
      return { maxTags: { max: 5, actual: tags.length } };
    }
    if (tags.some((t) => t.length > 20)) {
      return { tagTooLong: { max: 20 } };
    }
    return null;
  };
}

/** Parses an API ISO date (YYYY-MM-DD) into a local Date for the calendar. */
export function parseIsoDate(value?: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Formats a Date (or ISO string) to YYYY-MM-DD for the API. */
export function toIsoDate(value: Date | string | null | undefined): string {
  if (value == null || value === '') {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return '';
  }
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
