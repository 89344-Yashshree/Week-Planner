import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProgressService, TeamProgressDto } from '../../core/services/progress.service';
import { WeeklyPlanService } from '../../core/services/weekly-plan.service';

/** Team Progress dashboard. */
@Component({
    selector: 'app-team-progress',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="page-container">
      <button class="btn btn-back" (click)="router.navigate(['/home'])">← Home</button>
      <h1>Team Progress</h1>

      <div class="progress-overview" *ngIf="progress">
        <div class="progress-stat-card">
          <h3>Overall Progress</h3>
          <div class="progress-bar large">
            <div class="progress-fill" [style.width.%]="progress.overallPercent"></div>
          </div>
          <span class="muted">{{ progress.overallPercent | number:'1.0-1' }}% complete</span>
        </div>
        <div class="stat-pills">
          <div class="stat-pill green">✅ {{ progress.tasksDone }} Done</div>
          <div class="stat-pill red">🚫 {{ progress.tasksBlocked }} Blocked</div>
        </div>
      </div>

      <h2>By Category</h2>
      <div class="category-progress" *ngIf="progress">
        <div class="cat-row" *ngFor="let c of progress.byCategory">
          <span class="badge" [ngClass]="catClass(c.category)">{{ catLabel(c.category) }}</span>
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="safePercent(c.hoursDone, c.committedHours)"></div>
          </div>
          <span class="muted">{{ c.hoursDone }}h of {{ c.committedHours }}h</span>
        </div>
      </div>

      <h2>By Member</h2>
      <div class="member-progress-list" *ngIf="progress">
        <div class="member-progress-card" *ngFor="let m of progress.byMember">
          <div class="member-progress-header" (click)="toggleMember(m.memberId)">
            <strong>{{ m.memberName }}</strong>
            <div class="progress-bar slim">
              <div class="progress-fill" [style.width.%]="safePercent(m.hoursDone, m.committedHours)"></div>
            </div>
            <span class="muted">{{ m.hoursDone }}h of {{ m.committedHours }}h</span>
            <span class="expand-toggle">{{ expanded[m.memberId] ? '▲' : '▼' }}</span>
          </div>
          <div *ngIf="expanded[m.memberId]" class="task-detail-list">
            <div class="task-detail-row" *ngFor="let a of m.assignments">
              <span class="badge" [ngClass]="catClass(a.backlogItemCategory)">{{ catLabel(a.backlogItemCategory) }}</span>
              <strong>{{ a.backlogItemTitle }}</strong>
              <span class="muted">{{ a.committedHours }}h committed / {{ a.hoursCompleted }}h done</span>
              <span class="status-badge" [ngClass]="statusClass(a.status)">{{ a.status }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TeamProgressComponent implements OnInit {
    progress?: TeamProgressDto;
    expanded: Record<string, boolean> = {};

    constructor(
        private progressService: ProgressService,
        private planService: WeeklyPlanService,
        public router: Router
    ) { }

    ngOnInit(): void {
        this.planService.getCurrent().subscribe(plan => {
            if (!plan) return;
            this.progressService.getTeamProgress(plan.id).subscribe(p => this.progress = p);
        });
    }

    toggleMember(id: string): void { this.expanded[id] = !this.expanded[id]; }

    safePercent(done: number, total: number): number {
        return total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    }

    catLabel(cat: string): string {
        return ({ ClientFocused: 'Client Focused', TechDebt: 'Tech Debt', RAndD: 'R&D' } as Record<string, string>)[cat] || cat;
    }
    catClass(cat: string): string {
        return ({ ClientFocused: 'badge-blue', TechDebt: 'badge-red', RAndD: 'badge-green' } as Record<string, string>)[cat] || '';
    }
    statusClass(s: string): string {
        return ({ Done: 'status-done', Blocked: 'status-blocked', InProgress: 'status-progress', NotStarted: 'status-not-started' } as Record<string, string>)[s] || '';
    }
}
