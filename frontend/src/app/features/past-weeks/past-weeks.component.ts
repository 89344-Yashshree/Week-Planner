import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WeeklyPlanService } from '../../core/services/weekly-plan.service';
import { DataService } from '../../core/services/data.service';
import { ToastService } from '../../core/services/toast.service';
import { WeeklyPlan } from '../../core/models/weekly-plan.model';

/** Past Weeks screen — PRD §5.13. Shows expandable completed week cards + data import section. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-past-weeks',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <button class="btn btn-back" (click)="router.navigate(['/home'])">← Home</button>
      <h1>Past Weeks</h1>

      <!-- Empty state -->
      <p class="empty-state" *ngIf="plans.length === 0">No past weeks yet.</p>

      <!-- Completed week cards — each is expandable per PRD §5.13 -->
      <div class="past-week-card card" *ngFor="let plan of plans; let i = index">
        <div class="past-week-header card-header"
             style="display:flex; justify-content:space-between; align-items:center; cursor:pointer"
             (click)="toggle(i)">
          <div>
            <strong>{{ plan.workPeriodDisplay }}</strong>
            <span class="muted" style="margin-left:.75rem;">
              {{ plan.memberCount }} members · {{ plan.totalHours }}h total
            </span>
          </div>
          <button class="expand-btn" id="past-week-expand-{{i}}">
            {{ expanded[i] ? '▲ Collapse' : '▼ Details' }}
          </button>
        </div>

        <!-- Expand Panel: category breakdown + member summary -->
        <div class="expand-panel" *ngIf="expanded[i]">
          <div class="category-breakdown">
            <span class="badge badge-blue">
              Client {{ plan.clientFocusedPercent }}% · {{ plan.clientFocusedBudgetHours }}h
            </span>
            <span class="badge badge-red">
              Tech Debt {{ plan.techDebtPercent }}% · {{ plan.techDebtBudgetHours }}h
            </span>
            <span class="badge badge-green">
              R&D {{ plan.rAndDPercent }}% · {{ plan.rAndDBudgetHours }}h
            </span>
          </div>
          <div class="detail-sub">
            Planning date: {{ plan.planningDate }} &nbsp;|&nbsp;
            Work period: {{ plan.workStartDate }} → {{ plan.workEndDate }}
          </div>
          <div class="detail-sub" style="margin-top:.5rem">
            <strong>{{ plan.selectedMembers?.length ?? plan.memberCount }}</strong> members participated
          </div>
          <div *ngIf="plan.selectedMembers?.length" style="margin-top:.5rem">
            <div class="member-row" *ngFor="let m of plan.selectedMembers">
              <span>{{ m.name }}</span>
              <span class="badge" [class.badge-lead]="m.role === 'Lead'" [class.badge-member]="m.role !== 'Lead'">
                {{ m.role }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Data Import section — PRD §5.13 ── -->
      <div class="card" style="margin-top:2rem">
        <h3>📂 Load Data from a Backup File</h3>
        <p class="muted" style="margin:.5rem 0 1rem">
          Pick the backup file you saved before. This will replace all your current data.
        </p>
        <input type="file" accept=".json" id="past-weeks-import-input"
               (change)="onFileSelected($event)" style="display:none" #importInput/>
        <button class="btn btn-outline" id="past-weeks-import-btn"
                (click)="importInput.click()">📤 Choose Backup File</button>
      </div>
    </div>
  `
})
export class PastWeeksComponent implements OnInit {
  plans: WeeklyPlan[] = [];
  expanded: Record<number, boolean> = {};

  constructor(
    private planService: WeeklyPlanService,
    private dataService: DataService,
    private toast: ToastService,
    public router: Router
  ) { }

  ngOnInit(): void {
    this.planService.getPast().subscribe(p => this.plans = p);
  }

  toggle(i: number): void {
    this.expanded[i] = !this.expanded[i];
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.dataService.import(file).subscribe({
      next: () => {
        this.toast.show('Data restored from file!', 'success');
        this.router.navigate(['/login']);
      },
      error: () => this.toast.show('Import failed. Make sure the file is a valid backup.', 'error')
    });
    (event.target as HTMLInputElement).value = '';
  }
}
