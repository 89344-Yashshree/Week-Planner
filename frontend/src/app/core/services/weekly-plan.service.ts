import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { WeeklyPlan } from '../models/weekly-plan.model';
import { WeekState } from '../enums/enums';
import { TeamMember } from '../models/team-member.model';

/** localStorage service for weekly-plan lifecycle operations. */
@Injectable({ providedIn: 'root' })
export class WeeklyPlanService {
    private readonly PLAN_KEY = 'wpt_current_plan';
    private readonly PAST_KEY = 'wpt_past_plans';
    private readonly ASSIGNMENTS_KEY = 'wpt_assignments';
    private readonly PROGRESS_KEY = 'wpt_progress_updates';

    private uuid(): string {
        return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    getCurrent(): Observable<WeeklyPlan | null> {
        const raw = localStorage.getItem(this.PLAN_KEY);
        return of(raw ? JSON.parse(raw) as WeeklyPlan : null);
    }

    getPast(): Observable<WeeklyPlan[]> {
        const raw = localStorage.getItem(this.PAST_KEY);
        return of(raw ? JSON.parse(raw) as WeeklyPlan[] : []);
    }

    startWeek(planningDate: string): Observable<WeeklyPlan> {
        // Check for existing active plan
        const existing = localStorage.getItem(this.PLAN_KEY);
        if (existing) {
            const plan = JSON.parse(existing);
            if (plan.state !== WeekState.Completed) {
                return throwError(() => ({ error: { error: 'An active week already exists.' } }));
            }
        }

        const d = new Date(planningDate + 'T00:00:00');
        const wed = new Date(d); wed.setDate(d.getDate() + 1);
        const mon = new Date(d); mon.setDate(d.getDate() + 6);

        const plan: WeeklyPlan = {
            id: this.uuid(),
            planningDate,
            workStartDate: wed.toISOString().split('T')[0],
            workEndDate: mon.toISOString().split('T')[0],
            state: WeekState.Setup,
            clientFocusedPercent: 0,
            techDebtPercent: 0,
            rAndDPercent: 0,
            memberCount: 0,
            totalHours: 0,
            clientFocusedBudgetHours: 0,
            techDebtBudgetHours: 0,
            rAndDBudgetHours: 0,
            workPeriodDisplay: `Work period: ${wed.toISOString().split('T')[0]} to ${mon.toISOString().split('T')[0]}`,
            selectedMembers: []
        };
        localStorage.setItem(this.PLAN_KEY, JSON.stringify(plan));
        return of(plan);
    }

    setup(id: string, payload: {
        planningDate: string;
        memberIds: string[];
        clientFocusedPercent: number;
        techDebtPercent: number;
        rAndDPercent: number;
    }): Observable<WeeklyPlan> {
        const raw = localStorage.getItem(this.PLAN_KEY);
        if (!raw) return throwError(() => ({ error: { error: 'No active plan.' } }));
        const plan: WeeklyPlan = JSON.parse(raw);
        if (plan.id !== id) return throwError(() => ({ error: { error: 'Plan not found.' } }));

        // Get team members from localStorage
        const membersRaw = localStorage.getItem('wpt_team_members');
        const allMembers: TeamMember[] = membersRaw ? JSON.parse(membersRaw) : [];
        const selectedMembers = allMembers.filter(m => payload.memberIds.includes(m.id) && m.isActive);

        const d = new Date(payload.planningDate + 'T00:00:00');
        const wed = new Date(d); wed.setDate(d.getDate() + 1);
        const mon = new Date(d); mon.setDate(d.getDate() + 6);

        const totalHours = selectedMembers.length * 30;

        plan.planningDate = payload.planningDate;
        plan.workStartDate = wed.toISOString().split('T')[0];
        plan.workEndDate = mon.toISOString().split('T')[0];
        plan.workPeriodDisplay = `Work period: ${plan.workStartDate} to ${plan.workEndDate}`;
        plan.clientFocusedPercent = payload.clientFocusedPercent;
        plan.techDebtPercent = payload.techDebtPercent;
        plan.rAndDPercent = payload.rAndDPercent;
        plan.selectedMembers = selectedMembers;
        plan.memberCount = selectedMembers.length;
        plan.totalHours = totalHours;
        plan.clientFocusedBudgetHours = Math.round((totalHours * payload.clientFocusedPercent) / 100);
        plan.techDebtBudgetHours = Math.round((totalHours * payload.techDebtPercent) / 100);
        plan.rAndDBudgetHours = Math.round((totalHours * payload.rAndDPercent) / 100);

        localStorage.setItem(this.PLAN_KEY, JSON.stringify(plan));
        return of(plan);
    }

    openPlanning(id: string): Observable<WeeklyPlan> {
        const raw = localStorage.getItem(this.PLAN_KEY);
        if (!raw) return throwError(() => ({ error: { error: 'No active plan.' } }));
        const plan: WeeklyPlan = JSON.parse(raw);
        if (plan.id !== id) return throwError(() => ({ error: { error: 'Plan not found.' } }));
        plan.state = WeekState.PlanningOpen;
        localStorage.setItem(this.PLAN_KEY, JSON.stringify(plan));
        return of(plan);
    }

    getFreezeValidation(id: string): Observable<string[]> {
        const raw = localStorage.getItem(this.PLAN_KEY);
        if (!raw) return of([]);
        const plan: WeeklyPlan = JSON.parse(raw);
        const assignmentsRaw = localStorage.getItem(this.ASSIGNMENTS_KEY);
        const allAssignments: any[] = assignmentsRaw ? JSON.parse(assignmentsRaw) : [];
        const weekAssignments = allAssignments.filter(a => a.weeklyPlanId === plan.id);

        const errors: string[] = [];

        // Check each member has exactly 30 hours
        plan.selectedMembers.forEach(m => {
            const memberHours = weekAssignments
                .filter(a => a.teamMemberId === m.id)
                .reduce((sum: number, a: any) => sum + a.committedHours, 0);
            if (memberHours !== 30) {
                const diff = 30 - memberHours;
                errors.push(`${m.name} has ${memberHours} hours (needs ${diff > 0 ? diff + ' more' : Math.abs(diff) + ' fewer'}).`);
            }
        });

        // Check category budgets match
        const catCheck = (catName: string, catKey: string, budget: number) => {
            const planned = weekAssignments
                .filter((a: any) => a.backlogItemCategory === catKey)
                .reduce((sum: number, a: any) => sum + a.committedHours, 0);
            if (planned !== budget) {
                errors.push(`${catName} has ${planned}h planned but budget is ${budget}h.`);
            }
        };
        catCheck('Client Focused', 'ClientFocused', plan.clientFocusedBudgetHours);
        catCheck('Tech Debt', 'TechDebt', plan.techDebtBudgetHours);
        catCheck('R&D', 'RAndD', plan.rAndDBudgetHours);

        return of(errors);
    }

    freeze(id: string): Observable<WeeklyPlan> {
        const raw = localStorage.getItem(this.PLAN_KEY);
        if (!raw) return throwError(() => ({ error: { error: 'No active plan.' } }));
        const plan: WeeklyPlan = JSON.parse(raw);
        if (plan.id !== id) return throwError(() => ({ error: { error: 'Plan not found.' } }));
        plan.state = WeekState.Frozen;
        localStorage.setItem(this.PLAN_KEY, JSON.stringify(plan));
        return of(plan);
    }

    complete(id: string): Observable<WeeklyPlan> {
        const raw = localStorage.getItem(this.PLAN_KEY);
        if (!raw) return throwError(() => ({ error: { error: 'No active plan.' } }));
        const plan: WeeklyPlan = JSON.parse(raw);
        if (plan.id !== id) return throwError(() => ({ error: { error: 'Plan not found.' } }));

        plan.state = WeekState.Completed;

        // Move to past plans
        const pastRaw = localStorage.getItem(this.PAST_KEY);
        const pastPlans: WeeklyPlan[] = pastRaw ? JSON.parse(pastRaw) : [];
        pastPlans.unshift(plan);
        localStorage.setItem(this.PAST_KEY, JSON.stringify(pastPlans));

        // Clear current plan
        localStorage.removeItem(this.PLAN_KEY);

        return of(plan);
    }

    cancel(id: string): Observable<void> {
        const raw = localStorage.getItem(this.PLAN_KEY);
        if (!raw) return throwError(() => ({ error: { error: 'No active plan.' } }));
        const plan: WeeklyPlan = JSON.parse(raw);
        if (plan.id !== id) return throwError(() => ({ error: { error: 'Plan not found.' } }));

        // Remove current plan
        localStorage.removeItem(this.PLAN_KEY);

        // Remove all assignments for this week
        const assignmentsRaw = localStorage.getItem(this.ASSIGNMENTS_KEY);
        if (assignmentsRaw) {
            const assignments = JSON.parse(assignmentsRaw).filter((a: any) => a.weeklyPlanId !== id);
            localStorage.setItem(this.ASSIGNMENTS_KEY, JSON.stringify(assignments));
        }

        // Remove progress updates for this week's assignments
        const progressRaw = localStorage.getItem(this.PROGRESS_KEY);
        if (progressRaw) {
            const weekAssignmentIds = new Set(
                (assignmentsRaw ? JSON.parse(assignmentsRaw) : [])
                    .filter((a: any) => a.weeklyPlanId === id)
                    .map((a: any) => a.id)
            );
            const updates = JSON.parse(progressRaw).filter((u: any) => !weekAssignmentIds.has(u.planAssignmentId));
            localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(updates));
        }

        return of(void 0);
    }
}
