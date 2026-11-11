import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { firstValueFrom } from 'rxjs';
import { TaskService } from '../../core/services/task.service';
import { TaskStoreService } from '../../core/services/task-store.service';
import { Task, TaskFormValue, TaskStatus } from '../../core/models/task.model';
import { StatCard } from '../../shared/components/stat-card/stat-card';
import { LoadingSkeleton } from '../../shared/components/loading-skeleton/loading-skeleton';
import { ActivityFeed } from '../../shared/components/activity-feed/activity-feed';
import { PriorityChart } from '../../shared/components/priority-chart/priority-chart';
import { StatusChart } from '../../shared/components/status-chart/status-chart';
import { TaskFiltersComponent } from '../tasks/task-filters/task-filters';
import { TaskList } from '../tasks/task-list/task-list';
import { TaskForm } from '../tasks/task-form/task-form';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-dashboard',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule,
    MatCardModule,
    StatCard,
    LoadingSkeleton,
    ActivityFeed,
    PriorityChart,
    StatusChart,
    TaskFiltersComponent,
    TaskList,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly taskService = inject(TaskService);
  private readonly store = inject(TaskStoreService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly busy = signal(false);
  readonly filters = this.store.filters;

  readonly tasks = computed(() => this.taskService.tasksResource.value().tasks);
  readonly filteredTasks = computed(() => this.store.filterTasks(this.tasks()));
  readonly assignees = computed(() => this.taskService.assigneesResource.value());
  readonly activity = computed(() => this.taskService.activityResource.value());
  readonly statistics = computed(() => {
    const apiStats = this.taskService.statisticsResource.value().statistics;
    return apiStats.length ? apiStats : this.taskService.computeLiveStatistics(this.tasks());
  });

  readonly loading = computed(
    () =>
      this.taskService.tasksResource.isLoading() ||
      this.taskService.statisticsResource.isLoading(),
  );

  readonly error = computed(
    () =>
      this.taskService.tasksResource.error() ||
      this.taskService.statisticsResource.error(),
  );

  onStatusChange(status: TaskStatus | 'all'): void {
    this.store.setStatus(status);
  }

  onPriorityChange(priority: 'high' | 'medium' | 'low' | 'all'): void {
    this.store.setPriority(priority);
  }

  onAssigneeChange(assigneeId: string | 'all'): void {
    this.store.setAssignee(assigneeId);
  }

  onSearchChange(search: string): void {
    this.store.setSearch(search);
  }

  resetFilters(): void {
    this.store.resetFilters();
  }

  async openCreate(): Promise<void> {
    const value = await this.openForm();
    if (!value) {
      return;
    }
    await this.runMutation(async () => {
      await firstValueFrom(this.taskService.createTask(value, this.assignees()));
      this.snackBar.open('Task created', 'Dismiss', { duration: 2500 });
    });
  }

  async openEdit(task: Task): Promise<void> {
    const value = await this.openForm(task);
    if (!value) {
      return;
    }
    await this.runMutation(async () => {
      await firstValueFrom(this.taskService.updateTask(task.id, value, this.assignees()));
      this.snackBar.open('Task updated', 'Dismiss', { duration: 2500 });
    });
  }

  async confirmDelete(task: Task): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialog
        .open(ConfirmDialog, {
          data: {
            title: 'Delete task',
            message: `Delete "${task.title}"? This cannot be undone.`,
            confirmLabel: 'Delete',
          },
        })
        .afterClosed(),
    );

    if (!confirmed) {
      return;
    }

    await this.runMutation(async () => {
      await firstValueFrom(this.taskService.deleteTask(task.id));
      this.snackBar.open('Task deleted', 'Dismiss', { duration: 2500 });
    });
  }

  async onReorder(event: {
    tasks: Task[];
    moved?: { task: Task; status: TaskStatus };
  }): Promise<void> {
    await this.runMutation(async () => {
      if (event.moved) {
        await firstValueFrom(
          this.taskService.updateTaskStatus(event.moved.task, event.moved.status),
        );
      }
      await firstValueFrom(this.taskService.reorderTasks(event.tasks));
    });
  }

  refresh(): void {
    this.taskService.refresh();
  }

  private async openForm(task?: Task): Promise<TaskFormValue | null> {
    return firstValueFrom(
      this.dialog
        .open(TaskForm, {
          width: '560px',
          data: { task, assignees: this.assignees() },
        })
        .afterClosed(),
    );
  }

  private async runMutation(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await action();
      this.taskService.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      this.snackBar.open(message, 'Dismiss', { duration: 4000 });
    } finally {
      this.busy.set(false);
    }
  }
}
