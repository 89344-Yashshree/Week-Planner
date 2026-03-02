import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PlanAssignment } from '../models/plan-assignment.model';
import { AssignmentStatus } from '../enums/enums';
import { environment } from '../../../environments/environment';

export interface TeamProgressDto {
    overallPercent: number;
    totalCommittedHours: number;
    totalHoursDone: number;
    tasksDone: number;
    tasksBlocked: number;
    byCategory: { category: string; committedHours: number; hoursDone: number }[];
    byMember: { memberId: string; memberName: string; committedHours: number; hoursDone: number; assignments: PlanAssignment[] }[];
}

/** HTTP service for progress tracking operations. */
@Injectable({ providedIn: 'root' })
export class ProgressService {
    private base = `${environment.apiUrl}/progress`;

    constructor(private http: HttpClient) { }

    getTeamProgress(weekId: string): Observable<TeamProgressDto> {
        const params = new HttpParams().set('weekId', weekId);
        return this.http.get<TeamProgressDto>(`${this.base}/team`, { params });
    }

    getMemberProgress(memberId: string, weekId: string): Observable<any> {
        const params = new HttpParams().set('weekId', weekId);
        return this.http.get<any>(`${this.base}/member/${memberId}`, { params });
    }

    updateProgress(assignmentId: string, requestingMemberId: string, hoursDone: number, status: AssignmentStatus, notes?: string): Observable<PlanAssignment> {
        return this.http.put<PlanAssignment>(`${this.base}/${assignmentId}`, {
            requestingMemberId,
            hoursDone,
            status,
            notes
        });
    }
}
