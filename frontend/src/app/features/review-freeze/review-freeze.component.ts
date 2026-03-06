import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WeeklyPlanService } from '../../core/services/weekly-plan.service';
import { PlanAssignmentService } from '../../core/services/plan-assignment.service';
import { ToastService } from '../../core/services/toast.service';
import { WeeklyPlan } from '../../core/models/weekly-plan.model';
import { PlanAssignment } from '../../core/models/plan-assignment.model';
import { TeamMember } from '../../core/models/team-member.model';

interface MemberReview { member: TeamMember; hoursPlanned: number; assignments: PlanAssignment[]; expanded: boolean; }

/** Review and Freeze screen (Lead only). */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-review-freeze',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <button class="btn btn-back" (click)="router.navigate(['/home'])">← Home</button>
      <h1>Review the Team's Plan</h1>
      <p class="subtitle" *ngIf="plan">Week of {{ plan.planningDate }}. {{ plan.memberCount }} team members. {{ plan.totalHours }} total hours.</p>

      <!-- Category Summary Table -->
      <h3>Category Summary</h3>
      <table class="summary-table" *ngIf="plan">
        <thead><tr><th>Category</th><th>Budget</th><th>Planned</th><th>Status</th></tr></thead>
        <tbody>
          <tr>
            <td><span class="badge badge-blue">Client Focused</span></td>
            <td>{{ plan.clientFocusedBudgetHours }}h</td>
            <td>{{ categoryPlanned('ClientFocused') }}h</td>
            <td [class.valid-text]="isMatch('ClientFocused', plan.clientFocusedBudgetHours)" [class.error-text]="!isMatch('ClientFocused', plan.clientFocusedBudgetHours)">
              {{ isMatch('ClientFocused', plan.clientFocusedBudgetHours) ? '✅ Match' : '⚠ Off by ' + Math.abs(categoryPlanned('ClientFocused') - plan.clientFocusedBudgetHours) + 'h' }}
            </td>
          </tr>
          <tr>
            <td><span class="badge badge-red">Tech Debt</span></td>
            <td>{{ plan.techDebtBudgetHours }}h</td>
            <td>{{ categoryPlanned('TechDebt') }}h</td>
            <td [class.valid-text]="isMatch('TechDebt', plan.techDebtBudgetHours)" [class.error-text]="!isMatch('TechDebt', plan.techDebtBudgetHours)">
              {{ isMatch('TechDebt', plan.techDebtBudgetHours) ? '✅ Match' : '⚠ Off by ' + Math.abs(categoryPlanned('TechDebt') - plan.techDebtBudgetHours) + 'h' }}
            </td>
          </tr>
          <tr>
            <td><span class="badge badge-green">R&D</span></td>
            <td>{{ plan.rAndDBudgetHours }}h</td>
            <td>{{ categoryPlanned('RAndD') }}h</td>
            <td [class.valid-text]="isMatch('RAndD', plan.rAndDBudgetHours)" [class.error-text]="!isMatch('RAndD', plan.rAndDBudgetHours)">
              {{ isMatch('RAndD', plan.rAndDBudgetHours) ? '✅ Match' : '⚠ Off by ' + Math.abs(categoryPlanned('RAndD') - plan.rAndDBudgetHours) + 'h' }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Member Summary -->
      <h3>Member Summary</h3>
      <div class="member-review-list">
        <div class="member-review-card" *ngFor="let mr of memberReviews">
          <div class="member-review-header" (click)="mr.expanded = !mr.expanded">
            <strong>{{ mr.member.name }}</strong>
            <span [class.valid-text]="mr.hoursPlanned === 30" [class.error-text]="mr.hoursPlanned !== 30">
              {{ mr.hoursPlanned }} / 30h
            </span>
            <span class="expand-toggle">{{ mr.expanded ? '▲' : '▼' }}</span>
          </div>
          <div *ngIf="mr.expanded" class="member-items">
            <div *ngFor="let a of mr.assignments" class="assign-row">
              <span>{{ a.backlogItemTitle }}</span>
              <span class="badge badge-sm" [ngClass]="catClass(a.backlogItemCategory)">{{ catLabel(a.backlogItemCategory) }}</span>
              <span class="muted">{{ a.committedHours }}h</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Validation errors -->
      <div class="error-box" *ngIf="freezeErrors.length > 0">
        <strong>Can't freeze yet:</strong>
        <ul><li *ngFor="let e of freezeErrors">{{ e }}</li></ul>
      </div>

      <button class="btn btn-primary btn-full" id="freeze-btn"
              [disabled]="freezeErrors.length > 0" (click)="freeze()">
        ❄️ Freeze the Plan
      </button>
    </div>
  `
})
export class ReviewFreezeComponent implements OnInit {
  plan?: WeeklyPlan;
  allAssignments: PlanAssignment[] = [];
  memberReviews: MemberReview[] = [];
  freezeErrors: string[] = [];
  Math = Math;

  constructor(
    private planService: WeeklyPlanService,
    private assignmentService: PlanAssignmentService,
    private toast: ToastService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.planService.getCurrent().subscribe(plan => {
      if (!plan) { this.router.navigate(['/home']); return; }
      this.plan = plan;
      this.loadAssignments();
      this.cdr.markForCheck();
    });
  }

  loadAssignments(): void {
    if (!this.plan) return;
    // Load all member assignments
    const members = this.plan.selectedMembers;
    let loaded = 0;
    this.allAssignments = [];
    this.memberReviews = [];

    members.forEach(m => {
      this.assignmentService.getAssignments(this.plan!.id, m.id).subscribe(assignments => {
        this.allAssignments.push(...assignments);
        const hours = assignments.reduce((s, a) => s + a.committedHours, 0);
        this.memberReviews.push({ member: m, hoursPlanned: hours, assignments, expanded: false });
        loaded++;
        if (loaded === members.length) {
          this.loadValidation();
          this.cdr.markForCheck();
        }
      });
    });
  }

  loadValidation(): void {
    if (!this.plan) return;
    this.planService.getFreezeValidation(this.plan.id).subscribe(errors => { this.freezeErrors = errors; this.cdr.markForCheck(); });
  }

  categoryPlanned(cat: string): number {
    return this.allAssignments.filter(a => a.backlogItemCategory === cat).reduce((s, a) => s + a.committedHours, 0);
  }

  isMatch(cat: string, budget: number): boolean {
    return this.categoryPlanned(cat) === budget;
  }

  freeze(): void {
    if (!this.plan) return;
    this.planService.freeze(this.plan.id).subscribe({
      next: () => { this.toast.show('Plan is frozen! The team can now track progress.'); this.router.navigate(['/home']); },
      error: e => this.toast.show(e.error?.error || 'Failed to freeze.', 'error')
    });
  }

  catLabel(cat: string): string {
    return { ClientFocused: 'Client Focused', TechDebt: 'Tech Debt', RAndD: 'R&D' }[cat] || cat;
  }

  catClass(cat: string): string {
    return { ClientFocused: 'badge-blue', TechDebt: 'badge-red', RAndD: 'badge-green' }[cat] || '';
  }
}
