import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TaskStoreService } from '../core/services/task-store.service';
import { TaskUiService } from '../core/services/task-ui.service';
import {
  NotificationService,
  NotificationView,
} from '../core/services/notification.service';
import { I18nService } from '../core/i18n/i18n.service';
import { Locale } from '../core/i18n/types';
import { ShortcutsDialog } from '../shared/components/shortcuts-dialog/shortcuts-dialog';

interface NavLink {
  key: 'dashboard' | 'tasks' | 'calendar' | 'analytics' | 'team' | 'settings';
  icon: string;
  path?: string;
  disabled?: boolean;
  shortcut?: string;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, MatIconModule, FormsModule, MatDialogModule],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly store = inject(TaskStoreService);
  private readonly taskUi = inject(TaskUiService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);
  readonly notifications = inject(NotificationService);

  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  readonly mobileSearchInput = viewChild<ElementRef<HTMLInputElement>>('mobileSearchInput');

  readonly search = this.store.filters;
  readonly menuOpen = signal(false);
  readonly notificationsOpen = signal(false);
  /** Whole-app EN↔AR transition: idle → out → in → idle. */
  readonly localePhase = signal<'idle' | 'out' | 'in'>('idle');
  readonly m = computed(() => this.i18n.messages());
  private localeSwapTimers: number[] = [];
  private shortcutsOpen = false;
  /** Scroll to the board once per non-empty search session. */
  private scrolledForSearch = false;

  readonly links: NavLink[] = [
    { path: '/dashboard', key: 'dashboard', icon: 'dashboard', shortcut: '1' },
    { path: '/dashboard', key: 'tasks', icon: 'task_alt' },
    { key: 'calendar', icon: 'calendar_today', disabled: true },
    { path: '/analytics', key: 'analytics', icon: 'analytics', shortcut: '2' },
    { path: '/users', key: 'team', icon: 'group', shortcut: '3' },
    { key: 'settings', icon: 'settings', disabled: true },
  ];

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.menuOpen.set(false);
        this.notificationsOpen.set(false);
      });

    // Laptop→tablet: sidebar becomes a hamburger drawer. Keep it open so it
    // doesn't snap shut; desktop restores the persistent rail and clears state.
    const drawerMq = window.matchMedia('(max-width: 960px)');
    const onViewportChange = (): void => {
      this.menuOpen.set(drawerMq.matches);
    };
    drawerMq.addEventListener('change', onViewportChange);
    this.destroyRef.onDestroy(() => {
      drawerMq.removeEventListener('change', onViewportChange);
      this.clearLocaleTimers();
    });
  }

  private clearLocaleTimers(): void {
    for (const id of this.localeSwapTimers) {
      window.clearTimeout(id);
    }
    this.localeSwapTimers = [];
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.notify')) {
      this.notificationsOpen.set(false);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.notificationsOpen.set(false);
      this.menuOpen.set(false);
      return;
    }

    if (this.isTypingTarget(event.target) || event.metaKey || event.altKey) {
      return;
    }

    // Ctrl+/ or Ctrl+Shift+/ → shortcuts help
    if (event.ctrlKey && (event.key === '/' || event.key === '?')) {
      event.preventDefault();
      this.openShortcuts();
      return;
    }

    if (event.ctrlKey) {
      return;
    }

    const key = event.key;
    if (key === '?' || (event.shiftKey && key === '/')) {
      event.preventDefault();
      this.openShortcuts();
      return;
    }

    if (event.shiftKey) {
      return;
    }

    switch (key) {
      case '/':
        event.preventDefault();
        this.focusSearch();
        break;
      case 'n':
      case 'N':
        event.preventDefault();
        this.onNewTask();
        break;
      case 'b':
      case 'B':
        event.preventDefault();
        this.toggleNotifications();
        break;
      case '1':
        event.preventDefault();
        this.go('/dashboard');
        break;
      case '2':
        event.preventDefault();
        this.go('/analytics');
        break;
      case '3':
        event.preventDefault();
        this.go('/users');
        break;
      case 'l':
      case 'L':
        event.preventDefault();
        this.toggleLanguage();
        break;
      case 'm':
      case 'M':
        event.preventDefault();
        this.toggleMenu();
        break;
      default:
        break;
    }
  }

  onSearch(value: string): void {
    this.store.setSearch(value);
    if (!value.trim()) {
      this.store.selectTask(null);
      this.scrolledForSearch = false;
      return;
    }

    const onDashboard = this.router.url.split('?')[0] === '/dashboard';
    if (!this.scrolledForSearch || !onDashboard) {
      this.scrolledForSearch = true;
      void this.revealTasks();
    }
  }

  clearSearch(): void {
    this.store.setSearch('');
    this.store.selectTask(null);
    this.scrolledForSearch = false;
  }

  private async revealTasks(): Promise<void> {
    const onDashboard = this.router.url.split('?')[0] === '/dashboard';
    if (!onDashboard) {
      await this.router.navigateByUrl('/dashboard');
    }

    window.setTimeout(
      () => {
        document.getElementById('task-board')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      },
      onDashboard ? 0 : 80,
    );
  }

  onNewTask(): void {
    this.menuOpen.set(false);
    this.notificationsOpen.set(false);
    void this.router.navigateByUrl('/dashboard');
    this.taskUi.requestCreate();
  }

  openShortcuts(): void {
    if (this.shortcutsOpen) {
      return;
    }
    this.notificationsOpen.set(false);
    this.shortcutsOpen = true;
    const ref = this.dialog.open(ShortcutsDialog, {
      direction: this.i18n.dir(),
      width: '24rem',
      maxWidth: '92vw',
      autoFocus: 'dialog',
    });
    ref.afterClosed().subscribe(() => {
      this.shortcutsOpen = false;
    });
  }

  private focusSearch(): void {
    const isMobile = window.matchMedia('(max-width: 960px)').matches;
    const input = (
      isMobile ? this.mobileSearchInput() : this.searchInput()
    )?.nativeElement;
    input?.focus();
    input?.select();
  }

  private go(path: string): void {
    this.menuOpen.set(false);
    this.notificationsOpen.set(false);
    void this.router.navigateByUrl(path);
  }

  private isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      return true;
    }
    return target.isContentEditable || !!target.closest('[contenteditable="true"], .mat-mdc-dialog-container');
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  toggleNotifications(): void {
    this.notificationsOpen.update((open) => !open);
  }

  closeNotifications(): void {
    this.notificationsOpen.set(false);
  }

  markNotificationsRead(): void {
    this.notifications.markAllRead();
  }

  setNotifyFilter(filter: 'all' | 'unread'): void {
    this.notifications.setFilter(filter);
  }

  openNotification(item: NotificationView, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.notifications.markRead(item.id);
    // Deleted tasks no longer exist — mark read only, don't navigate.
    if (item.action === 'deleted') {
      return;
    }
    // Reset status/priority/assignee so the matched task is actually visible.
    this.store.resetFilters();
    this.store.setSearch(item.taskTitle);
    this.store.selectTask(item.taskId);
    this.notificationsOpen.set(false);
    this.scrolledForSearch = true;
    void this.revealTasks();
  }

  toggleLanguage(): void {
    this.setLanguage(this.i18n.locale() === 'en' ? 'ar' : 'en');
  }

  setLanguage(locale: Locale): void {
    if (this.i18n.locale() === locale || this.localePhase() !== 'idle') {
      return;
    }
    this.clearLocaleTimers();
    // Phase 1: fade the whole app out, then flip locale and fade back in.
    this.localePhase.set('out');
    this.localeSwapTimers.push(
      window.setTimeout(() => {
        this.i18n.setLocale(locale);
        this.localePhase.set('in');
        this.localeSwapTimers.push(
          window.setTimeout(() => {
            this.localePhase.set('idle');
            this.localeSwapTimers = [];
          }, 380),
        );
      }, 160),
    );
  }

  isActive(link: NavLink): boolean {
    if (!link.path) {
      return false;
    }
    const path = this.router.url.split('?')[0].split('#')[0];
    if (link.key === 'dashboard' || link.key === 'tasks') {
      return path === '/dashboard';
    }
    return path === link.path;
  }
}
