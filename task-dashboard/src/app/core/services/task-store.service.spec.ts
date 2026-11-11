import { TestBed } from '@angular/core/testing';
import { Task } from '../models/task.model';
import { TaskStoreService } from './task-store.service';

const sampleTasks: Task[] = [
  {
    id: '1',
    title: 'Design homepage',
    description: 'Create layouts',
    status: 'todo',
    priority: 'high',
    dueDate: '2026-11-20',
    assignee: { id: 'u1', name: 'Ada', avatar: 'A', email: 'a@x.com' },
    tags: ['Design'],
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: '2',
    title: 'API docs',
    description: 'Update docs',
    status: 'done',
    priority: 'low',
    dueDate: '2026-11-10',
    assignee: { id: 'u2', name: 'Bob', avatar: 'B', email: 'b@x.com' },
    tags: ['Docs'],
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
];

describe('TaskStoreService', () => {
  let store: TaskStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(TaskStoreService);
  });

  it('filters by status and search', () => {
    store.setStatus('todo');
    store.setSearch('design');
    expect(store.filterTasks(sampleTasks)).toEqual([sampleTasks[0]]);
  });

  it('resets filters', () => {
    store.setPriority('high');
    store.setAssignee('u1');
    store.resetFilters();
    expect(store.filters()).toEqual({
      status: 'all',
      priority: 'all',
      assigneeId: 'all',
      search: '',
    });
    expect(store.hasActiveFilters()).toBe(false);
  });
});
