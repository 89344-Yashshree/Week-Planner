import { Routes } from '@angular/router';
import { authGuard, leadGuard } from './core/guards/guards';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    {
        path: 'setup',
        loadComponent: () => import('./features/team-setup/team-setup.component').then(m => m.TeamSetupComponent)
    },
    {
        path: 'login',
        loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'home',
        canActivate: [authGuard],
        loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
    },
    {
        path: 'manage-members',
        canActivate: [authGuard, leadGuard],
        loadComponent: () => import('./features/team-members/manage-members.component').then(m => m.ManageMembersComponent)
    },
    {
        path: 'backlog',
        canActivate: [authGuard],
        loadComponent: () => import('./features/backlog/backlog-list.component').then(m => m.BacklogListComponent)
    },
    {
        path: 'backlog/new',
        canActivate: [authGuard],
        loadComponent: () => import('./features/backlog/backlog-form.component').then(m => m.BacklogFormComponent)
    },
    {
        path: 'backlog/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./features/backlog/backlog-form.component').then(m => m.BacklogFormComponent)
    },
    {
        path: 'week-setup',
        canActivate: [authGuard, leadGuard],
        loadComponent: () => import('./features/week-setup/week-setup.component').then(m => m.WeekSetupComponent)
    },
    {
        path: 'plan-work',
        canActivate: [authGuard],
        loadComponent: () => import('./features/plan-work/plan-work.component').then(m => m.PlanWorkComponent)
    },
    {
        path: 'review-freeze',
        canActivate: [authGuard, leadGuard],
        loadComponent: () => import('./features/review-freeze/review-freeze.component').then(m => m.ReviewFreezeComponent)
    },
    {
        path: 'update-progress',
        canActivate: [authGuard],
        loadComponent: () => import('./features/progress/update-progress.component').then(m => m.UpdateProgressComponent)
    },
    {
        path: 'team-progress',
        canActivate: [authGuard],
        loadComponent: () => import('./features/progress/team-progress.component').then(m => m.TeamProgressComponent)
    },
    {
        path: 'past-weeks',
        canActivate: [authGuard],
        loadComponent: () => import('./features/past-weeks/past-weeks.component').then(m => m.PastWeeksComponent)
    },
    { path: '**', redirectTo: 'login' }
];
