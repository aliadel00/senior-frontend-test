#!/usr/bin/env node
/**
 * Lightweight mock REST API for the Task Management Dashboard.
 * Serves assignment-shaped responses and supports CRUD + reorder.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.API_PORT || 3000);
const DB_PATH = path.join(__dirname, 'db.json');

spawnSync(process.execPath, [path.join(__dirname, 'build-db.mjs')], { stdio: 'inherit' });

function readDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,x-skip-cache',
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      if (!chunks.length) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function pushActivity(db, task, action) {
  // Unique id per call — same task can have many entries (one per action).
  db.activity.unshift({
    id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    taskId: task.id,
    taskTitle: task.title,
    action,
    actor: task.assignee?.name ?? 'System',
    timestamp: new Date().toISOString(),
  });
  db.activity = db.activity.slice(0, 40);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    send(res, 204, {});
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const { pathname } = url;

  try {
    const db = readDb();

    if (req.method === 'GET' && pathname === '/tasks-response') {
      send(res, 200, {
        tasks: db.tasks,
        meta: {
          totalCount: db.tasks.length,
          lastUpdated: db.meta.tasksLastUpdated,
        },
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/statistics-response') {
      send(res, 200, {
        statistics: db.statistics,
        lastUpdated: db.meta.statisticsLastUpdated,
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/tasks') {
      send(res, 200, db.tasks);
      return;
    }

    if (req.method === 'GET' && pathname === '/assignees') {
      send(res, 200, db.assignees);
      return;
    }

    if (req.method === 'GET' && pathname === '/activity') {
      send(res, 200, db.activity);
      return;
    }

    if (req.method === 'POST' && pathname === '/tasks') {
      const body = await readBody(req);
      const task = {
        ...body,
        id: `task-${Date.now()}`,
      };
      db.tasks.unshift(task);
      db.meta.tasksLastUpdated = new Date().toISOString();
      pushActivity(db, task, 'created');
      writeDb(db);
      send(res, 201, task);
      return;
    }

    const taskMatch = pathname.match(/^\/tasks\/([^/]+)$/);
    if (taskMatch) {
      const id = decodeURIComponent(taskMatch[1]);
      const index = db.tasks.findIndex((t) => t.id === id);
      if (index < 0) {
        send(res, 404, { message: 'Task not found' });
        return;
      }

      if (req.method === 'GET') {
        send(res, 200, db.tasks[index]);
        return;
      }

      if (req.method === 'PATCH' || req.method === 'PUT') {
        const body = await readBody(req);
        const prev = db.tasks[index];
        db.tasks[index] = { ...prev, ...body, id };
        db.meta.tasksLastUpdated = new Date().toISOString();
        const next = db.tasks[index];
        const action =
          next.status === 'done' && prev.status !== 'done' ? 'completed' : 'updated';
        pushActivity(db, next, action);
        writeDb(db);
        send(res, 200, next);
        return;
      }

      if (req.method === 'DELETE') {
        const [removed] = db.tasks.splice(index, 1);
        db.meta.tasksLastUpdated = new Date().toISOString();
        pushActivity(db, removed, 'deleted');
        writeDb(db);
        send(res, 200, {});
        return;
      }
    }

    if (req.method === 'PUT' && pathname === '/tasks-reorder') {
      const body = await readBody(req);
      if (!Array.isArray(body)) {
        send(res, 400, { message: 'Expected task array' });
        return;
      }
      db.tasks = body;
      db.meta.tasksLastUpdated = new Date().toISOString();
      writeDb(db);
      send(res, 200, db.tasks);
      return;
    }

    send(res, 404, { message: `No route for ${req.method} ${pathname}` });
  } catch (err) {
    console.error(err);
    send(res, 500, { message: err instanceof Error ? err.message : 'Server error' });
  }
});

server.listen(PORT, () => {
  console.log(`Mock API listening on http://localhost:${PORT}`);
});
