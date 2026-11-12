import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Assignee } from '../models/task.model';
import { TaskService } from './task.service';

describe('TaskService', () => {
  let service: TaskService;
  let httpMock: HttpTestingController;

  const assignees: Assignee[] = [
    { id: 'user-001', name: 'John Doe', avatar: 'JD', email: 'john@x.com' },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TaskService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('creates a task', () => {
    service
      .createTask(
        {
          title: 'New task',
          description: 'A longer description',
          status: 'todo',
          priority: 'high',
          dueDate: '2026-12-01',
          assigneeId: 'user-001',
          tags: 'Frontend',
        },
        assignees,
      )
      .subscribe((task) => {
        expect(task.title).toBe('New task');
      });

    const req = httpMock.expectOne((r) => r.url.endsWith('/tasks') && r.method === 'POST');
    expect(req.request.body.tags).toEqual(['Frontend']);
    req.flush({
      id: 'task-100',
      ...req.request.body,
    });
  });

  it('computes live statistics deltas from task dates', () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 3);
    const older = new Date(today);
    older.setDate(older.getDate() - 20);

    const iso = (d: Date) => d.toISOString();
    const day = (d: Date) => d.toISOString().slice(0, 10);

    const stats = service.computeLiveStatistics([
      {
        id: '1',
        title: 'Overdue since yesterday',
        description: 'B',
        status: 'todo',
        priority: 'high',
        dueDate: day(yesterday),
        assignee: assignees[0],
        tags: [],
        createdAt: iso(older),
        updatedAt: iso(older),
      },
      {
        id: '2',
        title: 'Done today',
        description: 'B',
        status: 'done',
        priority: 'medium',
        dueDate: day(today),
        completedAt: iso(today),
        assignee: assignees[0],
        tags: [],
        createdAt: iso(lastWeek),
        updatedAt: iso(today),
      },
      {
        id: '3',
        title: 'In progress today',
        description: 'B',
        status: 'in_progress',
        priority: 'low',
        dueDate: day(today),
        assignee: assignees[0],
        tags: [],
        createdAt: iso(today),
        updatedAt: iso(today),
      },
      {
        id: '4',
        title: 'Old done',
        description: 'B',
        status: 'done',
        priority: 'low',
        dueDate: day(older),
        completedAt: iso(older),
        assignee: assignees[0],
        tags: [],
        createdAt: iso(older),
        updatedAt: iso(older),
      },
    ]);

    expect(stats.find((s) => s.id === 'live-total')).toMatchObject({
      value: 4,
      change: '+2',
      changeLabel: 'this week',
    });
    expect(stats.find((s) => s.id === 'live-done')).toMatchObject({
      value: 2,
      change: '+1',
      changeLabel: 'today',
      changeType: 'positive',
    });
    expect(stats.find((s) => s.id === 'live-progress')).toMatchObject({
      value: 1,
      change: '+1',
      changeLabel: 'today',
    });
    expect(stats.find((s) => s.id === 'live-overdue')).toMatchObject({
      value: 1,
      change: '+1',
      changeLabel: 'today',
      changeType: 'negative',
    });
  });

  it('updates and deletes tasks', () => {
    service
      .updateTask(
        'task-001',
        {
          title: 'Updated',
          description: 'Updated description',
          status: 'done',
          priority: 'low',
          dueDate: '2026-12-01',
          assigneeId: 'user-001',
          tags: '',
        },
        assignees,
      )
      .subscribe((task) => expect(task.status).toBe('done'));

    const patch = httpMock.expectOne((r) => r.url.includes('/tasks/task-001') && r.method === 'PATCH');
    patch.flush({ id: 'task-001', ...patch.request.body });

    let deleted = false;
    service.deleteTask('task-001').subscribe({
      next: () => {
        deleted = true;
      },
    });
    httpMock.expectOne((r) => r.url.includes('/tasks/task-001') && r.method === 'DELETE').flush({});
    expect(deleted).toBe(true);
  });

  it('updates status and reorders tasks', () => {
    const task = {
      id: 'task-001',
      title: 'A',
      description: 'B',
      status: 'todo' as const,
      priority: 'high' as const,
      dueDate: '2026-12-01',
      assignee: assignees[0],
      tags: [],
      createdAt: '',
      updatedAt: '',
    };

    service.updateTaskStatus(task, 'in_progress').subscribe((res) => {
      expect(res.status).toBe('in_progress');
    });
    const statusReq = httpMock.expectOne((r) => r.method === 'PATCH');
    statusReq.flush({ ...task, status: 'in_progress' });

    service.reorderTasks([task]).subscribe((list) => expect(list.length).toBe(1));
    httpMock.expectOne((r) => r.url.endsWith('/tasks-reorder')).flush([task]);
  });

  it('rejects create when assignee is missing', () => {
    service
      .createTask(
        {
          title: 'New task',
          description: 'A longer description',
          status: 'todo',
          priority: 'high',
          dueDate: '2026-12-01',
          assigneeId: 'missing',
          tags: '',
        },
        assignees,
      )
      .subscribe({
        next: () => {
          throw new Error('should error');
        },
        error: (err: Error) => expect(err.message).toContain('Assignee'),
      });
  });
});
