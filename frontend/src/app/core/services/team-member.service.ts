import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { TeamMember } from '../models/team-member.model';
import { MemberRole } from '../enums/enums';

/** localStorage service for all team-member operations. */
@Injectable({ providedIn: 'root' })
export class TeamMemberService {
    private readonly STORAGE_KEY = 'wpt_team_members';

    private readAll(): TeamMember[] {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        return raw ? JSON.parse(raw) as TeamMember[] : [];
    }

    private writeAll(members: TeamMember[]): void {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(members));
    }

    private uuid(): string {
        return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    getAll(): Observable<TeamMember[]> {
        return of(this.readAll().filter(m => m.isActive));
    }

    add(name: string): Observable<TeamMember> {
        if (!name || !name.trim()) {
            return throwError(() => ({ error: { error: 'Name cannot be empty.' } }));
        }
        const members = this.readAll();
        const isFirst = members.filter(m => m.isActive).length === 0;
        const member: TeamMember = {
            id: this.uuid(),
            name: name.trim(),
            role: isFirst ? MemberRole.Lead : MemberRole.Member,
            isActive: true,
            createdAt: new Date().toISOString()
        };
        members.push(member);
        this.writeAll(members);
        return of(member);
    }

    updateName(id: string, name: string): Observable<TeamMember> {
        const members = this.readAll();
        const idx = members.findIndex(m => m.id === id);
        if (idx === -1) return throwError(() => ({ error: { error: 'Member not found.' } }));
        members[idx] = { ...members[idx], name };
        this.writeAll(members);
        return of(members[idx]);
    }

    makeLead(id: string): Observable<void> {
        const members = this.readAll();
        const target = members.find(m => m.id === id);
        if (!target) return throwError(() => ({ error: { error: 'Member not found.' } }));
        members.forEach(m => { m.role = m.id === id ? MemberRole.Lead : MemberRole.Member; });
        this.writeAll(members);
        return of(void 0);
    }

    remove(id: string): Observable<void> {
        const members = this.readAll();
        const target = members.find(m => m.id === id);
        if (!target) return throwError(() => ({ error: { error: 'Member not found.' } }));
        if (target.role === MemberRole.Lead) {
            return throwError(() => ({ error: { error: 'Cannot remove the Lead. Reassign Lead first.' } }));
        }
        const active = members.filter(m => m.isActive);
        if (active.length <= 1) {
            return throwError(() => ({ error: { error: 'Cannot remove the last member.' } }));
        }
        const idx = members.findIndex(m => m.id === id);
        members[idx] = { ...members[idx], isActive: false };
        this.writeAll(members);
        return of(void 0);
    }
}
