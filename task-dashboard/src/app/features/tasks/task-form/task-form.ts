import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { I18nService } from '../../../core/i18n/i18n.service';
import {
  Assignee,
  TASK_PRIORITIES,
  TASK_STATUSES,
  Task,
  TaskFormValue,
  TaskPriority,
  TaskStatus,
} from '../../../core/models/task.model';
import {
  dueDateValidator,
  parseIsoDate,
  tagsValidator,
  titleValidator,
  toIsoDate,
} from '../../../core/validators/task.validators';

export interface TaskFormDialogData {
  task?: Task;
  assignees: Assignee[];
}

@Component({
  selector: 'app-task-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './task-form.html',
  styleUrl: './task-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskForm {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<TaskForm, TaskFormValue | null>);
  private readonly i18n = inject(I18nService);
  private readonly dateAdapter = inject(DateAdapter);
  readonly data = inject<TaskFormDialogData>(MAT_DIALOG_DATA);

  readonly statuses = TASK_STATUSES;
  readonly priorities = TASK_PRIORITIES;
  readonly isEdit = !!this.data.task;
  readonly m = computed(() => this.i18n.messages());

  readonly form = this.fb.nonNullable.group({
    title: [this.data.task?.title ?? '', [Validators.required, titleValidator()]],
    description: [this.data.task?.description ?? '', [Validators.required, Validators.minLength(10)]],
    status: [this.data.task?.status ?? ('todo' as const), Validators.required],
    priority: [this.data.task?.priority ?? ('medium' as const), Validators.required],
    dueDate: [parseIsoDate(this.data.task?.dueDate) as Date | null, [Validators.required, dueDateValidator()]],
    assigneeId: [this.data.task?.assignee.id ?? '', Validators.required],
    tags: [this.data.task?.tags.join(', ') ?? '', tagsValidator()],
  });

  constructor() {
    effect(() => {
      this.dateAdapter.setLocale(this.i18n.locale() === 'ar' ? 'ar' : 'en-US');
    });
  }

  statusLabel(status: TaskStatus): string {
    return this.i18n.statusLabel(status);
  }

  priorityLabel(priority: TaskPriority): string {
    return this.i18n.priorityLabel(priority);
  }

  /** Dynamically exposes a tags control helper for tests / future expansions. */
  addQuickTag(tag: string): void {
    const current = this.form.controls.tags.value;
    const next = current ? `${current}, ${tag}` : tag;
    this.form.controls.tags.setValue(next);
    this.form.controls.tags.markAsDirty();
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const value: TaskFormValue = {
      ...raw,
      dueDate: toIsoDate(raw.dueDate),
    };
    this.dialogRef.close(value);
  }
}
