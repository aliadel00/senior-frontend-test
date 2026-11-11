#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(root, 'data-fetching');

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));
}

const tasksPayload = readJson('tasks.json');
const statsPayload = readJson('statistics.json');

const assigneeMap = new Map();
for (const task of tasksPayload.tasks) {
  assigneeMap.set(task.assignee.id, task.assignee);
  if (task.isOverdue === undefined) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    task.isOverdue = task.status !== 'done' && due < today;
  }
}

const activity = tasksPayload.tasks
  .slice()
  .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  .slice(0, 12)
  .map((task, index) => ({
    id: `activity-${index + 1}`,
    taskId: task.id,
    taskTitle: task.title,
    action: task.status === 'done' ? 'completed' : 'updated',
    actor: task.assignee.name,
    timestamp: task.updatedAt,
  }));

const iconMap = {
  '📊': 'assignment',
  '✅': 'check_circle',
  '🔄': 'autorenew',
  '⚠️': 'warning',
};

const statistics = statsPayload.statistics.map((stat) => ({
  ...stat,
  icon: iconMap[stat.icon] || 'insights',
}));

const db = {
  tasks: tasksPayload.tasks,
  statistics,
  assignees: [...assigneeMap.values()],
  activity,
  meta: {
    tasksLastUpdated: tasksPayload.meta.lastUpdated,
    statisticsLastUpdated: statsPayload.lastUpdated,
  },
};

const outPath = path.join(__dirname, 'db.json');
fs.writeFileSync(outPath, JSON.stringify(db, null, 2));
console.log(`Wrote ${outPath} (${db.tasks.length} tasks)`);
