import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TeamMemberService } from '../../core/services/team-member.service';
import { AuthService } from '../../core/services/auth.service';
import { TeamMember } from '../../core/models/team-member.model';
import { MemberRole } from '../../core/enums/enums';

/** Login screen — "Who are you?" user selection. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container login-page">
      <h1 class="login-title">Who are you?</h1>
      <p class="subtitle">Click your name to get started.</p>

      <div class="empty-state" *ngIf="members.length === 0">
        <p>No team configured. <a (click)="goSetup()" class="link">Set up your team first.</a></p>
      </div>

      <div class="member-grid" *ngIf="members.length > 0">
        <div class="member-card clickable" *ngFor="let m of members"
             (click)="selectUser(m)" [id]="'login-card-' + m.id">
          <span class="member-name">{{ m.name }}</span>
          <span class="badge" [class.badge-lead]="m.role === Role.Lead" [class.badge-member]="m.role === Role.Member">
            {{ m.role === Role.Lead ? 'Team Lead' : 'Team Member' }}
          </span>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  members: TeamMember[] = [];
  Role = MemberRole;

  constructor(
    private teamService: TeamMemberService,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.teamService.getAll().subscribe({
      next: members => {
        this.members = members;
        this.cdr.markForCheck();
        if (members.length === 0) this.router.navigate(['/setup']);
      },
      error: () => this.router.navigate(['/setup'])
    });
  }

  selectUser(member: TeamMember): void {
    this.auth.login(member);
    this.router.navigate(['/home']);
  }

  goSetup(): void {
    this.router.navigate(['/setup']);
  }
}
