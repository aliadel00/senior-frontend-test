import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';

export type SkeletonVariant = 'rows' | 'dashboard' | 'analytics' | 'users';

@Component({
  selector: 'app-loading-skeleton',
  templateUrl: './loading-skeleton.html',
  styleUrl: './loading-skeleton.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSkeleton {
  private readonly i18n = inject(I18nService);

  readonly variant = input<SkeletonVariant>('rows');
  readonly rows = input(3);
  readonly label = input<string | undefined>(undefined);

  readonly resolvedLabel = computed(() => this.label() ?? this.i18n.messages().loadingContent);

  readonly boardColumns = [2, 3, 2] as const;
  readonly userRows = [1, 2, 3, 4] as const;
  readonly activityRows = [1, 2, 3, 4, 5] as const;
  readonly statSlots = [1, 2, 3, 4] as const;
}
