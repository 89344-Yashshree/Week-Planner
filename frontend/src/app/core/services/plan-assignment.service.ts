import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PlanAssignment } from '../models/plan-assignment.model';
import { environment } from '../../../environments/environment';

/** HTTP service for plan assignment operations. */
@Injectable({ providedIn: 'root' })
export class PlanAssignmentService {
    private base = `${environment.apiUrl}/plan-assignments`;

    constructor(private http: HttpClient) { }

    getAssignments(weekId: string, memberId: string): Observable<PlanAssignment[]> {
        const params = new HttpParams().set('weekId', weekId).set('memberId', memberId);
        return this.http.get<PlanAssignment[]>(this.base, { params });
    }

    add(payload: { weeklyPlanId: string; teamMemberId: string; backlogItemId: string; committedHours: number }): Observable<PlanAssignment> {
        return this.http.post<PlanAssignment>(this.base, payload);
    }

    remove(id: string, requestingMemberId: string): Observable<void> {
        const params = new HttpParams().set('requestingMemberId', requestingMemberId);
        return this.http.delete<void>(`${this.base}/${id}`, { params });
    }
}
