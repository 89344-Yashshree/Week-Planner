import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WeeklyPlanService } from '../../core/services/weekly-plan.service';
import { WeeklyPlan } from '../../core/models/weekly-plan.model';

/** Past weeks screen — list of completed planning cycles. */
@Component({
    selector: 'app-past-weeks',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="page-container">
      <button class="btn btn-back" (click)="router.navigate(['/home'])">← Home</button>
      <h1>Past Weeks</h1>
      <div class="past-weeks-list">
        <div class="past-week-card" *ngFor="let plan of plans">
          <div class="past-week-header">
            <strong>{{ plan.workPeriodDisplay }}</strong>
            <span class="muted">{{ plan.memberCount }} members — {{ plan.totalHours }}h total</span>
          </div>
          <div class="past-week-categories">
            <span class="badge badge-blue">Client {{ plan.clientFocusedPercent }}% ({{ plan.clientFocusedBudgetHours }}h)</span>
            <span class="badge badge-red">Tech Debt {{ plan.techDebtPercent }}% ({{ plan.techDebtBudgetHours }}h)</span>
            <span class="badge badge-green">R&D {{ plan.rAndDPercent }}% ({{ plan.rAndDBudgetHours }}h)</span>
          </div>
        </div>
        <p class="empty-state" *ngIf="plans.length === 0">No past planning weeks yet.</p>
      </div>
    </div>
  `
})
export class PastWeeksComponent implements OnInit {
    plans: WeeklyPlan[] = [];
    constructor(private planService: WeeklyPlanService, public router: Router) { }
    ngOnInit(): void { this.planService.getPast().subscribe(p => this.plans = p); }
}
