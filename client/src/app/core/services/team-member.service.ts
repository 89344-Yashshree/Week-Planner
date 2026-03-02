import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TeamMember } from '../models/team-member.model';
import { environment } from '../../../environments/environment';

/** HTTP service for all team-member API calls. */
@Injectable({ providedIn: 'root' })
export class TeamMemberService {
    private base = `${environment.apiUrl}/team-members`;

    constructor(private http: HttpClient) { }

    getAll(): Observable<TeamMember[]> {
        return this.http.get<TeamMember[]>(this.base);
    }

    add(name: string): Observable<TeamMember> {
        return this.http.post<TeamMember>(this.base, { name });
    }

    updateName(id: string, name: string): Observable<TeamMember> {
        return this.http.put<TeamMember>(`${this.base}/${id}`, { name });
    }

    makeLead(id: string): Observable<void> {
        return this.http.put<void>(`${this.base}/${id}/make-lead`, {});
    }

    remove(id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/${id}`);
    }
}
