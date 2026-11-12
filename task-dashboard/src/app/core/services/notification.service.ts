import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { TaskService } from './task.service';
import { ActivityItem } from '../models/task.model';
import { I18nService } from '../i18n/i18n.service';
import { Messages } from '../i18n/types';

const READ_IDS_KEY = 'tm-notifications-read-ids';

export type NotificationAction = 'created' | 'updated' | 'completed' | 'deleted' | string;
export type NotificationFilter = 'all' | 'unread';

export interface NotificationView {
  id: string;
  taskId: string;
  taskTitle: string;
  action: NotificationAction;
  actor: string;
  timestamp: string;
  unread: boolean;
  icon: string;
  tone: 'success' | 'primary' | 'danger' | 'neutral';
  summary: string;
  relativeTime: string;
}

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_IDS_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? new Set(parsed.filter((id) => typeof id === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function persistReadIds(ids: Set<string>): void {
  try {
    localStorage.setItem(READ_IDS_KEY, JSON.stringify([...ids]));
  } catch {
    // jsdom / private mode may lack writable storage
  }
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly taskService = inject(TaskService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly readIds = signal<Set<string>>(loadReadIds());
  private readonly filterState = signal<NotificationFilter>('all');
  private readonly nowTick = signal(Date.now());

  readonly filter = this.filterState.asReadonly();

  readonly items = computed(() => {
    const messages = this.i18n.messages();
    const read = this.readIds();
    const now = this.nowTick();
    return this.taskService
      .activityFeed()
      .slice(0, 12)
      .map((item) => this.toView(item, read, now, messages));
  });

  readonly unreadCount = computed(() => this.items().filter((item) => item.unread).length);

  readonly visibleItems = computed(() => {
    const items = this.items();
    return this.filterState() === 'unread' ? items.filter((item) => item.unread) : items;
  });

  constructor() {
    effect(() => {
      // Keep relative timestamps fresh when new activity arrives.
      void this.taskService.activityFeed();
      this.nowTick.set(Date.now());
    });

    const timer = window.setInterval(() => this.nowTick.set(Date.now()), 60_000);
    this.destroyRef.onDestroy(() => window.clearInterval(timer));
  }

  setFilter(filter: NotificationFilter): void {
    this.filterState.set(filter);
  }

  markRead(id: string): void {
    const next = new Set(this.readIds());
    next.add(id);
    this.readIds.set(next);
    persistReadIds(next);
  }

  markAllRead(): void {
    const next = new Set(this.readIds());
    for (const item of this.items()) {
      next.add(item.id);
    }
    this.readIds.set(next);
    persistReadIds(next);
  }

  private toView(
    item: ActivityItem,
    read: Set<string>,
    now: number,
    messages: Messages,
  ): NotificationView {
    const action = (item.action || 'updated').toLowerCase();
    const meta = this.actionMeta(action);
    return {
      id: item.id,
      taskId: item.taskId,
      taskTitle: item.taskTitle,
      action,
      actor: item.actor,
      timestamp: item.timestamp,
      unread: !read.has(item.id),
      icon: meta.icon,
      tone: meta.tone,
      summary: this.summaryFor(action, item.actor, messages),
      relativeTime: this.relativeTime(item.timestamp, now, messages),
    };
  }

  private actionMeta(action: string): { icon: string; tone: NotificationView['tone'] } {
    switch (action) {
      case 'completed':
        return { icon: 'check_circle', tone: 'success' };
      case 'created':
        return { icon: 'add_circle', tone: 'primary' };
      case 'deleted':
        return { icon: 'delete', tone: 'danger' };
      default:
        return { icon: 'edit', tone: 'neutral' };
    }
  }

  private summaryFor(action: string, actor: string, messages: Messages): string {
    switch (action) {
      case 'completed':
        return messages.notifyCompleted.replace('{actor}', actor);
      case 'created':
        return messages.notifyCreated.replace('{actor}', actor);
      case 'deleted':
        return messages.notifyDeleted.replace('{actor}', actor);
      default:
        return messages.notifyUpdated.replace('{actor}', actor);
    }
  }

  private relativeTime(timestamp: string, now: number, messages: Messages): string {
    const then = new Date(timestamp).getTime();
    if (Number.isNaN(then)) {
      return '';
    }
    const diffSec = Math.max(0, Math.round((now - then) / 1000));
    if (diffSec < 60) {
      return messages.timeJustNow;
    }
    const mins = Math.round(diffSec / 60);
    if (mins < 60) {
      return messages.timeMinutesAgo.replace('{n}', String(mins));
    }
    const hours = Math.round(mins / 60);
    if (hours < 24) {
      return messages.timeHoursAgo.replace('{n}', String(hours));
    }
    const days = Math.round(hours / 24);
    if (days === 1) {
      return messages.timeYesterday;
    }
    if (days < 7) {
      return messages.timeDaysAgo.replace('{n}', String(days));
    }
    return new Date(timestamp).toLocaleDateString();
  }
}
