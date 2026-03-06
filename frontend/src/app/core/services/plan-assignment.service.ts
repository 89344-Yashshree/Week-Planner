import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { PlanAssignment } from '../models/plan-assignment.model';
import { AssignmentStatus } from '../enums/enums';

/** localStorage service for plan assignment operations. */
@Injectable({ providedIn: 'root' })
export class PlanAssignmentService {
    private readonly STORAGE_KEY = 'wpt_assignments';
    private readonly BACKLOG_KEY = 'wpt_backlog_items';

    private uuid(): string {
        return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    private readAll(): PlanAssignment[] {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        return raw ? JSON.parse(raw) as PlanAssignment[] : [];
    }

    private writeAll(assignments: PlanAssignment[]): void {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(assignments));
    }

    getAssignments(weekId: string, memberId: string): Observable<PlanAssignment[]> {
        const all = this.readAll();
        return of(all.filter(a => a.weeklyPlanId === weekId && a.teamMemberId === memberId));
    }

    add(payload: {
        weeklyPlanId: string;
        teamMemberId: string;
        backlogItemId: string;
        committedHours: number;
    }): Observable<PlanAssignment> {
        if (payload.committedHours <= 0) {
            return throwError(() => ({ error: { error: 'Hours must be > 0.' } }));
        }

        const all = this.readAll();

        // Check for duplicate assignment
        const exists = all.find(a =>
            a.weeklyPlanId === payload.weeklyPlanId &&
            a.teamMemberId === payload.teamMemberId &&
            a.backlogItemId === payload.backlogItemId
        );
        if (exists) {
            return throwError(() => ({ error: { error: 'This item is already in your plan.' } }));
        }

        // Look up backlog item details
        const backlogRaw = localStorage.getItem(this.BACKLOG_KEY);
        const backlogItems = backlogRaw ? JSON.parse(backlogRaw) : [];
        const backlogItem = backlogItems.find((b: any) => b.id === payload.backlogItemId);
        if (!backlogItem) {
            return throwError(() => ({ error: { error: 'Backlog item not found.' } }));
        }

        // Look up member name
        const membersRaw = localStorage.getItem('wpt_team_members');
        const members = membersRaw ? JSON.parse(membersRaw) : [];
        const member = members.find((m: any) => m.id === payload.teamMemberId);

        const assignment: PlanAssignment = {
            id: this.uuid(),
            weeklyPlanId: payload.weeklyPlanId,
            teamMemberId: payload.teamMemberId,
            memberName: member?.name || 'Unknown',
            backlogItemId: payload.backlogItemId,
            backlogItemTitle: backlogItem.title,
            backlogItemCategory: backlogItem.category,
            committedHours: payload.committedHours,
            hoursCompleted: 0,
            status: AssignmentStatus.NotStarted,
            createdAt: new Date().toISOString(),
            progressUpdates: []
        };

        all.push(assignment);
        this.writeAll(all);
        return of(assignment);
    }

    remove(id: string, requestingMemberId: string): Observable<void> {
        let all = this.readAll();
        const idx = all.findIndex(a => a.id === id);
        if (idx === -1) return throwError(() => ({ error: { error: 'Assignment not found.' } }));
        all = all.filter(a => a.id !== id);
        this.writeAll(all);
        return of(void 0);
    }
}
