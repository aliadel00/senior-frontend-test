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
  selector: 'app-status-chart',
  templateUrl: './status-chart.html',
  styleUrl: './status-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusChart implements OnDestroy {
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
      todo: tasks.filter((t) => t.status === 'todo').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      done: tasks.filter((t) => t.status === 'done').length,
    };

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: ['To Do', 'In Progress', 'Done'],
        datasets: [
          {
            label: 'Tasks',
            data: [counts.todo, counts.in_progress, counts.done],
            backgroundColor: ['#1565c0', '#ef6c00', '#2e7d32'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    };

    this.chart?.destroy();
    this.chart = new Chart(canvas, config);
  }
}
