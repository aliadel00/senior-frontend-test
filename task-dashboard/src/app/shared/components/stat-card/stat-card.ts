import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Statistic } from '../../../core/models/task.model';

@Component({
  selector: 'app-stat-card',
  imports: [MatIconModule],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCard {
  readonly statistic = input.required<Statistic>();

  readonly tone = computed(() => {
    const key = `${this.statistic().id} ${this.statistic().title}`.toLowerCase();
    if (key.includes('overdue') || key.includes('stat-004') || key.includes('متأخر')) {
      return 'danger';
    }
    if (
      key.includes('completed') ||
      key.includes('done') ||
      key.includes('stat-002') ||
      key.includes('مكتمل')
    ) {
      return 'success';
    }
    if (
      key.includes('progress') ||
      key.includes('stat-003') ||
      key.includes('تنفيذ')
    ) {
      return 'warning';
    }
    return 'default';
  });
}
