import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActivityItem,
  Assignee,
  Statistic,
  StatisticsResponse,
  Task,
  TaskFormValue,
  TasksResponse,
} from '../models/task.model';

/**
 * Data-access service for tasks, statistics, assignees, and activity.
 * Reads use Angular `httpResource`; writes use `HttpClient`.
 * Local board overrides avoid refetching cards after DnD / status changes.
 */
@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** Bump to force httpResource reloads after mutations. */
  private readonly refreshToken = signal(0);
  /** Optimistic / locally committed board — skips task list refetch. */
  private readonly localTasks = signal<Task[] | null>(null);
  /**
   * Session notification stack. Once the first mutation is recorded, this list
   * owns the feed (seeded from remote) so server echoes of the same action are
   * not counted again. Every recordActivity() prepends a unique item.
   */
  private readonly sessionNotifications = signal<ActivityItem[] | null>(null);
  private activitySeq = 0;

  readonly tasksResource = httpResource<TasksResponse>(
    () => {
      this.refreshToken();
      return `${this.apiUrl}/tasks-response`;
    },
    { defaultValue: { tasks: [], meta: { totalCount: 0, lastUpdated: '' } } },
  );

  readonly statisticsResource = httpResource<StatisticsResponse>(
    () => {
      this.refreshToken();
      return `${this.apiUrl}/statistics-response`;
    },
    {
      defaultValue: { statistics: [], lastUpdated: '' },
    },
  );

  readonly assigneesResource = httpResource<Assignee[]>(
    () => {
      this.refreshToken();
      return `${this.apiUrl}/assignees`;
    },
    { defaultValue: [] },
  );

  readonly activityResource = httpResource<ActivityItem[]>(
    () => {
      this.refreshToken();
      return `${this.apiUrl}/activity`;
    },
    { defaultValue: [] },
  );

  /** Tasks shown on the board — local commit wins over the last HTTP snapshot. */
  readonly boardTasks = computed(
    () => this.localTasks() ?? this.tasksResource.value().tasks,
  );

  /**
   * Notification / analytics feed.
   * Before any session mutation: remote history.
   * After mutations: session stack only (one entry per action, unique id).
   */
  readonly activityFeed = computed(
    () => this.sessionNotifications() ?? this.activityResource.value().slice(0, 40),
  );

  /** Replace the board snapshot after DnD / bulk local edits. */
  commitTasks(tasks: Task[]): void {
    this.localTasks.set(tasks);
  }

  /**
   * Records one new notification for a board change.
   * Always a fresh id — same task can accumulate many distinct notifications.
   */
  recordActivity(input: {
    taskId: string;
    taskTitle: string;
    action: 'created' | 'updated' | 'completed' | 'deleted';
    actor?: string;
  }): ActivityItem {
    this.activitySeq += 1;
    const item: ActivityItem = {
      id: `activity-${Date.now()}-${this.activitySeq}-${Math.random().toString(36).slice(2, 9)}`,
      taskId: input.taskId,
      taskTitle: input.taskTitle,
      action: input.action,
      actor: input.actor ?? 'You',
      timestamp: new Date().toISOString(),
    };
    const base = this.sessionNotifications() ?? [...this.activityResource.value()];
    this.sessionNotifications.set([item, ...base].slice(0, 40));
    return item;
  }

  /** Insert or replace a single task without refetching the list. */
  upsertTask(task: Task): void {
    const current = this.boardTasks();
    const index = current.findIndex((item) => item.id === task.id);
    if (index === -1) {
      this.localTasks.set([task, ...current]);
      return;
    }
    const next = current.slice();
    next[index] = task;
    this.localTasks.set(next);
  }

  /** Remove a task from the local board without refetching. */
  removeTask(id: string): void {
    this.localTasks.set(this.boardTasks().filter((task) => task.id !== id));
  }

  /** Forces all resources to refetch and drops local board override (keeps session notifications). */
  refresh(): void {
    this.localTasks.set(null);
    this.refreshToken.update((n) => n + 1);
    this.tasksResource.reload();
    this.statisticsResource.reload();
    this.assigneesResource.reload();
    this.activityResource.reload();
  }

  /** Soft refresh for feeds that should update after local board edits. */
  refreshActivity(): void {
    this.activityResource.reload();
  }

  createTask(value: TaskFormValue, assignees: Assignee[]): Observable<Task> {
    const assignee = assignees.find((a) => a.id === value.assigneeId);
    if (!assignee) {
      return throwError(() => new Error('Assignee is required'));
    }

    const now = new Date().toISOString();
    const payload: Omit<Task, 'id'> = {
      title: value.title.trim(),
      description: value.description.trim(),
      status: value.status,
      priority: value.priority,
      dueDate: value.dueDate,
      isOverdue: this.computeOverdue(value.dueDate, value.status),
      completedAt: value.status === 'done' ? now : null,
      assignee,
      tags: this.parseTags(value.tags),
      createdAt: now,
      updatedAt: now,
    };

    return this.http.post<Task>(`${this.apiUrl}/tasks`, payload).pipe(
      catchError((err) => throwError(() => this.toError(err, 'Failed to create task'))),
    );
  }

  updateTask(id: string, value: TaskFormValue, assignees: Assignee[]): Observable<Task> {
    const assignee = assignees.find((a) => a.id === value.assigneeId);
    if (!assignee) {
      return throwError(() => new Error('Assignee is required'));
    }

    const now = new Date().toISOString();
    const payload: Partial<Task> = {
      title: value.title.trim(),
      description: value.description.trim(),
      status: value.status,
      priority: value.priority,
      dueDate: value.dueDate,
      isOverdue: this.computeOverdue(value.dueDate, value.status),
      completedAt: value.status === 'done' ? now : null,
      assignee,
      tags: this.parseTags(value.tags),
      updatedAt: now,
    };

    return this.http.patch<Task>(`${this.apiUrl}/tasks/${id}`, payload).pipe(
      catchError((err) => throwError(() => this.toError(err, 'Failed to update task'))),
    );
  }

  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tasks/${id}`).pipe(
      catchError((err) => throwError(() => this.toError(err, 'Failed to delete task'))),
    );
  }

  updateTaskStatus(task: Task, status: Task['status']): Observable<Task> {
    const now = new Date().toISOString();
    return this.http
      .patch<Task>(`${this.apiUrl}/tasks/${task.id}`, {
        status,
        isOverdue: this.computeOverdue(task.dueDate, status),
        completedAt: status === 'done' ? now : null,
        updatedAt: now,
      })
      .pipe(catchError((err) => throwError(() => this.toError(err, 'Failed to update status'))));
  }

  reorderTasks(tasks: Task[]): Observable<Task[]> {
    return this.http.put<Task[]>(`${this.apiUrl}/tasks-reorder`, tasks).pipe(
      catchError((err) => throwError(() => this.toError(err, 'Failed to reorder tasks'))),
    );
  }

  /** Derives live statistics from current tasks (updates numbers without refetch). */
  computeLiveStatistics(tasks: Task[]): Statistic[] {
    const overdue = tasks.filter((t) => t.status !== 'done' && this.computeOverdue(t.dueDate, t.status)).length;
    return [
      {
        id: 'live-total',
        title: 'Total Tasks',
        icon: 'bar_chart',
        value: tasks.length,
        change: `+${Math.max(tasks.length - 140, 0)}`,
        changeLabel: 'this week',
        changeType: 'positive',
        color: '#3B82F6',
      },
      {
        id: 'live-done',
        title: 'Completed',
        icon: 'check_circle',
        value: tasks.filter((t) => t.status === 'done').length,
        change: '+8',
        changeLabel: 'today',
        changeType: 'positive',
        color: '#22C55E',
      },
      {
        id: 'live-progress',
        title: 'In Progress',
        icon: 'pending_actions',
        value: tasks.filter((t) => t.status === 'in_progress').length,
        change: '0',
        changeLabel: 'Same as yesterday',
        changeType: 'neutral',
        color: '#3B82F6',
      },
      {
        id: 'live-overdue',
        title: 'Overdue',
        icon: 'warning',
        value: overdue,
        change: overdue > 0 ? `+${overdue}` : '0',
        changeLabel: 'today',
        changeType: overdue > 0 ? 'negative' : 'neutral',
        color: '#EF4444',
      },
    ];
  }

  private parseTags(raw: string): string[] {
    return raw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  private computeOverdue(dueDate: string, status: Task['status']): boolean {
    if (status === 'done') {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }

  private toError(err: unknown, fallback: string): Error {
    if (err instanceof Error) {
      return err;
    }
    return new Error(fallback);
  }
}
