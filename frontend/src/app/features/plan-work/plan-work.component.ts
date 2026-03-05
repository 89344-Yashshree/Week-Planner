import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WeeklyPlanService } from '../../core/services/weekly-plan.service';
import { PlanAssignmentService } from '../../core/services/plan-assignment.service';
import { BacklogService } from '../../core/services/backlog.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { WeeklyPlan } from '../../core/models/weekly-plan.model';
import { PlanAssignment } from '../../core/models/plan-assignment.model';
import { BacklogItem } from '../../core/models/backlog-item.model';
import { BacklogCategory } from '../../core/enums/enums';

/** Plan My Work screen — pick backlog items and commit hours. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-plan-work',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="page-container">
      <button class="btn btn-back" (click)="router.navigate(['/home'])">← Home</button>
      <h1>Plan My Work</h1>

      <!-- Personal hours summary -->
      <div class="hours-bar">
        Your hours: <strong>{{ committedHours }} of 30</strong> planned.
        <strong>{{ 30 - committedHours }}</strong> hours left.
      </div>

      <!-- Category budget cards -->
      <div class="budget-grid" *ngIf="plan">
        <div class="budget-card" [ngClass]="'budget-client'">
          <span class="badge badge-blue">Client Focused</span>
          <div class="budget-stat">Budget: {{ plan.clientFocusedBudgetHours }}h</div>
          <div class="budget-stat">Claimed: {{ categoryClaimed(Cat.ClientFocused) }}h</div>
          <div class="budget-stat">Left: {{ plan.clientFocusedBudgetHours - categoryClaimed(Cat.ClientFocused) }}h</div>
          <div class="progress-bar"><div class="progress-fill" [style.width.%]="categoryPercent(Cat.ClientFocused, plan.clientFocusedBudgetHours)"></div></div>
        </div>
        <div class="budget-card">
          <span class="badge badge-red">Tech Debt</span>
          <div class="budget-stat">Budget: {{ plan.techDebtBudgetHours }}h</div>
          <div class="budget-stat">Claimed: {{ categoryClaimed(Cat.TechDebt) }}h</div>
          <div class="budget-stat">Left: {{ plan.techDebtBudgetHours - categoryClaimed(Cat.TechDebt) }}h</div>
          <div class="progress-bar"><div class="progress-fill" [style.width.%]="categoryPercent(Cat.TechDebt, plan.techDebtBudgetHours)"></div></div>
        </div>
        <div class="budget-card">
          <span class="badge badge-green">R&D</span>
          <div class="budget-stat">Budget: {{ plan.rAndDBudgetHours }}h</div>
          <div class="budget-stat">Claimed: {{ categoryClaimed(Cat.RAndD) }}h</div>
          <div class="budget-stat">Left: {{ plan.rAndDBudgetHours - categoryClaimed(Cat.RAndD) }}h</div>
          <div class="progress-bar"><div class="progress-fill" [style.width.%]="categoryPercent(Cat.RAndD, plan.rAndDBudgetHours)"></div></div>
        </div>
      </div>

      <div class="action-row">
        <button class="btn btn-primary" id="add-from-backlog-btn" (click)="showPicker = true">Add Work from Backlog</button>
        <button class="btn btn-secondary" (click)="router.navigate(['/home'])">I'm Done Planning</button>
      </div>

      <!-- My Plan section -->
      <h2>My Plan</h2>
      <div class="assignment-list">
        <div class="assignment-card" *ngFor="let a of myAssignments" [id]="'assignment-' + a.id">
          <div class="assignment-info">
            <strong>{{ a.backlogItemTitle }}</strong>
            <span class="badge" [ngClass]="catClass(a.backlogItemCategory)">{{ catLabel(a.backlogItemCategory) }}</span>
            <span class="muted">{{ a.committedHours }}h committed</span>
          </div>
          <button class="btn btn-sm btn-danger" (click)="removeAssignment(a)" [id]="'remove-' + a.id">Remove</button>
        </div>
        <p class="empty-state" *ngIf="myAssignments.length === 0">
          You haven't picked any work yet. Click 'Add Work from Backlog' to get started.
        </p>
      </div>

      <!-- Backlog Picker overlay -->
      <div class="picker-overlay" *ngIf="showPicker">
        <div class="picker-panel">
          <div class="picker-header">
            <h2>Pick a Backlog Item</h2>
            <p>You have <strong>{{ 30 - committedHours }}</strong> hours left to plan.</p>
            <button class="btn btn-back" (click)="showPicker = false">← Go Back</button>
          </div>

          <div class="picker-items">
            <div class="picker-item" *ngFor="let item of availableItems" [id]="'pick-' + item.id">
              <div class="picker-item-info">
                <strong>{{ item.title }}</strong>
                <span class="badge" [ngClass]="catClass(item.category)">{{ catLabel(item.category) }}</span>
                <span class="muted">{{ item.estimatedHours }}h est.</span>
                <p class="muted-sm" *ngIf="item.description">{{ item.description }}</p>
              </div>
              <button class="btn btn-sm btn-primary" (click)="pickItem(item)">Pick This Item</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Hours commit modal -->
      <div class="modal-overlay" *ngIf="selectedItem">
        <div class="modal-card">
          <h3>How many hours will you work on this?</h3>
          <p><strong>{{ selectedItem.title }}</strong>
            <span class="badge" [ngClass]="catClass(selectedItem.category)">{{ catLabel(selectedItem.category) }}</span>
          </p>
          <p>Your hours left: <strong>{{ 30 - committedHours }}</strong></p>
          <p>Estimate for this item: {{ selectedItem.estimatedHours }}h. You can enter any amount.</p>
          <div class="form-group">
            <label for="commit-hours">Hours to commit</label>
            <input type="number" id="commit-hours" [(ngModel)]="commitHours" min="1" class="form-input"/>
          </div>
          <div class="modal-actions">
            <button class="btn btn-primary" id="add-to-plan-btn" (click)="addToPlan()">Add to My Plan</button>
            <button class="btn btn-secondary" (click)="selectedItem = null">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PlanWorkComponent implements OnInit {
    plan?: WeeklyPlan;
    myAssignments: PlanAssignment[] = [];
    availableItems: BacklogItem[] = [];
    showPicker = false;
    selectedItem: BacklogItem | null = null;
    commitHours = 1;
    Cat = BacklogCategory;
    allAssignments: PlanAssignment[] = [];

    constructor(
        private planService: WeeklyPlanService,
        private assignmentService: PlanAssignmentService,
        private backlogService: BacklogService,
        private auth: AuthService,
        private toast: ToastService,
        public router: Router
    ) { }

    get committedHours(): number {
        return this.myAssignments.reduce((sum, a) => sum + a.committedHours, 0);
    }

    ngOnInit(): void {
        this.planService.getCurrent().subscribe(plan => {
            if (!plan) { this.router.navigate(['/home']); return; }
            this.plan = plan;
            this.loadAssignments();
            this.backlogService.getAll(false).subscribe(items => this.availableItems = items);
        });
    }

    loadAssignments(): void {
        if (!this.plan || !this.auth.currentUser) return;
        this.assignmentService.getAssignments(this.plan.id, this.auth.currentUser.id)
            .subscribe(a => this.myAssignments = a);
    }

    categoryClaimed(cat: BacklogCategory): number {
        return this.myAssignments
            .filter(a => a.backlogItemCategory === cat)
            .reduce((sum, a) => sum + a.committedHours, 0);
    }

    categoryPercent(cat: BacklogCategory, budget: number): number {
        if (!budget) return 0;
        return Math.min(100, (this.categoryClaimed(cat) / budget) * 100);
    }

    pickItem(item: BacklogItem): void {
        this.selectedItem = item;
        this.commitHours = 1;
        this.showPicker = false;
    }

    addToPlan(): void {
        if (!this.plan || !this.auth.currentUser || !this.selectedItem) return;
        this.assignmentService.add({
            weeklyPlanId: this.plan.id,
            teamMemberId: this.auth.currentUser.id,
            backlogItemId: this.selectedItem.id,
            committedHours: this.commitHours
        }).subscribe({
            next: a => {
                this.toast.show(`Added! ${this.selectedItem?.title} — ${this.commitHours}h`);
                this.myAssignments.push(a);
                this.selectedItem = null;
            },
            error: e => this.toast.show(e.error?.error || 'Failed to add item.', 'error')
        });
    }

    removeAssignment(a: PlanAssignment): void {
        if (!this.auth.currentUser) return;
        this.assignmentService.remove(a.id, this.auth.currentUser.id).subscribe({
            next: () => { this.myAssignments = this.myAssignments.filter(x => x.id !== a.id); },
            error: e => this.toast.show(e.error?.error || 'Failed to remove.', 'error')
        });
    }

    catLabel(cat: string): string {
        return { ClientFocused: 'Client Focused', TechDebt: 'Tech Debt', RAndD: 'R&D' }[cat] || cat;
    }

    catClass(cat: string): string {
        return { ClientFocused: 'badge-blue', TechDebt: 'badge-red', RAndD: 'badge-green' }[cat] || '';
    }
}
