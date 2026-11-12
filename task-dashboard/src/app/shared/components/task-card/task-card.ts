import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Task } from '../../../core/models/task.model';

@Component({
  selector: 'app-task-card',
  imports: [MatIconModule, MatMenuModule],
  templateUrl: './task-card.html',
  styleUrl: './task-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCard {
  private readonly i18n = inject(I18nService);

  readonly task = input.required<Task>();
  readonly edit = output<Task>();
  readonly remove = output<Task>();

  readonly m = computed(() => this.i18n.messages());
  readonly priorityLabel = computed(() => this.i18n.priorityLabel(this.task().priority));
  readonly dueLabel = computed(() => this.formatDue(this.task()));
  readonly category = computed(() => this.task().tags[0] ?? this.m().generalCategory);
  readonly initials = computed(() => this.toInitials(this.task().assignee.name));
  readonly handle = computed(() => `@${this.task().assignee.name.split(' ')[0]}`);
  readonly actionsAria = computed(() =>
    this.i18n.fill(this.m().actionsFor, { title: this.task().title }),
  );

  private formatDue(task: Task): { text: string; tone: 'danger' | 'muted' | 'success' } {
    const m = this.m();
    if (task.status === 'done') {
      if (!task.completedAt) {
        return { text: m.dueCompleted, tone: 'success' };
      }
      const completed = this.startOfDay(new Date(task.completedAt));
      const today = this.startOfDay(new Date());
      const diff = Math.round((today.getTime() - completed.getTime()) / 86_400_000);
      if (diff <= 0) {
        return { text: m.dueCompletedToday, tone: 'success' };
      }
      if (diff === 1) {
        return { text: m.dueCompletedYesterday, tone: 'success' };
      }
      return {
        text: this.i18n.fill(m.dueCompletedDaysAgo, { n: diff }),
        tone: 'success',
      };
    }

    const due = this.startOfDay(new Date(task.dueDate));
    const today = this.startOfDay(new Date());
    const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000);

    if (diff < 0) {
      const days = Math.abs(diff);
      return {
        text:
          days === 1
            ? m.overdueByOneDay
            : this.i18n.fill(m.overdueByDays, { n: days }),
        tone: 'danger',
      };
    }
    if (diff === 0) {
      return { text: m.dueToday, tone: 'muted' };
    }
    if (diff === 1) {
      return { text: m.dueInOneDay, tone: 'muted' };
    }
    if (diff < 7) {
      return { text: this.i18n.fill(m.dueInDays, { n: diff }), tone: 'muted' };
    }
    const weeks = Math.ceil(diff / 7);
    return {
      text:
        weeks === 1
          ? m.dueInOneWeek
          : this.i18n.fill(m.dueInWeeks, { n: weeks }),
      tone: 'muted',
    };
  }

  private startOfDay(date: Date): Date {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  private toInitials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
}
