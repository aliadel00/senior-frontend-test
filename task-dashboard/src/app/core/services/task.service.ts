import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
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
 */
@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** Bump to force httpResource reloads after mutations. */
  private readonly refreshToken = signal(0);

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

  /** Forces all resources to refetch. */
  refresh(): void {
    this.refreshToken.update((n) => n + 1);
    this.tasksResource.reload();
    this.statisticsResource.reload();
    this.assigneesResource.reload();
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

  /** Derives live statistics from current tasks when API stats are stale. */
  computeLiveStatistics(tasks: Task[]): Statistic[] {
    const overdue = tasks.filter((t) => t.status !== 'done' && this.computeOverdue(t.dueDate, t.status)).length;
    return [
      {
        id: 'live-total',
        title: 'Total Tasks',
        icon: 'assignment',
        value: tasks.length,
        change: `${tasks.length}`,
        changeLabel: 'current',
        changeType: 'neutral',
        color: '#1976D2',
      },
      {
        id: 'live-done',
        title: 'Completed',
        icon: 'check_circle',
        value: tasks.filter((t) => t.status === 'done').length,
        change: '+0',
        changeLabel: 'live',
        changeType: 'positive',
        color: '#388E3C',
      },
      {
        id: 'live-progress',
        title: 'In Progress',
        icon: 'autorenew',
        value: tasks.filter((t) => t.status === 'in_progress').length,
        change: '0',
        changeLabel: 'live',
        changeType: 'neutral',
        color: '#FF6F00',
      },
      {
        id: 'live-overdue',
        title: 'Overdue',
        icon: 'warning',
        value: overdue,
        change: `${overdue}`,
        changeLabel: 'live',
        changeType: overdue > 0 ? 'negative' : 'neutral',
        color: '#D32F2F',
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
