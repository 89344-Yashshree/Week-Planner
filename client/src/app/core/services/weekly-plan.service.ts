import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WeeklyPlan } from '../models/weekly-plan.model';
import { environment } from '../../../environments/environment';

/** HTTP service for weekly-plan lifecycle API calls. */
@Injectable({ providedIn: 'root' })
export class WeeklyPlanService {
    private base = `${environment.apiUrl}/weekly-plans`;

    constructor(private http: HttpClient) { }

    getCurrent(): Observable<WeeklyPlan | null> {
        return this.http.get<WeeklyPlan | null>(`${this.base}/current`);
    }

    getPast(): Observable<WeeklyPlan[]> {
        return this.http.get<WeeklyPlan[]>(`${this.base}/past`);
    }

    startWeek(planningDate: string): Observable<WeeklyPlan> {
        return this.http.post<WeeklyPlan>(this.base, { planningDate });
    }

    setup(id: string, payload: { planningDate: string; memberIds: string[]; clientFocusedPercent: number; techDebtPercent: number; rAndDPercent: number }): Observable<WeeklyPlan> {
        return this.http.put<WeeklyPlan>(`${this.base}/${id}/setup`, payload);
    }

    openPlanning(id: string): Observable<WeeklyPlan> {
        return this.http.put<WeeklyPlan>(`${this.base}/${id}/open-planning`, {});
    }

    getFreezeValidation(id: string): Observable<string[]> {
        return this.http.get<string[]>(`${this.base}/${id}/freeze-validation`);
    }

    freeze(id: string): Observable<WeeklyPlan> {
        return this.http.put<WeeklyPlan>(`${this.base}/${id}/freeze`, {});
    }

    complete(id: string): Observable<WeeklyPlan> {
        return this.http.put<WeeklyPlan>(`${this.base}/${id}/complete`, {});
    }

    cancel(id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/${id}`);
    }
}
