import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TeamMemberService } from '../../core/services/team-member.service';
import { ToastService } from '../../core/services/toast.service';
import { TeamMember } from '../../core/models/team-member.model';
import { MemberRole } from '../../core/enums/enums';

/** First-time team setup screen. Shown when no team members exist in the system. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-team-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="card setup-card">
        <h1>Welcome! Set up your team to start planning.</h1>
        <p class="subtitle">Add the people on your team. Pick one person as the Team Lead.</p>

        <div class="input-row">
          <input type="text" [(ngModel)]="newName" placeholder="Type a name here"
                 (keyup.enter)="addMember()" class="form-input" id="new-member-name"/>
          <button class="btn btn-primary" id="add-member-btn" (click)="addMember()">Add This Person</button>
        </div>

        <div class="member-list" *ngIf="members.length > 0; else emptyList">
          <div class="member-card" *ngFor="let m of members">
            <div class="member-info">
              <span class="member-name">{{ m.name }}</span>
              <span class="badge" [class.badge-lead]="m.role === Role.Lead" [class.badge-member]="m.role === Role.Member">
                {{ m.role === Role.Lead ? 'Team Lead' : 'Team Member' }}
              </span>
            </div>
            <button class="btn btn-sm" [class.btn-lead]="m.role === Role.Lead"
                    (click)="makeLead(m)" id="make-lead-{{ m.id }}">
              {{ m.role === Role.Lead ? 'Lead ✓' : 'Make Lead' }}
            </button>
          </div>
        </div>
        <ng-template #emptyList>
          <p class="empty-state">No team members added yet.</p>
        </ng-template>

        <button class="btn btn-warning btn-full" id="done-setup-btn"
                (click)="done()" [disabled]="members.length === 0">
          Done — Go to Home Screen
        </button>
      </div>
    </div>
  `
})
export class TeamSetupComponent implements OnInit {
  members: TeamMember[] = [];
  newName = '';
  Role = MemberRole;

  constructor(
    private teamService: TeamMemberService,
    private toast: ToastService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.teamService.getAll().subscribe(members => {
      this.members = members;
      if (members.length > 0) {
        // If team already configured, go to login
        this.router.navigate(['/login']);
      }
    });
  }

  addMember(): void {
    const name = this.newName.trim();
    if (!name) return;
    this.teamService.add(name).subscribe({
      next: m => {
        this.members.push(m);
        this.newName = '';
      },
      error: e => this.toast.show(e.error?.error || 'Failed to add member.', 'error')
    });
  }

  makeLead(member: TeamMember): void {
    this.teamService.makeLead(member.id).subscribe({
      next: () => {
        this.members.forEach(m => m.role = m.id === member.id ? MemberRole.Lead : MemberRole.Member);
      },
      error: e => this.toast.show(e.error?.error || 'Failed to update.', 'error')
    });
  }

  done(): void {
    this.router.navigate(['/login']);
  }
}
