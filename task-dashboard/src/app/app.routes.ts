import { Routes } from '@angular/router';
import { Shell } from './layout/shell';

export const routes: Routes = [
  {
    path: '',
    component: Shell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.Dashboard),
        title: 'Dashboard',
      },
      {
        path: 'users',
        loadComponent: () => import('./features/users/users').then((m) => m.Users),
        title: 'Team',
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
