import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ActivityItem } from '../../../core/models/task.model';

@Component({
  selector: 'app-activity-feed',
  imports: [DatePipe],
  templateUrl: './activity-feed.html',
  styleUrl: './activity-feed.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityFeed {
  private readonly i18n = inject(I18nService);

  readonly items = input.required<ActivityItem[]>();
  readonly m = computed(() => this.i18n.messages());

  actionLabel(action: string): string {
    return this.i18n.actionLabel(action);
  }
}
