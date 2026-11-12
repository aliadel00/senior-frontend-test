import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { TaskService } from '../../core/services/task.service';
import { TaskStoreService } from '../../core/services/task-store.service';
import { TaskUiService } from '../../core/services/task-ui.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { localizeStatistic } from '../../core/i18n/localize-statistic';
import { Task, TaskFormValue, TaskStatus } from '../../core/models/task.model';
import { StatCard } from '../../shared/components/stat-card/stat-card';
import { LoadingSkeleton } from '../../shared/components/loading-skeleton/loading-skeleton';
import { TaskFiltersComponent } from '../tasks/task-filters/task-filters';
import { TaskList } from '../tasks/task-list/task-list';
import { TaskForm } from '../tasks/task-form/task-form';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-dashboard',
  imports: [
    MatSnackBarModule,
    MatDialogModule,
    StatCard,
    LoadingSkeleton,
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
  private readonly taskUi = inject(TaskUiService);
  private readonly i18n = inject(I18nService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly m = computed(() => this.i18n.messages());
  private readonly hasLoaded = signal(false);

  constructor() {
    effect(() => {
      const tick = this.taskUi.createTick();
      if (tick > 0) {
        void this.openCreate();
      }
    });

    effect(() => {
      if (this.taskService.boardTasks().length) {
        this.hasLoaded.set(true);
      }
    });
  }

  readonly busy = signal(false);
  readonly filters = this.store.filters;

  readonly tasks = computed(() => this.taskService.boardTasks());
  readonly filteredTasks = computed(() => this.store.filterTasks(this.tasks()));
  readonly assignees = computed(() => this.taskService.assigneesResource.value());

  /** Always derive from the live board so DnD/status updates numbers without refetch. */
  readonly statistics = computed(() => {
    const m = this.m();
    return this.taskService
      .computeLiveStatistics(this.tasks())
      .map((stat) => localizeStatistic(stat, m));
  });

  /** Full-page skeleton only on first load — keep the board mounted during refreshes. */
  readonly loading = computed(() => {
    if (this.hasLoaded()) {
      return false;
    }
    return this.taskService.tasksResource.isLoading();
  });

  readonly error = computed(() => this.taskService.tasksResource.error());

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
    await this.runLocalMutation(async () => {
      const created = await firstValueFrom(
        this.taskService.createTask(value, this.assignees()),
      );
      this.taskService.upsertTask(created);
      this.taskService.recordActivity({
        taskId: created.id,
        taskTitle: created.title,
        action: created.status === 'done' ? 'completed' : 'created',
        actor: created.assignee.name,
      });
      this.snackBar.open(this.m().taskCreated, this.m().dismiss, { duration: 2500 });
    });
  }

  async openEdit(task: Task): Promise<void> {
    const value = await this.openForm(task);
    if (!value) {
      return;
    }
    await this.runLocalMutation(async () => {
      const updated = await firstValueFrom(
        this.taskService.updateTask(task.id, value, this.assignees()),
      );
      this.taskService.upsertTask(updated);
      const action =
        value.status === 'done' && task.status !== 'done' ? 'completed' : 'updated';
      this.taskService.recordActivity({
        taskId: updated.id,
        taskTitle: updated.title,
        action,
        actor: updated.assignee.name,
      });
      this.snackBar.open(this.m().taskUpdated, this.m().dismiss, { duration: 2500 });
    });
  }

  async confirmDelete(task: Task): Promise<void> {
    const m = this.m();
    const confirmed = await firstValueFrom(
      this.dialog
        .open(ConfirmDialog, {
          direction: this.i18n.dir(),
          data: {
            title: m.deleteTaskTitle,
            message: this.i18n.fill(m.deleteTaskMessage, { title: task.title }),
            confirmLabel: m.delete,
            cancelLabel: m.cancel,
          },
        })
        .afterClosed(),
    );

    if (!confirmed) {
      return;
    }

    await this.runLocalMutation(async () => {
      await firstValueFrom(this.taskService.deleteTask(task.id));
      this.taskService.removeTask(task.id);
      this.taskService.recordActivity({
        taskId: task.id,
        taskTitle: task.title,
        action: 'deleted',
        actor: task.assignee.name,
      });
      this.snackBar.open(this.m().taskDeleted, this.m().dismiss, { duration: 2500 });
    });
  }

  async onReorder(event: {
    tasks: Task[];
    moved?: { task: Task; status: TaskStatus };
  }): Promise<void> {
    const scrollY = window.scrollY;
    const previous = this.taskService.boardTasks();
    // Commit board immediately — stats recompute from this snapshot.
    this.taskService.commitTasks(event.tasks);
    this.busy.set(true);
    try {
      if (event.moved) {
        const updated = await firstValueFrom(
          this.taskService.updateTaskStatus(event.moved.task, event.moved.status),
        );
        this.taskService.commitTasks(
          event.tasks.map((task) => (task.id === updated.id ? { ...task, ...updated } : task)),
        );
        this.taskService.recordActivity({
          taskId: updated.id,
          taskTitle: updated.title,
          action: event.moved.status === 'done' ? 'completed' : 'updated',
          actor: updated.assignee.name,
        });
      }
      await firstValueFrom(this.taskService.reorderTasks(event.tasks));
    } catch (err) {
      this.taskService.commitTasks(previous);
      const message = err instanceof Error ? err.message : this.m().somethingWrong;
      this.snackBar.open(message, this.m().dismiss, { duration: 4000 });
    } finally {
      this.busy.set(false);
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
        setTimeout(() => window.scrollTo(0, scrollY), 0);
      });
    }
  }

  refresh(): void {
    this.taskService.refresh();
  }

  private async openForm(task?: Task): Promise<TaskFormValue | null> {
    return firstValueFrom(
      this.dialog
        .open(TaskForm, {
          width: 'min(560px, 92vw)',
          direction: this.i18n.dir(),
          data: { task, assignees: this.assignees() },
        })
        .afterClosed(),
    );
  }

  /** Mutate locally — notifications come from recordActivity, board stays mounted. */
  private async runLocalMutation(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await action();
    } catch (err) {
      const message = err instanceof Error ? err.message : this.m().somethingWrong;
      this.snackBar.open(message, this.m().dismiss, { duration: 4000 });
      this.taskService.refresh();
    } finally {
      this.busy.set(false);
    }
  }
}
