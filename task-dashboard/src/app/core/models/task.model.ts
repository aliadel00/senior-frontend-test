/** Task workflow status values used across the dashboard. */
export type TaskStatus = 'todo' | 'in_progress' | 'done';

/** Priority levels for task triage. */
export type TaskPriority = 'high' | 'medium' | 'low';

/** Direction of a statistic delta for UI coloring. */
export type ChangeType = 'positive' | 'negative' | 'neutral';

export interface Assignee {
  id: string;
  name: string;
  avatar: string;
  email: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  isOverdue?: boolean;
  completedAt?: string | null;
  assignee: Assignee;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TasksResponse {
  tasks: Task[];
  meta: {
    totalCount: number;
    lastUpdated: string;
  };
}

export interface Statistic {
  id: string;
  title: string;
  icon: string;
  value: number;
  change: string;
  changeLabel: string;
  changeType: ChangeType;
  color: string;
}

export interface StatisticsResponse {
  statistics: Statistic[];
  lastUpdated: string;
}

export interface ActivityItem {
  id: string;
  taskId: string;
  taskTitle: string;
  action: string;
  actor: string;
  timestamp: string;
}

export interface TaskFilters {
  status: TaskStatus | 'all';
  priority: TaskPriority | 'all';
  assigneeId: string | 'all';
  search: string;
}

export interface TaskFormValue {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assigneeId: string;
  tags: string;
}

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];
export const TASK_PRIORITIES: TaskPriority[] = ['high', 'medium', 'low'];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};
