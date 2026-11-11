import { Injectable, computed, signal } from '@angular/core';
import { Task, TaskFilters, TaskPriority, TaskStatus } from '../models/task.model';

const DEFAULT_FILTERS: TaskFilters = {
  status: 'all',
  priority: 'all',
  assigneeId: 'all',
  search: '',
};

/**
 * Signal-based UI store for filters and selected task.
 * Keeps presentational components free of filter logic.
 */
@Injectable({ providedIn: 'root' })
export class TaskStoreService {
  private readonly filtersState = signal<TaskFilters>({ ...DEFAULT_FILTERS });
  private readonly selectedTaskIdState = signal<string | null>(null);

  readonly filters = this.filtersState.asReadonly();
  readonly selectedTaskId = this.selectedTaskIdState.asReadonly();

  readonly hasActiveFilters = computed(() => {
    const f = this.filtersState();
    return f.status !== 'all' || f.priority !== 'all' || f.assigneeId !== 'all' || f.search.trim().length > 0;
  });

  setStatus(status: TaskStatus | 'all'): void {
    this.filtersState.update((f) => ({ ...f, status }));
  }

  setPriority(priority: TaskPriority | 'all'): void {
    this.filtersState.update((f) => ({ ...f, priority }));
  }

  setAssignee(assigneeId: string | 'all'): void {
    this.filtersState.update((f) => ({ ...f, assigneeId }));
  }

  setSearch(search: string): void {
    this.filtersState.update((f) => ({ ...f, search }));
  }

  resetFilters(): void {
    this.filtersState.set({ ...DEFAULT_FILTERS });
  }

  selectTask(id: string | null): void {
    this.selectedTaskIdState.set(id);
  }

  /**
   * Applies current filters and search to a task list.
   */
  filterTasks(tasks: Task[]): Task[] {
    const { status, priority, assigneeId, search } = this.filtersState();
    const query = search.trim().toLowerCase();

    return tasks.filter((task) => {
      if (status !== 'all' && task.status !== status) {
        return false;
      }
      if (priority !== 'all' && task.priority !== priority) {
        return false;
      }
      if (assigneeId !== 'all' && task.assignee.id !== assigneeId) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }
}
