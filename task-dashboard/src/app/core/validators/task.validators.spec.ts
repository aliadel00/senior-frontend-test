import { FormControl } from '@angular/forms';
import { dueDateValidator, tagsValidator, titleValidator } from './task.validators';

describe('task validators', () => {
  it('validates title length', () => {
    const control = new FormControl('ab');
    expect(titleValidator()(control)).toEqual({
      minTitleLength: { requiredLength: 3, actualLength: 2 },
    });
    control.setValue('Ship it');
    expect(titleValidator()(control)).toBeNull();
  });

  it('validates due dates', () => {
    expect(dueDateValidator()(new FormControl('2026-13-40'))).toEqual({ invalidDate: true });
    expect(dueDateValidator()(new FormControl('2026-11-11'))).toBeNull();
  });

  it('validates tags', () => {
    expect(tagsValidator()(new FormControl('a,b,c,d,e,f'))).toEqual({
      maxTags: { max: 5, actual: 6 },
    });
    expect(tagsValidator()(new FormControl('frontend, api'))).toBeNull();
  });
});
