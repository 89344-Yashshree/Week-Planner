import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TeamMember } from '../models/team-member.model';
import { MemberRole } from '../enums/enums';

/** Manages the "current logged-in user" session (stored in sessionStorage). */
@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly STORAGE_KEY = 'wpt_current_user';
    private _currentUser$ = new BehaviorSubject<TeamMember | null>(this.loadUser());

    currentUser$ = this._currentUser$.asObservable();

    get currentUser(): TeamMember | null {
        return this._currentUser$.value;
    }

    get isLead(): boolean {
        return this._currentUser$.value?.role === MemberRole.Lead;
    }

    login(member: TeamMember): void {
        sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(member));
        this._currentUser$.next(member);
    }

    logout(): void {
        sessionStorage.removeItem(this.STORAGE_KEY);
        this._currentUser$.next(null);
    }

    private loadUser(): TeamMember | null {
        const raw = sessionStorage.getItem(this.STORAGE_KEY);
        return raw ? (JSON.parse(raw) as TeamMember) : null;
    }
}
