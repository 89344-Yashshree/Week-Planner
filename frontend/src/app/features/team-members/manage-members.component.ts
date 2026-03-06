import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TeamMemberService } from '../../core/services/team-member.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { TeamMember } from '../../core/models/team-member.model';
import { MemberRole } from '../../core/enums/enums';

/** Screen for managing team members (Lead only). */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-manage-members',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <button class="btn btn-back" (click)="router.navigate(['/home'])">← Home</button>
      <h1>Manage Team Members</h1>

      <div class="input-row">
        <input type="text" [(ngModel)]="newName" placeholder="Type a name here"
               (keyup.enter)="addMember()" class="form-input" id="new-member-name"/>
        <button class="btn btn-primary" id="add-member-btn" (click)="addMember()">Add This Person</button>
      </div>

      <div class="member-list">
        <div class="member-card" *ngFor="let m of members">
          <div class="member-info">
            <span class="member-name">{{ m.name }}</span>
            <span class="badge" [class.badge-lead]="m.role === Role.Lead" [class.badge-member]="m.role === Role.Member">
              {{ m.role === Role.Lead ? 'Team Lead' : 'Team Member' }}
            </span>
          </div>
          <div class="member-actions">
            <button class="btn btn-sm" [class.btn-lead]="m.role === Role.Lead"
                    (click)="makeLead(m)" [id]="'make-lead-' + m.id">
              {{ m.role === Role.Lead ? 'Lead ✓' : 'Make Lead' }}
            </button>
            <button class="btn btn-sm btn-danger" (click)="remove(m)"
                    [id]="'remove-member-' + m.id"
                    [disabled]="m.role === Role.Lead">Remove</button>
          </div>
        </div>
        <p *ngIf="members.length === 0" class="empty-state">No team members found.</p>
      </div>
    </div>
  `
})
export class ManageMembersComponent implements OnInit {
  members: TeamMember[] = [];
  newName = '';
  Role = MemberRole;

  constructor(
    private teamService: TeamMemberService,
    private toast: ToastService,
    private confirmSvc: ConfirmService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadMembers();
  }

  loadMembers(): void {
    this.teamService.getAll().subscribe(members => { this.members = members; this.cdr.markForCheck(); });
  }

  addMember(): void {
    const name = this.newName.trim();
    if (!name) return;
    this.teamService.add(name).subscribe({
      next: m => { this.members = [...this.members, m]; this.newName = ''; this.cdr.markForCheck(); },
      error: e => { this.toast.show(e.error?.error || 'Failed to add member.', 'error'); this.cdr.markForCheck(); }
    });
  }

  makeLead(member: TeamMember): void {
    this.teamService.makeLead(member.id).subscribe({
      next: () => {
        this.members = this.members.map(m => ({
          ...m,
          role: m.id === member.id ? MemberRole.Lead : MemberRole.Member
        }));
        this.cdr.markForCheck();
      },
      error: e => { this.toast.show(e.error?.error || 'Failed.', 'error'); this.cdr.markForCheck(); }
    });
  }

  async remove(member: TeamMember): Promise<void> {
    const ok = await this.confirmSvc.open({
      title: 'Remove Team Member',
      message: `Remove ${member.name} from the team? This cannot be undone.`,
      confirmLabel: 'Yes, Remove',
      danger: true
    });
    if (!ok) return;
    this.teamService.remove(member.id).subscribe({
      next: () => {
        this.members = this.members.filter(m => m.id !== member.id);
        this.toast.show(`${member.name} has been removed.`, 'success');
        this.cdr.markForCheck();
      },
      error: e => { this.toast.show(e.error?.error || 'Failed to remove member.', 'error'); this.cdr.markForCheck(); }
    });
  }
}
