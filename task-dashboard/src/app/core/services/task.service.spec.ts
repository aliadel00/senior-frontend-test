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

  it('computes live statistics', () => {
    const stats = service.computeLiveStatistics([
      {
        id: '1',
        title: 'A',
        description: 'B',
        status: 'todo',
        priority: 'high',
        dueDate: '2000-01-01',
        assignee: assignees[0],
        tags: [],
        createdAt: '',
        updatedAt: '',
      },
    ]);
    expect(stats.find((s) => s.id === 'live-overdue')?.value).toBe(1);
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
