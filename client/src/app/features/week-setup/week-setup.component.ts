import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WeeklyPlanService } from '../../core/services/weekly-plan.service';
import { TeamMemberService } from '../../core/services/team-member.service';
import { ToastService } from '../../core/services/toast.service';
import { TeamMember } from '../../core/models/team-member.model';
import { WeeklyPlan } from '../../core/models/weekly-plan.model';

/** Screen for configuring the week setup (Lead only). */
@Component({
    selector: 'app-week-setup',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="page-container">
      <button class="btn btn-back" (click)="router.navigate(['/home'])">← Home</button>
      <h1>Set Up This Week's Plan</h1>

      <!-- Section 1: Planning Date -->
      <div class="setup-section">
        <h3>Planning date (pick a Tuesday)</h3>
        <input type="date" [(ngModel)]="planningDate" class="form-input date-input" id="planning-date"/>
        <p class="subtitle">Work period: {{ workPeriod }}</p>
        <p class="error-text" *ngIf="planningDate && !isTuesday">⚠ The selected date is not a Tuesday.</p>
      </div>

      <!-- Section 2: Team Selection -->
      <div class="setup-section">
        <h3>Who is working this week?</h3>
        <div class="checkbox-list">
          <label class="checkbox-row" *ngFor="let m of allMembers" [for]="'member-' + m.id">
            <input type="checkbox" [id]="'member-' + m.id"
                   [(ngModel)]="selectedIds[m.id]" (change)="updateSummary()"/>
            {{ m.name }}
            <span class="badge badge-lead" *ngIf="m.role === 'Lead'">Lead</span>
          </label>
        </div>
        <p class="subtitle">Team members selected: {{ selectedCount }}. Total hours to plan: {{ selectedCount * 30 }}</p>
      </div>

      <!-- Section 3: Category Split -->
      <div class="setup-section">
        <h3>How should the hours be split?</h3>
        <div class="percent-row">
          <div class="percent-group">
            <label for="client-pct">Client Focused %</label>
            <input type="number" id="client-pct" [(ngModel)]="clientPct" (change)="updateTotal()" min="0" max="100" class="form-input"/>
          </div>
          <div class="percent-group">
            <label for="tech-pct">Tech Debt %</label>
            <input type="number" id="tech-pct" [(ngModel)]="techPct" (change)="updateTotal()" min="0" max="100" class="form-input"/>
          </div>
          <div class="percent-group">
            <label for="rnd-pct">R&D %</label>
            <input type="number" id="rnd-pct" [(ngModel)]="rndPct" (change)="updateTotal()" min="0" max="100" class="form-input"/>
          </div>
        </div>
        <p [class.valid-text]="totalPct === 100" [class.error-text]="totalPct !== 100">
          Total: {{ totalPct }}% {{ totalPct === 100 ? '✓' : '(must be 100%)' }}
        </p>
      </div>

      <button class="btn btn-warning btn-full" id="open-planning-btn"
              [disabled]="!canOpen" (click)="openPlanning()">
        Open Planning for the Team
      </button>
    </div>
  `
})
export class WeekSetupComponent implements OnInit {
    allMembers: TeamMember[] = [];
    selectedIds: Record<string, boolean> = {};
    planningDate = '';
    clientPct = 40;
    techPct = 40;
    rndPct = 20;
    totalPct = 100;
    currentPlan?: WeeklyPlan;

    constructor(
        private planService: WeeklyPlanService,
        private teamService: TeamMemberService,
        private toast: ToastService,
        public router: Router
    ) { }

    get selectedCount(): number {
        return Object.values(this.selectedIds).filter(Boolean).length;
    }

    get isTuesday(): boolean {
        if (!this.planningDate) return false;
        return new Date(this.planningDate + 'T00:00:00').getDay() === 2;
    }

    get workPeriod(): string {
        if (!this.planningDate) return '';
        const d = new Date(this.planningDate + 'T00:00:00');
        const wed = new Date(d); wed.setDate(d.getDate() + 1);
        const mon = new Date(d); mon.setDate(d.getDate() + 6);
        return `${wed.toISOString().split('T')[0]} to ${mon.toISOString().split('T')[0]}`;
    }

    get canOpen(): boolean {
        return this.isTuesday && this.selectedCount > 0 && this.totalPct === 100;
    }

    ngOnInit(): void {
        this.setDefaultTuesday();
        this.teamService.getAll().subscribe(members => {
            this.allMembers = members;
        });
        // Load existing plan config if in Setup state
        this.planService.getCurrent().subscribe(plan => {
            if (plan) {
                this.currentPlan = plan;
                this.planningDate = plan.planningDate;
                this.clientPct = plan.clientFocusedPercent;
                this.techPct = plan.techDebtPercent;
                this.rndPct = plan.rAndDPercent;
                plan.selectedMembers.forEach(m => this.selectedIds[m.id] = true);
            }
        });
    }

    updateTotal(): void {
        this.totalPct = (this.clientPct || 0) + (this.techPct || 0) + (this.rndPct || 0);
    }

    updateSummary(): void { }

    openPlanning(): void {
        const memberIds = Object.entries(this.selectedIds).filter(([, v]) => v).map(([k]) => k);

        const doOpen = (planId: string) => {
            const setupPayload = { planningDate: this.planningDate, memberIds, clientFocusedPercent: this.clientPct, techDebtPercent: this.techPct, rAndDPercent: this.rndPct };
            this.planService.setup(planId, setupPayload).subscribe({
                next: () => {
                    this.planService.openPlanning(planId).subscribe({
                        next: () => { this.toast.show('Planning is open! Team members can now plan their work.'); this.router.navigate(['/home']); },
                        error: e => this.toast.show(e.error?.error || 'Failed to open planning.', 'error')
                    });
                },
                error: e => this.toast.show(e.error?.error || 'Failed to configure plan.', 'error')
            });
        };

        if (this.currentPlan) {
            doOpen(this.currentPlan.id);
        } else {
            this.planService.startWeek(this.planningDate).subscribe({
                next: plan => doOpen(plan.id),
                error: e => this.toast.show(e.error?.error || 'Failed to start week.', 'error')
            });
        }
    }

    private setDefaultTuesday(): void {
        const d = new Date();
        const day = d.getDay();
        const daysUntilTuesday = (2 - day + 7) % 7 || 7;
        d.setDate(d.getDate() + daysUntilTuesday);
        this.planningDate = d.toISOString().split('T')[0];
    }
}
