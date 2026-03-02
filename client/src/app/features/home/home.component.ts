import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { WeeklyPlanService } from '../../core/services/weekly-plan.service';
import { ToastService } from '../../core/services/toast.service';
import { TeamMember } from '../../core/models/team-member.model';
import { WeeklyPlan } from '../../core/models/weekly-plan.model';
import { MemberRole, WeekState } from '../../core/enums/enums';

interface MenuItem {
    icon: string;
    title: string;
    subtitle: string;
    route: string;
    danger?: boolean;
    action?: () => void;
}

/** Home dashboard — shows context-aware menu based on week state and user role. */
@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="page-container">
      <div class="home-header">
        <h1>What do you want to do?</h1>
        <p class="subtitle">
          Hi, {{ user?.name }}!
          <span class="badge" [class.badge-lead]="isLead" [class.badge-member]="!isLead">
            {{ isLead ? 'Team Lead' : 'Team Member' }}
          </span>
        </p>
      </div>

      <div class="info-bar" *ngIf="statusMessage">{{ statusMessage }}</div>

      <div class="menu-grid" *ngIf="menuItems.length > 0">
        <div class="menu-card" *ngFor="let item of menuItems"
             [class.menu-card-danger]="item.danger"
             (click)="navigate(item)" [id]="'menu-' + item.route">
          <span class="menu-icon">{{ item.icon }}</span>
          <div class="menu-text">
            <strong>{{ item.title }}</strong>
            <span class="menu-subtitle">{{ item.subtitle }}</span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class HomeComponent implements OnInit {
    user: TeamMember | null = null;
    currentPlan: WeeklyPlan | null = null;
    menuItems: MenuItem[] = [];
    statusMessage = '';
    isLead = false;

    constructor(
        private auth: AuthService,
        private planService: WeeklyPlanService,
        private toast: ToastService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.user = this.auth.currentUser;
        this.isLead = this.auth.isLead;

        this.planService.getCurrent().subscribe({
            next: plan => {
                this.currentPlan = plan;
                this.buildMenu();
            },
            error: () => this.buildMenu()
        });
    }

    private buildMenu(): void {
        const plan = this.currentPlan;
        const state = plan?.state;
        const isInPlan = plan?.selectedMembers.some(m => m.id === this.user?.id);

        if (this.isLead) {
            this.buildLeadMenu(state, isInPlan);
        } else {
            this.buildMemberMenu(state, isInPlan);
        }
    }

    private buildLeadMenu(state?: WeekState, isInPlan?: boolean): void {
        const always = [
            { icon: '📋', title: 'Manage Backlog', subtitle: 'Add, edit, or browse work items.', route: '/backlog' },
            { icon: '👥', title: 'Manage Team Members', subtitle: 'Add or remove team members.', route: '/manage-members' },
            { icon: '📅', title: 'View Past Weeks', subtitle: 'Look at completed planning cycles.', route: '/past-weeks' },
        ];

        if (!state || state === WeekState.Completed) {
            this.statusMessage = "No planning weeks yet. Click 'Start a New Week' to begin!";
            this.menuItems = [
                { icon: '🚀', title: 'Start a New Week', subtitle: 'Set up a new planning cycle.', route: '/week-setup' },
                ...always
            ];
        } else if (state === WeekState.Setup) {
            this.menuItems = [
                { icon: '⚙️', title: 'Set Up This Week\'s Plan', subtitle: 'Select members and set category splits.', route: '/week-setup' },
                ...always,
                { icon: '🗑️', title: 'Cancel This Week\'s Planning', subtitle: 'Erase all plans and start over.', route: 'cancel', danger: true }
            ];
        } else if (state === WeekState.PlanningOpen) {
            this.menuItems = [
                { icon: '❄️', title: 'Review and Freeze the Plan', subtitle: "Check everyone's hours and lock the plan.", route: '/review-freeze' },
                { icon: '📝', title: 'Plan My Work', subtitle: 'Pick backlog items and commit hours.', route: '/plan-work' },
                ...always,
                { icon: '🗑️', title: 'Cancel This Week\'s Planning', subtitle: 'Erase all plans and start over.', route: 'cancel', danger: true }
            ];
        } else if (state === WeekState.Frozen) {
            this.menuItems = [
                { icon: '📊', title: 'See Team Progress', subtitle: 'Check how the team is doing.', route: '/team-progress' },
                { icon: '✏️', title: 'Update My Progress', subtitle: 'Report hours and status on your tasks.', route: '/update-progress' },
                { icon: '✅', title: 'Finish This Week', subtitle: 'Close out this cycle.', route: 'complete' },
                ...always
            ];
        }
    }

    private buildMemberMenu(state?: WeekState, isInPlan?: boolean): void {
        const always = [
            { icon: '📋', title: 'Manage Backlog', subtitle: 'Add, edit, or browse work items.', route: '/backlog' },
            { icon: '📅', title: 'View Past Weeks', subtitle: 'Look at completed planning cycles.', route: '/past-weeks' },
        ];

        if (!state || state === WeekState.Completed || state === WeekState.Setup || !isInPlan) {
            this.statusMessage = "There's no active plan for you right now. Check back on Tuesday or ask your Team Lead.";
            this.menuItems = [...always];
        } else if (state === WeekState.PlanningOpen) {
            this.menuItems = [
                { icon: '📝', title: 'Plan My Work', subtitle: 'Pick backlog items and commit your 30 hours.', route: '/plan-work' },
                ...always
            ];
        } else if (state === WeekState.Frozen) {
            this.menuItems = [
                { icon: '✏️', title: 'Update My Progress', subtitle: 'Report hours and status on your tasks.', route: '/update-progress' },
                { icon: '📊', title: 'See Team Progress', subtitle: 'See how the team is doing overall.', route: '/team-progress' },
                ...always
            ];
        }
    }

    navigate(item: MenuItem): void {
        if (!this.currentPlan) return;
        if (item.route === 'cancel') {
            if (confirm('This will erase all plans and start over. Are you sure?')) {
                this.planService.cancel(this.currentPlan.id).subscribe({
                    next: () => {
                        this.toast.show("This week's planning has been cancelled.", 'warning');
                        this.ngOnInit();
                    },
                    error: e => this.toast.show(e.error?.error || 'Failed to cancel.', 'error')
                });
            }
        } else if (item.route === 'complete') {
            if (confirm('This will finish the current week. Are you sure?')) {
                this.planService.complete(this.currentPlan!.id).subscribe({
                    next: () => {
                        this.toast.show('This week is complete! It\'s been moved to Past Weeks.', 'success');
                        this.ngOnInit();
                    },
                    error: e => this.toast.show(e.error?.error || 'Failed to complete week.', 'error')
                });
            }
        } else {
            this.router.navigate([item.route]);
        }
    }
}
