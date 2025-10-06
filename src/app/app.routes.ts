import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/register',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'register/affected',
    loadComponent: () => import('./features/auth/register-affected/register-affected.component').then(m => m.RegisterAffectedComponent)
  },
  {
    path: 'register/donator',
    loadComponent: () => import('./features/auth/register-donator/register-donator.component').then(m => m.RegisterDonatorComponent)
  },
  {
    path: 'donations',
    loadComponent: () => import('./features/donations/donation-list/donation-list.component').then(m => m.DonationListComponent)
    // No auth required - public donation history
  },
  {
    path: 'acknowledgement',
    loadComponent: () => import('./features/acknowledgement/acknowledgement.component').then(m => m.AcknowledgementComponent)
    // Public acknowledgement page for all donation announcements
  },
  {
    path: 'map',
    loadComponent: () => import('./features/map/map.component').then(m => m.MapComponent)
    // No canActivate - publicly accessible
  },
  {
    path: '**',
    redirectTo: '/map'
  }
];
