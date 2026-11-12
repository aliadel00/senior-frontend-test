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
import { Theme, ThemeService } from '../core/services/theme.service';
import { ShortcutsDialog } from '../shared/components/shortcuts-dialog/shortcuts-dialog';

interface NavLink {
  key: 'dashboard' | 'tasks' | 'calendar' | 'analytics' | 'team' | 'settings';
  icon: string;
  path?: string;
  /** In-page section on the same route (e.g. task board). Exclusive with route-only links. */
  fragment?: string;
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
  readonly theme = inject(ThemeService);
  readonly notifications = inject(NotificationService);

  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  readonly mobileSearchInput = viewChild<ElementRef<HTMLInputElement>>('mobileSearchInput');

  readonly search = this.store.filters;
  readonly menuOpen = signal(false);
  readonly notificationsOpen = signal(false);
  /** Brief press feedback on the theme control. */
  readonly themePulse = signal(false);
  /** Drives nav active state under OnPush (path + fragment). */
  private readonly navUrl = signal(this.router.url);
  private themePulseTimer: number | null = null;
  /** Whole-app EN↔AR transition: idle → out → in → idle. */
  readonly localePhase = signal<'idle' | 'out' | 'in'>('idle');
  readonly m = computed(() => this.i18n.messages());
  private localeSwapTimers: number[] = [];
  private shortcutsOpen = false;
  /** Scroll to the board once per non-empty search session. */
  private scrolledForSearch = false;
  /** Bumped so late board-find retries stop after a newer nav/scroll request. */
  private scrollSession = 0;
  /** Bumped on each go()/goDashboard() so a superseded then() does not scroll the wrong page. */
  private navEpoch = 0;

