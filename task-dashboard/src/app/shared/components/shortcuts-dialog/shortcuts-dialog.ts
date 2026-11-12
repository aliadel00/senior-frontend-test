import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { I18nService } from '../../../core/i18n/i18n.service';

export interface ShortcutRow {
  keys: string[];
  labelKey:
    | 'shortcutSearch'
    | 'shortcutNewTask'
    | 'shortcutNotifications'
    | 'shortcutDashboard'
    | 'shortcutAnalytics'
    | 'shortcutTeam'
    | 'shortcutLanguage'
    | 'shortcutMenu'
    | 'shortcutHelp'
    | 'shortcutClose';
}

@Component({
  selector: 'app-shortcuts-dialog',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './shortcuts-dialog.html',
  styleUrl: './shortcuts-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShortcutsDialog {
  private readonly dialogRef = inject(MatDialogRef<ShortcutsDialog>);
  private readonly i18n = inject(I18nService);

  readonly m = computed(() => this.i18n.messages());

  readonly rows: ShortcutRow[] = [
    { keys: ['/'], labelKey: 'shortcutSearch' },
    { keys: ['N'], labelKey: 'shortcutNewTask' },
    { keys: ['B'], labelKey: 'shortcutNotifications' },
    { keys: ['1'], labelKey: 'shortcutDashboard' },
    { keys: ['2'], labelKey: 'shortcutAnalytics' },
    { keys: ['3'], labelKey: 'shortcutTeam' },
    { keys: ['L'], labelKey: 'shortcutLanguage' },
    { keys: ['M'], labelKey: 'shortcutMenu' },
    { keys: ['?'], labelKey: 'shortcutHelp' },
    { keys: ['Esc'], labelKey: 'shortcutClose' },
  ];

  close(): void {
    this.dialogRef.close();
  }
}
