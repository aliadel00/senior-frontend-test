import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { TaskService } from '../../core/services/task.service';
import { LoadingSkeleton } from '../../shared/components/loading-skeleton/loading-skeleton';

@Component({
  selector: 'app-users',
  imports: [MatCardModule, MatListModule, MatIconModule, LoadingSkeleton],
  templateUrl: './users.html',
  styleUrl: './users.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Users {
  private readonly taskService = inject(TaskService);

  readonly assignees = computed(() => this.taskService.assigneesResource.value());
  readonly loading = computed(() => this.taskService.assigneesResource.isLoading());
  readonly tasks = computed(() => this.taskService.tasksResource.value().tasks);

  taskCount(userId: string): number {
    return this.tasks().filter((task) => task.assignee.id === userId).length;
  }
}
