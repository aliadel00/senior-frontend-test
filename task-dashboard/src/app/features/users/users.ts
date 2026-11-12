import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TaskService } from '../../core/services/task.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { LoadingSkeleton } from '../../shared/components/loading-skeleton/loading-skeleton';

@Component({
  selector: 'app-users',
  imports: [LoadingSkeleton],
  templateUrl: './users.html',
  styleUrl: './users.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Users {
  private readonly taskService = inject(TaskService);
  private readonly i18n = inject(I18nService);

  readonly m = computed(() => this.i18n.messages());
  readonly assignees = computed(() => this.taskService.assigneesResource.value());
  readonly loading = computed(() => this.taskService.assigneesResource.isLoading());
  readonly tasks = computed(() => this.taskService.boardTasks());

  taskCount(userId: string): number {
    return this.tasks().filter((task) => task.assignee.id === userId).length;
  }

  taskCountLabel(userId: string): string {
    const count = this.taskCount(userId);
    if (count === 1) {
      return this.m().tasksCountOne;
    }
    return this.i18n.fill(this.m().tasksCount, { n: count });
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
}
