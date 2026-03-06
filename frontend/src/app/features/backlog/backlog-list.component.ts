import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BacklogService } from '../../core/services/backlog.service';
import { WeeklyPlanService } from '../../core/services/weekly-plan.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { BacklogItem } from '../../core/models/backlog-item.model';
import { BacklogCategory } from '../../core/enums/enums';

/** Backlog list screen with category/search/status filters. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-backlog-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <button class="btn btn-back" (click)="router.navigate(['/home'])">← Home</button>
      <div class="page-header">
        <h1>Manage Backlog</h1>
        <button class="btn btn-primary" id="add-backlog-btn" (click)="router.navigate(['/backlog/new'])">
          + Add a New Backlog Item
        </button>
      </div>

      <div class="loading-bar" *ngIf="loading"><div class="loading-bar-fill"></div></div>

      <!-- Category pill filters -->
      <div class="filter-row">
        <button class="pill" [class.pill-active-blue]="activeCategory === Cat.ClientFocused"
                (click)="toggleCategory(Cat.ClientFocused)" id="filter-client">Client Focused</button>
        <button class="pill" [class.pill-active-red]="activeCategory === Cat.TechDebt"
                (click)="toggleCategory(Cat.TechDebt)" id="filter-tech">Tech Debt</button>
        <button class="pill" [class.pill-active-green]="activeCategory === Cat.RAndD"
                (click)="toggleCategory(Cat.RAndD)" id="filter-rnd">R&D</button>
      </div>

      <!-- Status dropdown + Search bar on same row -->
      <div class="filter-row" style="margin-top:0;">
        <select [(ngModel)]="statusFilter" (change)="load()" class="form-select" id="status-filter"
                style="width:150px; flex:none;">
          <option value="all">Show All</option>
          <option value="available">Available Only</option>
          <option value="inPlan">In Plan</option>
          <option value="archived">Archived</option>
        </select>
        <input type="text" [(ngModel)]="search" (ngModelChange)="load()"
               placeholder="Search by title" class="form-input" id="backlog-search" style="flex:1;"/>
      </div>

      <!-- Backlog items list -->
      <div class="backlog-list">
        <div class="backlog-row" *ngFor="let item of filteredItems" [id]="'backlog-item-' + item.id"
             [class.archived-row]="item.isArchived">
          <div class="backlog-info">
            <span class="backlog-title">{{ item.title }}</span>
            <span class="badge" [ngClass]="categoryClass(item.category)">{{ categoryLabel(item.category) }}</span>
            <span class="badge badge-gray" *ngIf="item.isInActivePlan">IN_PLAN</span>
            <span class="badge badge-archived" *ngIf="item.isArchived">Archived</span>
            <span class="muted">{{ item.estimatedHours }}h est.</span>
          </div>
          <div class="backlog-actions">
            <button class="btn btn-sm btn-outline" (click)="router.navigate(['/backlog', item.id])" [id]="'edit-' + item.id">View & Edit</button>
            <button class="btn btn-sm btn-danger" (click)="archive(item)" [id]="'archive-' + item.id" *ngIf="!item.isArchived">Archive</button>
          </div>
        </div>
        <p class="empty-state" *ngIf="filteredItems.length === 0">No backlog items match your filters.</p>
      </div>
    </div>
  `
})
export class BacklogListComponent implements OnInit {
  items: BacklogItem[] = [];
  activeCategory?: BacklogCategory;
  statusFilter: 'all' | 'available' | 'inPlan' | 'archived' = 'available';
  search = '';
  Cat = BacklogCategory;
  loading = true;

  constructor(
    private backlogService: BacklogService,
    private toast: ToastService,
    private confirmSvc: ConfirmService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void { this.load(); }

  /** Fetches all items (including archived) and lets client-side filtering handle the rest. */
  load(): void {
    this.loading = true;
    this.backlogService.getAll(true, this.activeCategory, this.search)
      .subscribe(items => { this.items = items; this.loading = false; this.cdr.markForCheck(); });
  }

  /** Client-side filter based on the status dropdown. */
  get filteredItems(): BacklogItem[] {
    switch (this.statusFilter) {
      case 'available':
        return this.items.filter(i => !i.isArchived);
      case 'archived':
        return this.items.filter(i => i.isArchived);
      case 'inPlan':
        return this.items.filter(i => i.isInActivePlan && !i.isArchived);
      default: // 'all'
        return this.items;
    }
  }

  toggleCategory(cat: BacklogCategory): void {
    this.activeCategory = this.activeCategory === cat ? undefined : cat;
    this.load();
  }

  async archive(item: BacklogItem): Promise<void> {
    const ok = await this.confirmSvc.open({
      title: 'Archive Backlog Item',
      message: `Archive "${item.title}"? It will be moved to the Archived list.`,
      confirmLabel: 'Yes, Archive',
      danger: true
    });
    if (!ok) return;
    this.backlogService.archive(item.id).subscribe({
      next: () => {
        // Mark item as archived in local list so it moves to archived filter
        const idx = this.items.findIndex(i => i.id === item.id);
        if (idx > -1) this.items[idx] = { ...this.items[idx], isArchived: true };
        this.toast.show('Backlog item archived. View it in the "Archived" filter.');
        this.cdr.markForCheck();
      },
      error: e => { this.toast.show(e.error?.error || 'Failed.', 'error'); this.cdr.markForCheck(); }
    });
  }

  categoryLabel(cat: BacklogCategory): string {
    return { ClientFocused: 'Client Focused', TechDebt: 'Tech Debt', RAndD: 'R&D' }[cat] || cat;
  }

  categoryClass(cat: BacklogCategory): string {
    return { ClientFocused: 'badge-blue', TechDebt: 'badge-red', RAndD: 'badge-green' }[cat] || '';
  }
}
