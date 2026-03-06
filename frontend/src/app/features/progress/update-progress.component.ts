import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProgressService } from '../../core/services/progress.service';
import { WeeklyPlanService } from '../../core/services/weekly-plan.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { PlanAssignment } from '../../core/models/plan-assignment.model';
import { WeeklyPlan } from '../../core/models/weekly-plan.model';
import { AssignmentStatus } from '../../core/enums/enums';

/** Update My Progress screen — shown only in Frozen state. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-update-progress',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <button class="btn btn-back" (click)="router.navigate(['/home'])">← Home</button>
      <h1>Update My Progress</h1>

      <div class="loading-container" *ngIf="loading">
        <div class="loading-bar"><div class="loading-bar-fill"></div></div>
        Loading your assignments…
      </div>

      <div *ngIf="!loading">
      <!-- Circular overall progress -->
      <div class="circular-progress">
        <div class="progress-ring-container">
          <svg width="90" height="90" viewBox="0 0 90 90">
            <circle class="progress-ring-bg" cx="45" cy="45" r="38" stroke-width="7"/>
            <circle class="progress-ring-fill" cx="45" cy="45" r="38" stroke-width="7"
                    [attr.stroke-dasharray]="238.76"
                    [attr.stroke-dashoffset]="totalCommitted > 0 ? 238.76 - (238.76 * (totalDone / totalCommitted)) : 238.76"/>
          </svg>
          <span class="progress-ring-text">{{ totalCommitted > 0 ? (totalDone / totalCommitted * 100 | number:'1.0-0') : 0 }}%</span>
        </div>
        <div class="progress-details">
          <span class="progress-title">Overall Progress</span>
          <span class="progress-subtitle">{{ totalDone }}h done of {{ totalCommitted }}h committed</span>
        </div>
      </div>

      <div class="hours-bar">
        Committed: <strong>{{ totalCommitted }}h</strong>. Currently: <strong>{{ totalDone }}h</strong> done.
        <span class="warning-text" *ngIf="totalDone > totalCommitted">
          You've put in more hours than you planned. That's okay — this will be noted.
        </span>
      </div>

      <div class="assignment-list">
        <div class="assignment-card progress-card" *ngFor="let a of assignments" [id]="'progress-' + a.id">
          <div class="progress-header">
            <strong>{{ a.backlogItemTitle }}</strong>
            <span class="badge" [ngClass]="catClass(a.backlogItemCategory)">{{ catLabel(a.backlogItemCategory) }}</span>
            <span class="muted">Committed: {{ a.committedHours }}h</span>
          </div>
          <div class="progress-controls">
            <div class="form-group">
              <label [for]="'hours-' + a.id">Hours done</label>
              <input type="number" [id]="'hours-' + a.id"
                     [(ngModel)]="progressMap[a.id].hours" min="0" step="0.5" class="form-input"/>
            </div>
            <div class="form-group">
              <label [for]="'status-' + a.id">Status</label>
              <select [id]="'status-' + a.id" [(ngModel)]="progressMap[a.id].status" class="form-select">
                <option [value]="Status.NotStarted">Not Started</option>
                <option [value]="Status.InProgress">In Progress</option>
                <option [value]="Status.Done">Done</option>
                <option [value]="Status.Blocked">Blocked</option>
              </select>
            </div>
            <button class="btn btn-primary btn-sm" [id]="'update-' + a.id" (click)="updateProgress(a)">Update</button>
          </div>
        </div>

        <p class="empty-state" *ngIf="assignments.length === 0">You have no assigned tasks this week.</p>
      </div>
      </div>
    </div>
  `
})
export class UpdateProgressComponent implements OnInit {
  assignments: PlanAssignment[] = [];
  progressMap: Record<string, { hours: number; status: AssignmentStatus }> = {};
  plan?: WeeklyPlan;
  Status = AssignmentStatus;
  loading = true;

  constructor(
    private progressService: ProgressService,
    private planService: WeeklyPlanService,
    private auth: AuthService,
    private toast: ToastService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  get totalCommitted(): number { return this.assignments.reduce((s, a) => s + a.committedHours, 0); }
  get totalDone(): number { return Object.values(this.progressMap).reduce((s, p) => s + p.hours, 0); }

  ngOnInit(): void {
    this.planService.getCurrent().subscribe(plan => {
      if (!plan || !this.auth.currentUser) return;
      this.plan = plan;
      this.progressService.getMemberProgress(this.auth.currentUser.id, plan.id).subscribe((result: any) => {
        this.assignments = result.assignments || [];
        this.assignments.forEach(a => {
          this.progressMap[a.id] = { hours: a.hoursCompleted, status: a.status };
        });
        this.loading = false;
        this.cdr.markForCheck();
      });
    });
  }

  updateProgress(a: PlanAssignment): void {
    if (!this.auth.currentUser) return;
    const p = this.progressMap[a.id];
    this.progressService.updateProgress(a.id, this.auth.currentUser.id, p.hours, p.status).subscribe({
      next: () => {
        this.toast.show(`Progress updated for "${a.backlogItemTitle}"!`);
        this.cdr.markForCheck();
      },
      error: (e) => {
        const msg = e.error?.error || e.message || 'Failed to update progress.';
        this.toast.show(msg, 'error');
        this.cdr.markForCheck();
      }
    });
  }

  catLabel(cat: string): string { return { ClientFocused: 'Client Focused', TechDebt: 'Tech Debt', RAndD: 'R&D' }[cat] || cat; }
  catClass(cat: string): string { return { ClientFocused: 'badge-blue', TechDebt: 'badge-red', RAndD: 'badge-green' }[cat] || ''; }
}
