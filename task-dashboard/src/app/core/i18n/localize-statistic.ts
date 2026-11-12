import { Statistic } from '../models/task.model';
import { Messages } from './types';

/** Maps API / live statistic titles and change labels into the active locale. */
export function localizeStatistic(stat: Statistic, m: Messages): Statistic {
  return {
    ...stat,
    title: localizeStatTitle(stat, m),
    changeLabel: localizeChangeLabel(stat.changeLabel, m),
  };
}

function localizeStatTitle(stat: Statistic, m: Messages): string {
  const key = `${stat.id} ${stat.title}`.toLowerCase();
  if (key.includes('total') || key.includes('stat-001') || key.includes('live-total')) {
    return m.statTotalTasks;
  }
  if (key.includes('overdue') || key.includes('stat-004') || key.includes('live-overdue')) {
    return m.statOverdue;
  }
  if (
    key.includes('progress') ||
    key.includes('stat-003') ||
    key.includes('live-progress')
  ) {
    return m.statInProgress;
  }
  if (
    key.includes('completed') ||
    key.includes('done') ||
    key.includes('stat-002') ||
    key.includes('live-done')
  ) {
    return m.statCompleted;
  }
  return stat.title;
}

function localizeChangeLabel(label: string, m: Messages): string {
  const normalized = label.trim().toLowerCase();
  if (normalized === 'this week') {
    return m.changeThisWeek;
  }
  if (normalized === 'today') {
    return m.changeToday;
  }
  if (
    normalized === 'same as yesterday' ||
    normalized === 'as yesterday'
  ) {
    return m.changeSameYesterday;
  }
  return label;
}
