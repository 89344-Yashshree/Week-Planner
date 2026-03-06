import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ToastService, Toast } from './core/services/toast.service';
import { DataService } from './core/services/data.service';
import { ConfirmService } from './core/services/confirm.service';
import { TeamMember } from './core/models/team-member.model';
import { MemberRole } from './core/enums/enums';
import { ConfirmDialogComponent } from './core/components/confirm-dialog.component';



@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ConfirmDialogComponent],
  template: `
    <div class="app-wrapper">

      <!-- ── Global Confirm Dialog ─────────────────────────── -->
      <app-confirm-dialog/>

      <!-- Simplified navbar for setup/login pages -->
      <nav class="navbar" *ngIf="isSetupOrLogin">
        <span class="navbar-brand"><img src="favicon.svg" alt="" class="brand-icon"/> Weekly Planner</span>
        <div class="navbar-right">
          <button class="btn btn-sm btn-outline" (click)="toggleTheme()" id="setup-theme-toggle">
            {{ isDark ? 'Light Mode' : 'Dark Mode' }}
          </button>
        </div>
      </nav>

      <!-- Full navbar (logged in, not on setup/login) -->
      <nav class="navbar" *ngIf="user && !isSetupOrLogin">
        <span class="navbar-brand"><img src="favicon.svg" alt="" class="brand-icon"/> Weekly Planner</span>
        <div class="navbar-links">
          <a (click)="router.navigate(['/home'])" class="nav-link" id="nav-home">Home</a>
          <a (click)="router.navigate(['/backlog'])" class="nav-link" id="nav-backlog">Backlog</a>
          <a *ngIf="isLead" (click)="router.navigate(['/manage-members'])" class="nav-link" id="nav-team">Team</a>
          <a (click)="router.navigate(['/past-weeks'])" class="nav-link" id="nav-past">Past Weeks</a>
        </div>
        <div class="navbar-right">
          <span class="nav-user">{{ user.name }}</span>
          <span class="badge" [class.badge-lead]="isLead" [class.badge-member]="!isLead">
            {{ isLead ? 'Lead' : 'Member' }}
          </span>
          <button class="btn btn-sm btn-secondary" (click)="logout()" id="switch-user-btn">🔄 Switch</button>
          <button class="btn btn-sm btn-outline" (click)="toggleTheme()" id="theme-toggle-btn">
            {{ isDark ? '☀️ Light' : '🌙 Dark' }}
          </button>
        </div>
      </nav>

      <!-- ── Main Content ──────────────────────────────────── -->
      <main class="main-content">
        <router-outlet/>
      </main>

      <!-- ── Footer Utility Bar (hidden on setup/login) ───────────────────────── -->
      <footer class="footer-bar" *ngIf="user && !isSetupOrLogin">
        <button class="btn btn-outline" id="footer-download-btn" (click)="downloadData()">📥 Download My Data</button>
        <button class="btn btn-outline" id="footer-load-btn" (click)="fileInput.click()">📤 Load Data from File</button>
        <input #fileInput type="file" accept=".json" style="display:none"
               (change)="onFileSelected($event)" id="file-import-input"/>
        <button class="btn btn-outline" id="footer-seed-btn" (click)="openSeedConfirm()">🌱 Seed Sample Data</button>
        <button class="btn btn-danger" id="footer-reset-btn" (click)="openResetConfirm()">🗑️ Reset App</button>
      </footer>



      <!-- ── Toast Notifications ───────────────────────────── -->
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
  user: TeamMember | null = null;
  isLead = false;
  isDark = true;
  toasts: Toast[] = [];

  get isSetupOrLogin(): boolean {
    return this.router.url.includes('/setup') || this.router.url.includes('/login');
  }

  constructor(
    public auth: AuthService,
    public toastService: ToastService,
    public dataService: DataService,
    private confirmSvc: ConfirmService,
    public router: Router,
    @Inject(DOCUMENT) private document: Document
  ) { }

  ngOnInit(): void {
    this.user = this.auth.currentUser;
    this.isLead = this.auth.isLead;
    this.auth.currentUser$.subscribe(u => {
      this.user = u;
      this.isLead = u?.role === MemberRole.Lead;
    });
    this.toastService.toasts$.subscribe(t => this.toasts = t);
    this.document.body.classList.add('dark-mode');
  }

  // ── Theme toggle ──────────────────────────────────────────────────────────
  toggleTheme(): void {
    this.isDark = !this.isDark;
    if (this.isDark) {
      this.document.body.classList.remove('light-mode');
      this.document.body.classList.add('dark-mode');
    } else {
      this.document.body.classList.remove('dark-mode');
      this.document.body.classList.add('light-mode');
    }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  // ── Footer: Seed ──────────────────────────────────────────────────────────
  openSeedConfirm(): void {
    if (!confirm('This will replace all your current data with sample data. Are you sure?')) return;
    this.doSeed();
  }

  private doSeed(): void {
    this.dataService.seed().subscribe({
      next: () => {
        this.toastService.show('Sample data loaded! Pick a person to get started.', 'success');
        this.router.navigate(['/login']);
      },
      error: () => this.toastService.show('Failed to load sample data.', 'error')
    });
  }

  // ── Footer: Reset ─────────────────────────────────────────────────────────
  openResetConfirm(): void {
    if (!confirm('This will erase ALL your data. Are you sure?')) return;
    this.doReset();
  }

  private doReset(): void {
    this.dataService.reset().subscribe({
      next: () => {
        this.auth.logout();
        this.toastService.show('App has been reset.', 'warning');
        this.router.navigate(['/setup']);
      },
      error: () => this.toastService.show('Reset failed.', 'error')
    });
  }

  // ── Footer: Download ──────────────────────────────────────────────────────
  downloadData(): void {
    this.dataService.export().subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = this.document.createElement('a');
        a.href = url;
        a.download = `weekplanner-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.toastService.show('Your data was saved to a file.', 'success');
      },
      error: () => this.toastService.show('Export failed.', 'error')
    });
  }

  // ── Footer: Load from File ────────────────────────────────────────────────
  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.dataService.import(file).subscribe({
      next: () => {
        this.toastService.show('Data restored from file!', 'success');
        this.router.navigate(['/login']);
      },
      error: () => this.toastService.show('Import failed. Make sure the file is a valid backup.', 'error')
    });
    (event.target as HTMLInputElement).value = '';
  }
}
