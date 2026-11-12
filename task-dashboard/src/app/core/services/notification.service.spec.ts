import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';
import { TaskService } from './task.service';

describe('NotificationService', () => {
  let notifications: NotificationService;
  let tasks: TaskService;
  let httpMock: HttpTestingController;
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memory.set(key, value);
        },
        removeItem: (key: string) => {
          memory.delete(key);
        },
        clear: () => memory.clear(),
      },
    });

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    notifications = TestBed.inject(NotificationService);
    tasks = TestBed.inject(TaskService);
    httpMock = TestBed.inject(HttpTestingController);

    // Drain eager httpResource GETs — feed is owned by recordActivity below.
    for (const req of httpMock.match(() => true)) {
      if (req.request.url.includes('/activity')) {
        req.flush([]);
      } else if (req.request.url.includes('/assignees')) {
        req.flush([]);
      } else if (req.request.url.includes('/statistics')) {
        req.flush({ statistics: [], lastUpdated: '' });
      } else {
        req.flush({ tasks: [], meta: { totalCount: 0, lastUpdated: '' } });
      }
    }

    for (let index = 0; index < 12; index += 1) {
      tasks.recordActivity({
        taskId: `task-${index + 1}`,
        taskTitle: `Task ${index + 1}`,
        action: 'updated',
        actor: 'Alex',
      });
    }
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('increments unreadCount when new activity arrives on a full inbox', () => {
    expect(notifications.unreadCount()).toBe(12);
    expect(notifications.items().length).toBe(12);

    tasks.recordActivity({
      taskId: 'task-new',
      taskTitle: 'Brand new task',
      action: 'created',
      actor: 'You',
    });

    // Panel still shows 12 rows, but the badge must reflect the 13th unread.
    expect(notifications.items().length).toBe(12);
    expect(notifications.unreadCount()).toBe(13);
    expect(notifications.items()[0]?.taskTitle).toBe('Brand new task');
  });

  it('markAllRead clears unread across the full feed, not only the panel window', () => {
    tasks.recordActivity({
      taskId: 'task-new',
      taskTitle: 'Brand new task',
      action: 'created',
    });
    expect(notifications.unreadCount()).toBe(13);

    notifications.markAllRead();
    expect(notifications.unreadCount()).toBe(0);
  });
});