  readonly links: NavLink[] = [
    { path: '/dashboard', key: 'dashboard', icon: 'dashboard', shortcut: '1' },
    {
      path: '/dashboard',
      key: 'tasks',
      icon: 'task_alt',
      fragment: 'task-board',
    },
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
      .subscribe((event) => {
        // Single source of truth for the active nav highlight — no optimistic rewrites.
        this.navUrl.set(event.urlAfterRedirects);
        this.menuOpen.set(false);
        this.notificationsOpen.set(false);
        if (!this.pathOf(event.urlAfterRedirects).startsWith('/dashboard')) {
          this.scrollSession++;
        }
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
      if (this.themePulseTimer !== null) {
        window.clearTimeout(this.themePulseTimer);
      }
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
        this.goDashboard();
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
      case 't':
      case 'T':
        event.preventDefault();
        this.toggleTheme();
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

    const onDashboard = this.currentPath() === '/dashboard';
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

  /** Path only (ignore query/hash). Prefer for route checks. */
  private pathOf(url: string): string {
    const tree = this.router.parseUrl(url);
    const primary = tree.root.children['primary'];
    if (!primary?.segments.length) {
      return '/';
    }
    return `/${primary.segments.map((s) => s.path).join('/')}`;
  }

  private currentPath(): string {
    return this.pathOf(this.navUrl());
  }

  private currentFragment(): string | null {
    return this.router.parseUrl(this.navUrl()).fragment;
  }

  /** Real router location — not the optimistic navUrl highlight. */
  private routerPath(): string {
    return this.pathOf(this.router.url);
  }

  private routerFragment(): string | null {
    return this.router.parseUrl(this.router.url).fragment;
  }

  private async revealTasks(): Promise<void> {
    const epoch = ++this.navEpoch;
    const session = this.scrollSession;
    const onDashboard = this.routerPath() === '/dashboard';
    const onBoard = this.routerFragment() === 'task-board';

    if (!onDashboard) {
      const ok = await this.router.navigateByUrl('/dashboard');
      if (!ok || epoch !== this.navEpoch || session !== this.scrollSession) {
        return;
      }
      await this.setDashboardFragment(true);
    } else if (!onBoard) {
      await this.setDashboardFragment(true);
    }

    if (epoch !== this.navEpoch) {
      return;
    }
    this.scrollTaskBoardIntoView(0, this.scrollSession);
  }

  /** Sync `/dashboard` ↔ `/dashboard#task-board` through the Router (keeps highlight in sync). */
  private setDashboardFragment(onBoard: boolean): Promise<boolean> {
    const tree = this.router.createUrlTree(['/dashboard'], {
      // `undefined` clears the fragment; `null` would keep the current one.
      fragment: onBoard ? 'task-board' : undefined,
    });
    return this.router.navigateByUrl(tree, { replaceUrl: true });
  }

  /** Native smooth scroll — survives Angular CD (rAF tweens were starved mid-nav and snapped). */
  private smoothScrollTo(top: number): void {
    this.scrollSession++;
    if (Math.abs(window.scrollY - top) < 1) {
      return;
    }
    const reduced =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
  }

  /** Retry until the board mounts (lazy dashboard) then pin it under the sticky topbar. */
  private scrollTaskBoardIntoView(attempt = 0, session = this.scrollSession): void {
    if (session !== this.scrollSession) {
      return;
    }

    const board = document.getElementById('task-board');
    if (!board) {
      if (attempt < 20) {
        window.setTimeout(() => this.scrollTaskBoardIntoView(attempt + 1, session), 50);
      }
      return;
    }

    if (document.activeElement === board || document.activeElement?.id === 'main-content') {
      (document.activeElement as HTMLElement).blur();
    }

    const topbar = document.querySelector('.topbar') as HTMLElement | null;
    const mobileSearch = window.matchMedia('(max-width: 960px)').matches
      ? (document.querySelector('.sidebar__mobile-tools') as HTMLElement | null)
      : null;
    const offset =
      (topbar?.offsetHeight ?? 0) +
      (mobileSearch?.offsetHeight ?? 0) +
      12;
    const y = board.getBoundingClientRect().top + window.scrollY - offset;
    this.smoothScrollTo(Math.max(0, y));
  }

  onNewTask(): void {
    this.menuOpen.set(false);
    this.notificationsOpen.set(false);
    void this.router.navigate(['/dashboard'], { fragment: 'task-board' });
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
    const epoch = ++this.navEpoch;
    this.menuOpen.set(false);
    this.notificationsOpen.set(false);
    // Cancel in-flight dashboard smooth scroll without snapping (snap caused the stutter).
    this.scrollSession++;
    void this.router.navigateByUrl(path).then((ok) => {
      if (epoch !== this.navEpoch || !ok) {
        return;
      }
      window.scrollTo(0, 0);
    });
  }

  /** Dashboard home: clear #task-board and smooth-scroll to top (mouse + shortcut 1). */
  private goDashboard(): void {
    const epoch = ++this.navEpoch;
    this.menuOpen.set(false);
    this.notificationsOpen.set(false);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const onDashboard = this.routerPath() === '/dashboard';
    const onBoard = this.routerFragment() === 'task-board';

    if (onDashboard) {
      // Clear hash without Router navigation (Router CD starved rAF tweens → stutter).
      if (onBoard) {
        const url = this.router.serializeUrl(this.router.createUrlTree(['/dashboard']));
        history.replaceState(history.state, '', url);
        this.navUrl.set(url);
      }
      this.smoothScrollTo(0);
      return;
    }

    void this.router.navigateByUrl('/dashboard').then((ok) => {
      if (epoch !== this.navEpoch || !ok) {
        return;
      }
      window.scrollTo(0, 0);
    });
  }

  onNavClick(link: NavLink, event: Event): void {
    if (!link.path || link.disabled) {
      return;
    }
    // Allow open-in-new-tab / modified clicks to use routerLink as-is.
    if (
      event instanceof MouseEvent &&
      (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
    ) {
      return;
    }
    // One navigation path for mouse + shortcuts (avoids routerLink + handler double work).
    event.preventDefault();
    this.closeMenu();
    if (link.fragment) {
      void this.revealTasks();
      return;
    }
    if (link.key === 'dashboard') {
      this.goDashboard();
      return;
    }
    this.go(link.path);
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

  toggleTheme(): void {
    this.pulseThemeControl();
    void this.theme.toggleAnimated();
  }

  setTheme(next: Theme): void {
    if (this.theme.theme() === next) {
      return;
    }
    this.pulseThemeControl();
    void this.theme.setThemeAnimated(next);
  }

  private pulseThemeControl(): void {
    this.themePulse.set(false);
    queueMicrotask(() => this.themePulse.set(true));
    if (this.themePulseTimer !== null) {
      window.clearTimeout(this.themePulseTimer);
    }
    this.themePulseTimer = window.setTimeout(() => {
      this.themePulse.set(false);
      this.themePulseTimer = null;
    }, 480);
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
    const path = this.currentPath();
    if (path !== link.path) {
      return false;
    }
    const fragment = this.currentFragment();
    // Same route, different jobs: Dashboard = page chrome; Tasks = #task-board.
    if (link.fragment) {
      return fragment === link.fragment;
    }
    if (link.key === 'dashboard') {
      return fragment !== 'task-board';
    }
    return true;
  }
}
