import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { MatCardModule } from '@angular/material/card';
import { STATUS_LABELS, Task, TaskStatus } from '../../../core/models/task.model';
import { TaskCard } from '../../../shared/components/task-card/task-card';

@Component({
  selector: 'app-task-list',
  imports: [DragDropModule, MatCardModule, TaskCard],
  templateUrl: './task-list.html',
  styleUrl: './task-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskList {
  readonly tasks = input.required<Task[]>();
  readonly edit = output<Task>();
  readonly remove = output<Task>();
  readonly reorder = output<{ tasks: Task[]; moved?: { task: Task; status: TaskStatus } }>();

  readonly columns: TaskStatus[] = ['todo', 'in_progress', 'done'];
  readonly statusLabels = STATUS_LABELS;

  tasksByStatus(status: TaskStatus): Task[] {
    return this.tasks().filter((task) => task.status === status);
  }

  trackTask(index: number, task: Task): string {
    return task.id;
  }

  onDrop(event: CdkDragDrop<Task[]>, status: TaskStatus): void {
    if (event.previousContainer === event.container) {
      const copy = [...event.container.data];
      moveItemInArray(copy, event.previousIndex, event.currentIndex);
      this.emitMerged(copy, status);
      return;
    }

    const previous = [...event.previousContainer.data];
    const current = [...event.container.data];
    transferArrayItem(previous, current, event.previousIndex, event.currentIndex);
    const moved = current[event.currentIndex];
    const updatedMoved: Task = { ...moved, status };
    current[event.currentIndex] = updatedMoved;
    this.emitMerged(current, status, previous, event.previousContainer.id as TaskStatus, updatedMoved);
  }

  private emitMerged(
    currentColumn: Task[],
    currentStatus: TaskStatus,
    previousColumn?: Task[],
    previousStatus?: TaskStatus,
    moved?: Task,
  ): void {
    const others = this.tasks().filter((task) => {
      if (task.status === currentStatus) {
        return false;
      }
      if (previousStatus && task.status === previousStatus) {
        return false;
      }
      return true;
    });

    const next = [
      ...others,
      ...currentColumn,
      ...(previousColumn ?? []),
    ];

    this.reorder.emit({
      tasks: next,
      moved: moved ? { task: moved, status: currentStatus } : undefined,
    });
  }
}
