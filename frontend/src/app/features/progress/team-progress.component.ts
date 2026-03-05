import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProgressService, TeamProgressDto } from '../../core/services/progress.service';
import { WeeklyPlanService } from '../../core/services/weekly-plan.service';

/**
 * Team Progress dashboard — PRD §5.12.
 * Shows overall %, by-category bars, by-member expandable detail
 * with individual task info, description, estimate, cross-member assignments,
 * and the full ProgressUpdate history timeline.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-team-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <button class="btn btn-back" (click)="router.navigate(['/home'])">← Home</button>
      <h1>Team Progress</h1>

      <div *ngIf="!progress" class="empty-state">Loading progress…</div>

      <div *ngIf="progress">

        <!-- ── Overall Progress ── -->
        <div class="card progress-overview">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:.75rem">
            <h3>Overall Progress</h3>
            <span class="muted">{{ progress.overallPercent | number:'1.0-1' }}%</span>
          </div>
          <div class="progress-bar large">
            <div class="progress-fill" [style.width.%]="progress.overallPercent"></div>
          </div>
          <div class="stat-pills" style="margin-top:.75rem">
            <div class="stat-pill green">✅ {{ progress.tasksDone }} Done</div>
            <div class="stat-pill red">🚫 {{ progress.tasksBlocked }} Blocked</div>
            <div class="stat-pill">⏱ {{ progress.totalHoursDone }}h / {{ progress.totalCommittedHours }}h</div>
          </div>
        </div>

        <!-- ── By Category ── -->
        <h2 style="margin:1.5rem 0 .75rem">By Category</h2>
        <div class="card category-progress">
          <div class="cat-row" *ngFor="let c of progress.byCategory">
            <span class="badge" [ngClass]="catClass(c.category)">{{ catLabel(c.category) }}</span>
            <div class="progress-bar" style="flex:1">
              <div class="progress-fill" [style.width.%]="safePercent(c.hoursDone, c.committedHours)"></div>
            </div>
            <span class="muted">{{ c.hoursDone }}h of {{ c.committedHours }}h</span>
          </div>
          <p class="empty-state" *ngIf="!progress.byCategory.length">No category data yet.</p>
        </div>

        <!-- ── By Member ── -->
        <h2 style="margin:1.5rem 0 .75rem">By Member</h2>
        <div class="member-progress-card card" *ngFor="let m of progress.byMember">

          <!-- Member header row -->
          <div class="member-progress-header" (click)="toggleMember(m.memberId)"
               style="display:flex; align-items:center; gap:.75rem; cursor:pointer">
            <strong style="min-width:140px">{{ m.memberName }}</strong>
            <div class="progress-bar slim" style="flex:1">
              <div class="progress-fill" [style.width.%]="safePercent(m.hoursDone, m.committedHours)"></div>
            </div>
            <span class="muted">{{ m.hoursDone }}h / {{ m.committedHours }}h</span>
            <button class="expand-btn" id="member-expand-{{m.memberId}}">
              {{ expanded[m.memberId] ? '▲' : '▼' }}
            </button>
          </div>

          <!-- Expanded: full task detail per PRD §5.12 -->
          <div class="expand-panel" *ngIf="expanded[m.memberId]">
            <div class="task-detail-row card"
                 *ngFor="let a of m.assignments"
                 style="margin-bottom:.75rem; padding:1rem">

              <!-- Task title + category badge -->
              <div style="display:flex; align-items:center; gap:.5rem; margin-bottom:.4rem">
                <span class="badge" [ngClass]="catClass(a.backlogItemCategory)">
                  {{ catLabel(a.backlogItemCategory) }}
                </span>
                <strong>{{ a.backlogItemTitle }}</strong>
              </div>

              <!-- Committed / Done / Status -->
              <div style="display:flex; gap:1.5rem; flex-wrap:wrap; font-size:.9rem; margin-bottom:.5rem">
                <span>Committed: <strong>{{ a.committedHours }}h</strong></span>
                <span>Done: <strong>{{ a.hoursCompleted }}h</strong></span>
                <span class="status-badge" [ngClass]="statusClass(a.status)">{{ a.status }}</span>
              </div>

              <!-- Expand task history toggle -->
              <button class="expand-btn" style="font-size:.8rem"
                      id="task-expand-{{a.id}}"
                      (click)="toggleTask(a.id)">
                {{ expandedTask[a.id] ? '▲ Hide History' : '▼ Update History' }}
              </button>

              <!-- History timeline per PRD §5.12 -->
              <div *ngIf="expandedTask[a.id] && a.progressUpdates?.length" class="expand-panel">
                <h4 style="font-size:.85rem; margin-bottom:.5rem">Update History</h4>
                <div class="history-entry" *ngFor="let h of a.progressUpdates">
                  <span class="history-time">{{ h.timestamp | date:'MMM d, HH:mm' }}</span>
                  <span>{{ h.hoursDone }}h &nbsp; <span class="status-badge" [ngClass]="statusClass(h.status)">{{ h.status }}</span></span>
                  <span class="history-note" *ngIf="h.notes">{{ h.notes }}</span>
                </div>
              </div>
              <div *ngIf="expandedTask[a.id] && !a.progressUpdates?.length" class="expand-panel">
                <p class="muted" style="font-size:.85rem">No progress updates logged yet.</p>
              </div>
            </div>
            <p class="empty-state" *ngIf="!m.assignments.length">No tasks planned.</p>
          </div>
        </div>

      </div><!-- /if progress -->
    </div>
  `
})
export class TeamProgressComponent implements OnInit {
  progress?: TeamProgressDto;
  expanded: Record<string, boolean> = {};
  expandedTask: Record<string, boolean> = {};

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
  toggleTask(id: string): void { this.expandedTask[id] = !this.expandedTask[id]; }

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
