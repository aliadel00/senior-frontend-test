import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  viewChild,
} from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Task } from '../../../core/models/task.model';

Chart.register(...registerables);

@Component({
  selector: 'app-priority-chart',
  templateUrl: './priority-chart.html',
  styleUrl: './priority-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriorityChart implements OnDestroy {
  readonly tasks = input.required<Task[]>();
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart;

  constructor() {
    effect(() => {
      const tasks = this.tasks();
      const canvas = this.canvas().nativeElement;
      queueMicrotask(() => this.render(canvas, tasks));
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private render(canvas: HTMLCanvasElement, tasks: Task[]): void {
    const counts = {
      high: tasks.filter((t) => t.priority === 'high').length,
      medium: tasks.filter((t) => t.priority === 'medium').length,
      low: tasks.filter((t) => t.priority === 'low').length,
    };

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: ['High', 'Medium', 'Low'],
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
