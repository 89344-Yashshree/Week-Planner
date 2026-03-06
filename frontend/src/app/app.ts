import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ToastService, Toast } from './core/services/toast.service';
import { DataService } from './core/services/data.service';
import { ConfirmService } from './core/services/confirm.service';
import { ConfirmDialogComponent } from './core/components/confirm-dialog.component';
import { TeamMember } from './core/models/team-member.model';
import { MemberRole } from './core/enums/enums';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ConfirmDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
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

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  // Footer: Seed
  async openSeedConfirm(): Promise<void> {
    const ok = await this.confirmSvc.open({
      title: 'Load Sample Data',
      message: 'This will replace all your current data with sample data. Are you sure?',
      confirmLabel: 'Yes, Load Sample Data',
      danger: false
    });
    if (!ok) return;
    this.dataService.seed().subscribe({
      next: () => {
        this.toastService.show('Sample data loaded! Pick a person to get started.', 'success');
        this.auth.logout();
        this.router.navigate(['/login']);
      },
      error: () => this.toastService.show('Failed to load sample data.', 'error')
    });
  }

  // Footer: Reset
  async openResetConfirm(): Promise<void> {
    const ok = await this.confirmSvc.open({
      title: 'Reset App',
      message: 'This will erase ALL your data. Are you sure?',
      confirmLabel: 'Yes, Reset Everything',
      danger: true
    });
    if (!ok) return;
    this.dataService.reset().subscribe({
      next: () => {
        this.auth.logout();
        this.toastService.show('App has been reset.', 'warning');
        this.router.navigate(['/setup']);
      },
      error: () => this.toastService.show('Reset failed.', 'error')
    });
  }

  // Footer: Download — export all localStorage data as JSON file
  downloadData(): void {
    this.dataService.export().subscribe({
      next: (blob) => {
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

  // Footer: Load from File — import JSON backup
  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.dataService.import(file).subscribe({
      next: () => {
        this.toastService.show('Data restored from file!', 'success');
        this.auth.logout();
        this.router.navigate(['/login']);
      },
      error: (e) => {
        const msg = e?.error?.error || 'Could not restore from file. Make sure it is valid JSON.';
        this.toastService.show(msg, 'error');
      }
    });
    (event.target as HTMLInputElement).value = '';
  }
}
