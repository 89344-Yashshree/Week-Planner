import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TeamMemberService } from './team-member.service';
import { TeamMember } from '../models/team-member.model';
import { MemberRole } from '../enums/enums';
import { environment } from '../../../environments/environment';

/** Unit tests for TeamMemberService — verifies correct HTTP calls using HttpClientTestingModule. */
describe('TeamMemberService', () => {
    let service: TeamMemberService;
    let httpMock: HttpTestingController;
    const base = `${environment.apiUrl}/team-members`;

    const mockMember: TeamMember = {
        id: 'uuid-1',
        name: 'Alice Chen',
        role: MemberRole.Lead,
        isActive: true,
        createdAt: new Date().toISOString()
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [TeamMemberService]
        });
        service = TestBed.inject(TeamMemberService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify()); // Verify no unexpected HTTP requests

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    // ── getAll() ──────────────────────────────────────────────────────────────

    it('getAll() should call GET /api/team-members and return members', () => {
        service.getAll().subscribe(members => {
            expect(members.length).toBe(1);
            expect(members[0].name).toBe('Alice Chen');
        });

        const req = httpMock.expectOne(base);
        expect(req.request.method).toBe('GET');
        req.flush([mockMember]);
    });

    // ── add() ─────────────────────────────────────────────────────────────────

    it('add() should call POST /api/team-members with name in body', () => {
        service.add('Bob Martinez').subscribe(m => {
            expect(m.name).toBe('Bob Martinez');
        });

        const req = httpMock.expectOne(base);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ name: 'Bob Martinez' });
        req.flush({ ...mockMember, name: 'Bob Martinez' });
    });

    // ── updateName() ──────────────────────────────────────────────────────────

    it('updateName() should call PUT /api/team-members/:id with name', () => {
        service.updateName('uuid-1', 'Alice Updated').subscribe();

        const req = httpMock.expectOne(`${base}/uuid-1`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual({ name: 'Alice Updated' });
        req.flush(mockMember);
    });

    // ── makeLead() ────────────────────────────────────────────────────────────

    it('makeLead() should call PUT /api/team-members/:id/make-lead', () => {
        service.makeLead('uuid-1').subscribe();

        const req = httpMock.expectOne(`${base}/uuid-1/make-lead`);
        expect(req.request.method).toBe('PUT');
        req.flush(null);
    });

    // ── remove() ─────────────────────────────────────────────────────────────

    it('remove() should call DELETE /api/team-members/:id', () => {
        service.remove('uuid-1').subscribe();

        const req = httpMock.expectOne(`${base}/uuid-1`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });
});
