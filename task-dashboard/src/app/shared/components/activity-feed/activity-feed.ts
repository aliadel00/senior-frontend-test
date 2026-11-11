import { DatePipe, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { ActivityItem } from '../../../core/models/task.model';

@Component({
  selector: 'app-activity-feed',
  imports: [DatePipe, TitleCasePipe, MatListModule, MatIconModule],
  templateUrl: './activity-feed.html',
  styleUrl: './activity-feed.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityFeed {
  readonly items = input.required<ActivityItem[]>();
}
