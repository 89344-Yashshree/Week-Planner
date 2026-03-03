import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { TeamMember } from '../models/team-member.model';
import { MemberRole } from '../enums/enums';

/** Unit tests for AuthService — covers login, logout, currentUser, isLead. */
describe('AuthService', () => {
    let service: AuthService;

    const mockMember: TeamMember = {
        id: 'abc-123',
        name: 'Alice Chen',
        role: MemberRole.Lead,
        isActive: true,
        createdAt: new Date().toISOString()
    };

    const mockMember2: TeamMember = {
        id: 'def-456',
        name: 'Bob Martinez',
        role: MemberRole.Member,
        isActive: true,
        createdAt: new Date().toISOString()
    };

    beforeEach(() => {
        // Clear session storage so tests don't bleed into each other
        sessionStorage.clear();
        TestBed.configureTestingModule({});
        service = TestBed.inject(AuthService);
    });

    afterEach(() => sessionStorage.clear());

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('currentUser should be null when no session', () => {
        expect(service.currentUser).toBeNull();
    });

    it('login() should set currentUser and persist to sessionStorage', () => {
        service.login(mockMember);
        expect(service.currentUser?.name).toBe('Alice Chen');
        const raw = sessionStorage.getItem('wpt_current_user');
        expect(raw).not.toBeNull();
        expect(JSON.parse(raw!).name).toBe('Alice Chen');
    });

    it('isLead should be true when current user has Lead role', () => {
        service.login(mockMember);
        expect(service.isLead).toBe(true);
    });

    it('isLead should be false when current user has Member role', () => {
        service.login(mockMember2);
        expect(service.isLead).toBe(false);
    });

    it('logout() should clear currentUser and remove from sessionStorage', () => {
        service.login(mockMember);
        service.logout();
        expect(service.currentUser).toBeNull();
        expect(sessionStorage.getItem('wpt_current_user')).toBeNull();
    });

    it('currentUser$ observable should emit on login', (done: () => void) => {
        service.currentUser$.subscribe(u => {
            if (u?.name === 'Alice Chen') {
                expect(u.role).toBe(MemberRole.Lead);
                done();
            }
        });
        service.login(mockMember);
    });

    it('currentUser$ observable should emit null on logout', (done: () => void) => {
        service.login(mockMember);
        let count = 0;
        service.currentUser$.subscribe(u => {
            count++;
            if (count === 2) {       // first emission is the logged-in user, second is null
                expect(u).toBeNull();
                done();
            }
        });
        service.logout();
    });
});
