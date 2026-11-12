import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Observable, from, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActivityItem, Assignee, Task } from '../models/task.model';

interface MockDb {
  tasks: Task[];
  assignees: Assignee[];
  activity: ActivityItem[];
  statistics: unknown[];
  lastUpdated?: string;
}

let dbPromise: Promise<MockDb> | null = null;
let db: MockDb | null = null;

function loadDb(): Promise<MockDb> {
  if (db) {
    return Promise.resolve(db);
  }
  if (!dbPromise) {
    dbPromise = fetch('mock-db.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to load mock-db.json');
        }
        return res.json() as Promise<MockDb>;
      })
      .then((data) => {
        db = structuredClone(data);
        return db;
      });
  }
  return dbPromise;
}

function json<T>(body: T, status = 200): Observable<HttpResponse<T>> {
  return of(new HttpResponse({ status, body }));
}

/**
 * Serves the mock API from `public/mock-db.json` for static hosting (GitHub Pages).
 * Mutations stay in-memory for the session.
 */
export const staticMockInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useStaticMock || !req.url.includes(environment.apiUrl)) {
    return next(req);
  }

  const path = req.url.replace(environment.apiUrl, '').split('?')[0];

  return from(loadDb()).pipe(
    switchMap((store) => {
      if (req.method === 'GET' && path === '/tasks-response') {
        return json({
          tasks: store.tasks,
          meta: {
            totalCount: store.tasks.length,
            lastUpdated: new Date().toISOString(),
          },
        });
      }

      if (req.method === 'GET' && path === '/statistics-response') {
        return json({
          statistics: store.statistics ?? [],
          lastUpdated: store.lastUpdated ?? new Date().toISOString(),
        });
      }

      if (req.method === 'GET' && path === '/assignees') {
        return json(store.assignees);
      }

      if (req.method === 'GET' && path === '/activity') {
        return json(store.activity);
      }

      if (req.method === 'POST' && path === '/tasks') {
        const payload = req.body as Omit<Task, 'id'>;
        const task: Task = { ...payload, id: `task-${Date.now()}` };
        store.tasks.unshift(task);
        // Activity/notifications are recorded client-side (one entry per action).
        return json(task, 201);
      }

      const taskMatch = path.match(/^\/tasks\/([^/]+)$/);
      if (taskMatch) {
        const id = taskMatch[1];
        const index = store.tasks.findIndex((t) => t.id === id);
        if (index < 0) {
          return json({ message: 'Not found' }, 404);
        }

        if (req.method === 'PATCH') {
          const prev = store.tasks[index];
          store.tasks[index] = { ...prev, ...(req.body as Partial<Task>) };
          return json(store.tasks[index]);
        }

        if (req.method === 'DELETE') {
          store.tasks.splice(index, 1);
          // Activity/notifications are recorded client-side (one entry per action).
          return json(null, 204);
        }
      }

      if (req.method === 'PUT' && path === '/tasks-reorder') {
        store.tasks = req.body as Task[];
        return json(store.tasks);
      }

      return json({ message: `Unhandled mock route ${req.method} ${path}` }, 404);
    }),
  );
};
