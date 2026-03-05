import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { ToastService, Toast } from './core/services/toast.service';
import { DataService } from './core/services/data.service';
import { ConfirmService } from './core/services/confirm.service';
import { ConfirmDialogComponent } from './core/components/confirm-dialog.component';
import { TeamMemberService } from './core/services/team-member.service';
import { BacklogService } from './core/services/backlog.service';
import { WeeklyPlanService } from './core/services/weekly-plan.service';
import { TeamMember } from './core/models/team-member.model';
import { MemberRole } from './core/enums/enums';
import { environment } from '../environments/environment';

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

  constructor(
    public auth: AuthService,
    public toastService: ToastService,
    public dataService: DataService,
    private confirmSvc: ConfirmService,
    private teamService: TeamMemberService,
    private backlogService: BacklogService,
    private planService: WeeklyPlanService,
    private http: HttpClient,
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

    // Warm-up ping to wake the backend from cold start
    this.http.get(`${environment.apiUrl.replace('/api', '')}/health`, { responseType: 'text' })
      .subscribe({ error: () => { } });
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
        this.toastService.show('App has been reset.', 'warning');
        this.router.navigate(['/setup']);
      },
      error: () => this.toastService.show('Reset failed.', 'error')
    });
  }

  // Footer: Download — client-side export from individual endpoints
  downloadData(): void {
    forkJoin({
      teamMembers: this.teamService.getAll(),
      backlogItems: this.backlogService.getAll(true),
      currentPlan: this.planService.getCurrent(),
      pastPlans: this.planService.getPast()
    }).subscribe({
      next: (data) => {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
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

  // Footer: Load from File — client-side JSON read + validation
  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        // Validate backup structure
        if (!data.teamMembers && !data.backlogItems) {
          this.toastService.show('Invalid backup file. Expected Week Planner data format.', 'error');
          return;
        }
        // Try server-side import first
        this.dataService.import(file).subscribe({
          next: () => {
            this.toastService.show('Data restored from file!', 'success');
            this.router.navigate(['/login']);
          },
          error: () => {
            // Server import failed — show what was found in the file
            const members = data.teamMembers?.length || 0;
            const items = data.backlogItems?.length || 0;
            this.toastService.show(`File read OK (${members} members, ${items} backlog items) but server import is unavailable. Please seed data instead.`, 'warning');
          }
        });
      } catch {
        this.toastService.show('Could not read the file. Make sure it is valid JSON.', 'error');
      }
    };
    reader.readAsText(file);
    (event.target as HTMLInputElement).value = '';
  }
}
