import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { PlanAssignment } from '../models/plan-assignment.model';
import { ProgressUpdate } from '../models/progress-update.model';
import { AssignmentStatus } from '../enums/enums';

export interface TeamProgressDto {
    overallPercent: number;
    totalCommittedHours: number;
    totalHoursDone: number;
    tasksDone: number;
    tasksBlocked: number;
    byCategory: { category: string; committedHours: number; hoursDone: number }[];
    byMember: { memberId: string; memberName: string; committedHours: number; hoursDone: number; assignments: PlanAssignment[] }[];
}

/** localStorage service for progress tracking operations. */
@Injectable({ providedIn: 'root' })
export class ProgressService {
    private readonly ASSIGNMENTS_KEY = 'wpt_assignments';
    private readonly PROGRESS_KEY = 'wpt_progress_updates';

    private uuid(): string {
        return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    private readAssignments(): PlanAssignment[] {
        const raw = localStorage.getItem(this.ASSIGNMENTS_KEY);
        return raw ? JSON.parse(raw) as PlanAssignment[] : [];
    }

    private writeAssignments(assignments: PlanAssignment[]): void {
        localStorage.setItem(this.ASSIGNMENTS_KEY, JSON.stringify(assignments));
    }

    private readProgress(): ProgressUpdate[] {
        const raw = localStorage.getItem(this.PROGRESS_KEY);
        return raw ? JSON.parse(raw) as ProgressUpdate[] : [];
    }

    private writeProgress(updates: ProgressUpdate[]): void {
        localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(updates));
    }

    getTeamProgress(weekId: string): Observable<TeamProgressDto> {
        const all = this.readAssignments().filter(a => a.weeklyPlanId === weekId);
        const progressUpdates = this.readProgress();

        // Attach progress updates to each assignment
        const enriched = all.map(a => ({
            ...a,
            progressUpdates: progressUpdates
                .filter((p: any) => p.planAssignmentId === a.id)
                .sort((x: any, y: any) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime())
        }));

        const totalCommitted = enriched.reduce((s, a) => s + a.committedHours, 0);
        const totalDone = enriched.reduce((s, a) => s + a.hoursCompleted, 0);
        const overallPercent = totalCommitted > 0 ? Math.round((totalDone / totalCommitted) * 100) : 0;
        const tasksDone = enriched.filter(a => a.status === AssignmentStatus.Done).length;
        const tasksBlocked = enriched.filter(a => a.status === AssignmentStatus.Blocked).length;

        // By category
        const catMap = new Map<string, { committedHours: number; hoursDone: number }>();
        enriched.forEach(a => {
            const cat = a.backlogItemCategory;
            const cur = catMap.get(cat) || { committedHours: 0, hoursDone: 0 };
            cur.committedHours += a.committedHours;
            cur.hoursDone += a.hoursCompleted;
            catMap.set(cat, cur);
        });
        const byCategory = Array.from(catMap.entries()).map(([category, data]) => ({
            category, ...data
        }));

        // By member
        const memberMap = new Map<string, { memberId: string; memberName: string; committedHours: number; hoursDone: number; assignments: PlanAssignment[] }>();
        enriched.forEach(a => {
            const cur = memberMap.get(a.teamMemberId) || {
                memberId: a.teamMemberId,
                memberName: a.memberName,
                committedHours: 0,
                hoursDone: 0,
                assignments: []
            };
            cur.committedHours += a.committedHours;
            cur.hoursDone += a.hoursCompleted;
            cur.assignments.push(a);
            memberMap.set(a.teamMemberId, cur);
        });
        const byMember = Array.from(memberMap.values());

        return of({
            overallPercent,
            totalCommittedHours: totalCommitted,
            totalHoursDone: totalDone,
            tasksDone,
            tasksBlocked,
            byCategory,
            byMember
        });
    }

    getMemberProgress(memberId: string, weekId: string): Observable<any> {
        const all = this.readAssignments().filter(a => a.weeklyPlanId === weekId && a.teamMemberId === memberId);
        const progressUpdates = this.readProgress();

        const enriched = all.map(a => ({
            ...a,
            progressUpdates: progressUpdates
                .filter((p: any) => p.planAssignmentId === a.id)
                .sort((x: any, y: any) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime())
        }));

        return of({ assignments: enriched });
    }

    updateProgress(assignmentId: string, requestingMemberId: string, hoursDone: number, status: AssignmentStatus, notes?: string): Observable<PlanAssignment> {
        const assignments = this.readAssignments();
        const idx = assignments.findIndex(a => a.id === assignmentId);
        if (idx === -1) {
            return of(null as any);
        }

        // Update the assignment
        assignments[idx] = {
            ...assignments[idx],
            hoursCompleted: hoursDone,
            status
        };
        this.writeAssignments(assignments);

        // Log a progress update
        const allProgress = this.readProgress();
        const update: any = {
            id: this.uuid(),
            planAssignmentId: assignmentId,
            timestamp: new Date().toISOString(),
            hoursDone,
            status,
            notes: notes || undefined
        };
        allProgress.push(update);
        this.writeProgress(allProgress);

        return of(assignments[idx]);
    }
}
