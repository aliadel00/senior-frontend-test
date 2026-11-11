# Data Fetching - Mock API Data

## Files

### Dynamic Data Solutions

- **`generate-data.js`** - Node.js script to regenerate JSON files with fresh dates

---

## Generating Data: Node.js Data Generator Script

### Usage

The `generate-data.js` script regenerates the JSON files with fresh dates whenever you run it.

#### Run the script before sending the assignment and make sure there is data uploaded with your Repo

**Using Node.js:**

```bash
node data-fetching/generate-data.js
```

> ## You can also Edit or use what ever you see suit your needs Example (Enum , ...)

```typescript
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "high" | "medium" | "low";
export type ChangeType = "positive" | "negative" | "neutral";

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

interface StatisticsResponse {
  statistics: Statistic[];
  lastUpdated: string;
}

interface Assignee {
  id: string;
  name: string;
  avatar: string;
  email: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  isOverdue: boolean;
  completedAt: string;
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
```
