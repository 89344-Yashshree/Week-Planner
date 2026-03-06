import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BacklogService } from '../../core/services/backlog.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { BacklogItem } from '../../core/models/backlog-item.model';
import { BacklogCategory } from '../../core/enums/enums';

/** Add / Edit Backlog Item form. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-backlog-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <button class="btn btn-back" (click)="router.navigate(['/backlog'])">← Go Back</button>
      <h1>{{ isEdit ? 'Edit Backlog Item' : 'Add a New Backlog Item' }}</h1>

      <div class="form-card">
        <div class="form-group">
          <label for="category">Category</label>
          <select id="category" [(ngModel)]="form.category" class="form-select">
            <option [value]="Cat.ClientFocused">Client Focused</option>
            <option [value]="Cat.TechDebt">Tech Debt</option>
            <option [value]="Cat.RAndD">R&D</option>
          </select>
        </div>
        <div class="form-group">
          <label for="title">Title</label>
          <input type="text" id="title" [(ngModel)]="form.title"
                 placeholder="What's this work item?" class="form-input"/>
        </div>
        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" [(ngModel)]="form.description"
                    placeholder="Describe the work (optional)" class="form-textarea" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label for="estimated-hours">Estimated Hours</label>
          <input type="number" id="estimated-hours" [(ngModel)]="form.estimatedHours"
                 min="1" class="form-input"/>
        </div>

        <div class="form-actions">
          <button class="btn btn-primary" id="save-item-btn" (click)="save()">Save This Item</button>
          <button class="btn btn-danger" id="delete-item-btn" *ngIf="isEdit" (click)="deleteItem()">Delete This Item</button>
        </div>
      </div>
    </div>
  `
})
export class BacklogFormComponent implements OnInit {
  isEdit = false;
  itemId?: string;
  Cat = BacklogCategory;
  form = {
    title: '',
    description: '',
    category: BacklogCategory.ClientFocused,
    estimatedHours: 1
  };

  constructor(
    private backlogService: BacklogService,
    private toast: ToastService,
    private confirmSvc: ConfirmService,
    private route: ActivatedRoute,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.itemId = this.route.snapshot.paramMap.get('id') ?? undefined;
    this.isEdit = !!this.itemId;
    if (this.isEdit) {
      this.backlogService.getById(this.itemId!).subscribe(item => {
        this.form = {
          title: item.title,
          description: item.description ?? '',
          category: item.category,
          estimatedHours: item.estimatedHours
        };
        this.cdr.markForCheck();
      });
    }
  }

  save(): void {
    const payload = { title: this.form.title, description: this.form.description, category: this.form.category, estimatedHours: this.form.estimatedHours };
    const req = this.isEdit
      ? this.backlogService.update(this.itemId!, payload)
      : this.backlogService.create(payload);

    req.subscribe({
      next: () => { this.toast.show('Backlog item saved!'); this.router.navigate(['/backlog']); },
      error: e => this.toast.show(e.error?.error || 'Failed to save.', 'error')
    });
  }

  async deleteItem(): Promise<void> {
    const ok = await this.confirmSvc.open({
      title: 'Delete Backlog Item',
      message: 'This will permanently delete the item and cannot be undone.',
      confirmLabel: 'Yes, Delete',
      danger: true
    });
    if (!ok) return;
    this.backlogService.delete(this.itemId!).subscribe({
      next: () => { this.router.navigate(['/backlog']); },
      error: e => this.toast.show(e.error?.error || 'Failed to delete.', 'error')
    });
  }
}
