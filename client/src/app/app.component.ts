import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ToastService, Toast } from './core/services/toast.service';
import { DataService } from './core/services/data.service';
import { MemberRole } from './core/enums/enums';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, RouterOutlet],
    template: `
    <div class="app-wrapper">
      <!-- Navbar -->
      <nav class="navbar" *ngIf="user">
        <span class="navbar-brand">📅 Week Planner</span>
        <div class="navbar-links">
          <a (click)="router.navigate(['/home'])" class="nav-link">Home</a>
          <a (click)="router.navigate(['/backlog'])" class="nav-link">Backlog</a>
          <a *ngIf="isLead" (click)="router.navigate(['/manage-members'])" class="nav-link">Team</a>
          <a (click)="router.navigate(['/past-weeks'])" class="nav-link">Past Weeks</a>
        </div>
        <div class="navbar-right">
          <span class="nav-user">{{ user.name }}</span>
          <span class="badge" [class.badge-lead]="isLead" [class.badge-member]="!isLead">
            {{ isLead ? 'Lead' : 'Member' }}
          </span>
          <button class="btn btn-sm btn-secondary" (click)="logout()" id="logout-btn">Switch User</button>
          <button *ngIf="isLead" class="btn btn-sm btn-outline" (click)="dataService.export()" id="export-btn">Export</button>
          <button *ngIf="isLead" class="btn btn-sm btn-danger" (click)="seedData()" id="seed-btn">Load Sample Data</button>
        </div>
      </nav>

      <!-- Main Content -->
      <main class="main-content">
        <router-outlet/>
      </main>

      <!-- Toast Container -->
      <div class="toast-container">
        <div class="toast" *ngFor="let t of toasts"
             [class.toast-success]="t.type === 'success'"
             [class.toast-warning]="t.type === 'warning'"
             [class.toast-error]="t.type === 'error'">
          {{ t.message }}
          <button class="toast-close" (click)="toastService.dismiss(t.id)">×</button>
        </div>
      </div>
    </div>
  `
})
export class AppComponent implements OnInit {
    user = this.auth.currentUser;
    isLead = this.auth.isLead;
    toasts: Toast[] = [];

    constructor(
        public auth: AuthService,
        public toastService: ToastService,
        public dataService: DataService,
        public router: Router
    ) { }

    ngOnInit(): void {
        this.auth.currentUser$.subscribe(u => {
            this.user = u;
            this.isLead = u?.role === MemberRole.Lead;
        });
        this.toastService.toasts$.subscribe(t => this.toasts = t);
    }

    logout(): void {
        this.auth.logout();
        this.router.navigate(['/login']);
    }

    seedData(): void {
        if (!confirm('Load sample data? This will erase all current data.')) return;
        this.dataService.seed().subscribe({
            next: () => this.toastService.show('Sample data loaded!'),
            error: () => this.toastService.show('Failed to load.', 'error')
        });
    }
}
