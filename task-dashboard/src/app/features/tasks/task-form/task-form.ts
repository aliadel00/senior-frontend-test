import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  Assignee,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  Task,
  TaskFormValue,
} from '../../../core/models/task.model';
import {
  dueDateValidator,
  tagsValidator,
  titleValidator,
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
    MatFormFieldModule,
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
  readonly data = inject<TaskFormDialogData>(MAT_DIALOG_DATA);

  readonly statuses = TASK_STATUSES;
  readonly priorities = TASK_PRIORITIES;
  readonly statusLabels = STATUS_LABELS;
  readonly priorityLabels = PRIORITY_LABELS;
  readonly isEdit = !!this.data.task;

  readonly form = this.fb.nonNullable.group({
    title: [this.data.task?.title ?? '', [Validators.required, titleValidator()]],
    description: [this.data.task?.description ?? '', [Validators.required, Validators.minLength(10)]],
    status: [this.data.task?.status ?? ('todo' as const), Validators.required],
    priority: [this.data.task?.priority ?? ('medium' as const), Validators.required],
    dueDate: [this.data.task?.dueDate ?? '', [Validators.required, dueDateValidator()]],
    assigneeId: [this.data.task?.assignee.id ?? '', Validators.required],
    tags: [this.data.task?.tags.join(', ') ?? '', tagsValidator()],
  });

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
    this.dialogRef.close(this.form.getRawValue());
  }
}
