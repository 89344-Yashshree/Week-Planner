import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BacklogService } from '../../core/services/backlog.service';
import { WeeklyPlanService } from '../../core/services/weekly-plan.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { BacklogItem } from '../../core/models/backlog-item.model';
import { BacklogCategory } from '../../core/enums/enums';

/** Backlog list screen with category/search/archive filters. */
@Component({
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

      <div class="filter-row">
        <button class="pill" [class.pill-active-blue]="activeCategory === Cat.ClientFocused"
                (click)="toggleCategory(Cat.ClientFocused)" id="filter-client">Client Focused</button>
        <button class="pill" [class.pill-active-red]="activeCategory === Cat.TechDebt"
                (click)="toggleCategory(Cat.TechDebt)" id="filter-tech">Tech Debt</button>
        <button class="pill" [class.pill-active-green]="activeCategory === Cat.RAndD"
                (click)="toggleCategory(Cat.RAndD)" id="filter-rnd">R&D</button>

        <select [(ngModel)]="includeArchived" (change)="load()" class="form-select" id="archive-filter">
          <option [value]="false">Available Only</option>
          <option [value]="true">All</option>
        </select>

        <input type="text" [(ngModel)]="search" (ngModelChange)="load()"
               placeholder="Search by title" class="form-input search-input" id="backlog-search"/>
      </div>

      <div class="backlog-list">
        <div class="backlog-row" *ngFor="let item of items" [id]="'backlog-item-' + item.id">
          <div class="backlog-info">
            <span class="backlog-title">{{ item.title }}</span>
            <span class="badge" [ngClass]="categoryClass(item.category)">{{ categoryLabel(item.category) }}</span>
            <span class="badge badge-gray" *ngIf="item.isInActivePlan">In Plan</span>
            <span class="muted">{{ item.estimatedHours }}h est.</span>
          </div>
          <div class="backlog-actions">
            <button class="btn btn-sm btn-outline" (click)="router.navigate(['/backlog', item.id])" [id]="'edit-' + item.id">View & Edit</button>
            <button class="btn btn-sm btn-danger" (click)="archive(item)" [id]="'archive-' + item.id" *ngIf="!item.isArchived">Archive</button>
          </div>
        </div>
        <p class="empty-state" *ngIf="items.length === 0">No backlog items match your filters.</p>
      </div>
    </div>
  `
})
export class BacklogListComponent implements OnInit {
  items: BacklogItem[] = [];
  activeCategory?: BacklogCategory;
  includeArchived = false;
  search = '';
  Cat = BacklogCategory;

  constructor(
    private backlogService: BacklogService,
    private toast: ToastService,
    private confirmSvc: ConfirmService,
    public router: Router
  ) { }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.backlogService.getAll(this.includeArchived, this.activeCategory, this.search)
      .subscribe(items => this.items = items);
  }

  toggleCategory(cat: BacklogCategory): void {
    this.activeCategory = this.activeCategory === cat ? undefined : cat;
    this.load();
  }

  async archive(item: BacklogItem): Promise<void> {
    const ok = await this.confirmSvc.open({
      title: 'Archive Backlog Item',
      message: `Archive "${item.title}"? It won't be shown in the backlog but can be viewed in history.`,
      confirmLabel: 'Yes, Archive',
      danger: true
    });
    if (!ok) return;
    this.backlogService.archive(item.id).subscribe({
      next: () => { this.items = this.items.filter(i => i.id !== item.id); this.toast.show('Backlog item archived.'); },
      error: e => this.toast.show(e.error?.error || 'Failed.', 'error')
    });
  }

  categoryLabel(cat: BacklogCategory): string {
    return { ClientFocused: 'Client Focused', TechDebt: 'Tech Debt', RAndD: 'R&D' }[cat] || cat;
  }

  categoryClass(cat: BacklogCategory): string {
    return { ClientFocused: 'badge-blue', TechDebt: 'badge-red', RAndD: 'badge-green' }[cat] || '';
  }
}
