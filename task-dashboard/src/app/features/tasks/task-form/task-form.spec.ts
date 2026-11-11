import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TaskForm } from './task-form';

describe('TaskForm', () => {
  let fixture: ComponentFixture<TaskForm>;
  let component: TaskForm;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskForm, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            assignees: [{ id: 'user-001', name: 'John', avatar: 'JD', email: 'j@x.com' }],
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('marks form invalid when empty', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('adds a quick tag dynamically', () => {
    component.addQuickTag('Frontend');
    expect(component.form.controls.tags.value).toContain('Frontend');
  });
});
