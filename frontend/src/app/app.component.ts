import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ToastService, Toast } from './core/services/toast.service';
import { DataService } from './core/services/data.service';
import { TeamMember } from './core/models/team-member.model';
import { MemberRole } from './core/enums/enums';

/** Confirm modal state — controls the PRD §5.14 custom confirmation dialogs. */
interface ConfirmState {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  confirmClass: string;   // 'btn-primary' | 'btn-danger'
  action: () => void;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="app-wrapper">

      <!-- ── Navbar (PRD §5.3) ──────────────────────────────── -->
      <nav class="navbar" *ngIf="user">
        <span class="navbar-brand">📅 Week Planner</span>
        <div class="navbar-links">
          <a (click)="router.navigate(['/home'])" class="nav-link" id="nav-home">🏠 Home</a>
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

      <!-- ── Footer Utility Bar (PRD §5.14) ───────────────── -->
      <footer class="footer-bar">
        <button class="btn btn-outline" id="footer-download-btn" (click)="downloadData()">📥 Download My Data</button>
        <button class="btn btn-outline" id="footer-load-btn" (click)="fileInput.click()">📤 Load Data from File</button>
        <input #fileInput type="file" accept=".json" style="display:none"
               (change)="onFileSelected($event)" id="file-import-input"/>
        <button class="btn btn-outline" id="footer-seed-btn" (click)="openSeedConfirm()">🌱 Seed Sample Data</button>
        <button class="btn btn-danger" id="footer-reset-btn" (click)="openResetConfirm()">🗑️ Reset App</button>
      </footer>

      <!-- ── Custom Confirm Modal (PRD §5.14) ─────────────── -->
      <div class="modal-backdrop" *ngIf="confirm.visible" (click)="confirm.visible = false">
        <div class="modal-box" (click)="$event.stopPropagation()" id="confirm-dialog">
          <h3 id="confirm-title">{{ confirm.title }}</h3>
          <p id="confirm-body">{{ confirm.body }}</p>
          <div class="modal-actions">
            <button id="confirm-ok-btn"
                    [class]="'btn ' + confirm.confirmClass"
                    (click)="runConfirm()">{{ confirm.confirmLabel }}</button>
            <button id="confirm-cancel-btn" class="btn btn-secondary"
                    (click)="confirm.visible = false">Cancel</button>
          </div>
        </div>
      </div>

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

  /** Confirmation dialog state */
  confirm: ConfirmState = {
    visible: false, title: '', body: '', confirmLabel: '', confirmClass: '', action: () => { }
  };

  constructor(
    public auth: AuthService,
    public toastService: ToastService,
    public dataService: DataService,
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

  // ── Confirm dialog helpers ────────────────────────────────────────────────
  private openConfirm(
    title: string, body: string,
    confirmLabel: string, confirmClass: string,
    action: () => void
  ): void {
    this.confirm = { visible: true, title, body, confirmLabel, confirmClass, action };
  }

  runConfirm(): void {
    this.confirm.visible = false;
    this.confirm.action();
  }

  // ── Footer: Seed ──────────────────────────────────────────────────────────
  openSeedConfirm(): void {
    this.openConfirm(
      'Load Sample Data',
      'This will replace all your current data with sample data. Are you sure?',
      'Yes, Load Sample Data', 'btn-primary',
      () => this.doSeed()
    );
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
    this.openConfirm(
      'Reset App',
      'This will erase ALL your data. Are you sure?',
      'Yes, Reset Everything', 'btn-danger',
      () => this.doReset()
    );
  }

  private doReset(): void {
    this.dataService.reset().subscribe({
      next: () => {
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
