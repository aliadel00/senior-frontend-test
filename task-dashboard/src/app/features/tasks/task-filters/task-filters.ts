import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../../../core/i18n/i18n.service';
import {
  Assignee,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TaskFilters,
  TaskPriority,
  TaskStatus,
} from '../../../core/models/task.model';

@Component({
  selector: 'app-task-filters',
  imports: [FormsModule, MatIconModule],
  templateUrl: './task-filters.html',
  styleUrl: './task-filters.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFiltersComponent {
  private readonly i18n = inject(I18nService);

  readonly filters = input.required<TaskFilters>();
  readonly assignees = input.required<Assignee[]>();
  readonly statusChange = output<TaskStatus | 'all'>();
  readonly priorityChange = output<TaskPriority | 'all'>();
  readonly assigneeChange = output<string | 'all'>();
  readonly searchChange = output<string>();
  readonly cleared = output<void>();
  readonly createRequested = output<void>();

  readonly statuses = TASK_STATUSES;
  readonly priorities = TASK_PRIORITIES;
  readonly m = computed(() => this.i18n.messages());

  /** Empty string keeps the Priority placeholder visible when no filter is active. */
  readonly priorityValue = computed(() =>
    this.filters().priority === 'all' ? '' : this.filters().priority,
  );

  /** Empty string keeps the Assignee placeholder visible when no filter is active. */
  readonly assigneeValue = computed(() =>
    this.filters().assigneeId === 'all' ? '' : this.filters().assigneeId,
  );

  readonly statusTabs = computed(() => {
    const m = this.m();
    return [
      { value: 'all' as const, label: m.statusAll },
      { value: 'todo' as const, label: m.statusTodo },
      { value: 'in_progress' as const, label: m.statusInProgress },
      { value: 'done' as const, label: m.statusDone },
    ];
  });

  priorityLabel(priority: TaskPriority): string {
    return this.i18n.priorityLabel(priority);
  }

  onPriorityChange(value: string): void {
    this.priorityChange.emit((value || 'all') as TaskPriority | 'all');
  }

  onAssigneeChange(value: string): void {
    this.assigneeChange.emit((value || 'all') as string | 'all');
  }
}
