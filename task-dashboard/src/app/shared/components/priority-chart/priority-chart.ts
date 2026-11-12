import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Task } from '../../../core/models/task.model';

Chart.register(...registerables);

@Component({
  selector: 'app-priority-chart',
  templateUrl: './priority-chart.html',
  styleUrl: './priority-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriorityChart implements OnDestroy {
  readonly i18n = inject(I18nService);

  readonly tasks = input.required<Task[]>();
  readonly chartAria = computed(() => this.i18n.messages().chartPriorityAria);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart;

  constructor() {
    effect(() => {
      const tasks = this.tasks();
      const messages = this.i18n.messages();
      const canvas = this.canvas().nativeElement;
      queueMicrotask(() => this.render(canvas, tasks, messages));
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private render(
    canvas: HTMLCanvasElement,
    tasks: Task[],
    messages: ReturnType<I18nService['messages']>,
  ): void {
    const counts = {
      high: tasks.filter((t) => t.priority === 'high').length,
      medium: tasks.filter((t) => t.priority === 'medium').length,
      low: tasks.filter((t) => t.priority === 'low').length,
    };

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: [messages.priorityHigh, messages.priorityMedium, messages.priorityLow],
        datasets: [
          {
            data: [counts.high, counts.medium, counts.low],
            backgroundColor: ['#c62828', '#f9a825', '#6a1b9a'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    };

    this.chart?.destroy();
    this.chart = new Chart(canvas, config);
  }
}
