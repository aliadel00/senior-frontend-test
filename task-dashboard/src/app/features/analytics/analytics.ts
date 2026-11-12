import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TaskService } from '../../core/services/task.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { LoadingSkeleton } from '../../shared/components/loading-skeleton/loading-skeleton';
import { ActivityFeed } from '../../shared/components/activity-feed/activity-feed';
import { PriorityChart } from '../../shared/components/priority-chart/priority-chart';
import { StatusChart } from '../../shared/components/status-chart/status-chart';

@Component({
  selector: 'app-analytics',
  imports: [MatIconModule, LoadingSkeleton, ActivityFeed, PriorityChart, StatusChart],
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Analytics {
  private readonly taskService = inject(TaskService);
  private readonly i18n = inject(I18nService);

  readonly m = computed(() => this.i18n.messages());
  readonly tasks = computed(() => this.taskService.boardTasks());
  readonly activity = computed(() => this.taskService.activityFeed());
  readonly loading = computed(
    () =>
      this.taskService.tasksResource.isLoading() ||
      this.taskService.activityResource.isLoading(),
  );
  readonly error = computed(
    () => this.taskService.tasksResource.error() || this.taskService.activityResource.error(),
  );

  refresh(): void {
    this.taskService.refresh();
  }
}
