import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'pilgrims', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'pilgrims',
    loadComponent: () => import('./features/pilgrims/pilgrims.component').then(m => m.PilgrimsComponent),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'pilgrims' },
];
