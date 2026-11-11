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

/** Ensures due date is a valid ISO date string (YYYY-MM-DD). */
export function dueDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return { required: true };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return { invalidDate: true };
    }
    const parsed = new Date(value);
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
