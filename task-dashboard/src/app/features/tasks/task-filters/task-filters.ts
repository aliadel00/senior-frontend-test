import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  Assignee,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TaskFilters,
  TaskPriority,
  TaskStatus,
} from '../../../core/models/task.model';

@Component({
  selector: 'app-task-filters',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './task-filters.html',
  styleUrl: './task-filters.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFiltersComponent {
  readonly filters = input.required<TaskFilters>();
  readonly assignees = input.required<Assignee[]>();
  readonly statusChange = output<TaskStatus | 'all'>();
  readonly priorityChange = output<TaskPriority | 'all'>();
  readonly assigneeChange = output<string | 'all'>();
  readonly searchChange = output<string>();
  readonly cleared = output<void>();

  readonly statuses = TASK_STATUSES;
  readonly priorities = TASK_PRIORITIES;
  readonly statusLabels = STATUS_LABELS;
  readonly priorityLabels = PRIORITY_LABELS;
}
