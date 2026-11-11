import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Statistic } from '../../../core/models/task.model';

@Component({
  selector: 'app-stat-card',
  imports: [MatCardModule, MatIconModule],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCard {
  readonly statistic = input.required<Statistic>();
}
