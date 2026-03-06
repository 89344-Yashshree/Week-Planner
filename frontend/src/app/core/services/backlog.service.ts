import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { BacklogItem } from '../models/backlog-item.model';
import { BacklogCategory } from '../enums/enums';

/** localStorage service for all backlog-item operations. */
@Injectable({ providedIn: 'root' })
export class BacklogService {
    private readonly STORAGE_KEY = 'wpt_backlog_items';
    private readonly ASSIGNMENTS_KEY = 'wpt_assignments';
    private readonly PLAN_KEY = 'wpt_current_plan';

    private readAll(): BacklogItem[] {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        return raw ? JSON.parse(raw) as BacklogItem[] : [];
    }

    private writeAll(items: BacklogItem[]): void {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    }

    private uuid(): string {
        return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    /** Get the set of backlog item IDs that are assigned in the current active plan. */
    private getInPlanIds(): Set<string> {
        const plan = localStorage.getItem(this.PLAN_KEY);
        if (!plan) return new Set();
        const currentPlan = JSON.parse(plan);
        const raw = localStorage.getItem(this.ASSIGNMENTS_KEY);
        const assignments: any[] = raw ? JSON.parse(raw) : [];
        const weekAssignments = assignments.filter(a => a.weeklyPlanId === currentPlan.id);
        return new Set(weekAssignments.map(a => a.backlogItemId));
    }

    getAll(includeArchived = false, category?: BacklogCategory, search?: string): Observable<BacklogItem[]> {
        let items = this.readAll();
        const inPlanIds = this.getInPlanIds();

        // Apply filters
        if (!includeArchived) {
            items = items.filter(i => !i.isArchived);
        }
        if (category) {
            items = items.filter(i => i.category === category);
        }
        if (search && search.trim()) {
            const s = search.trim().toLowerCase();
            items = items.filter(i => i.title.toLowerCase().includes(s));
        }

        // Set isInActivePlan flag
        items = items.map(i => ({ ...i, isInActivePlan: inPlanIds.has(i.id) }));

        return of(items);
    }

    getById(id: string): Observable<BacklogItem> {
        const items = this.readAll();
        const item = items.find(i => i.id === id);
        if (!item) return throwError(() => ({ error: { error: 'Item not found.' } }));
        const inPlanIds = this.getInPlanIds();
        return of({ ...item, isInActivePlan: inPlanIds.has(item.id) });
    }

    create(item: { title: string; description?: string; category: BacklogCategory; estimatedHours: number }): Observable<BacklogItem> {
        if (!item.title || !item.title.trim()) {
            return throwError(() => ({ error: { error: 'Title cannot be empty.' } }));
        }
        if (!item.estimatedHours || item.estimatedHours <= 0) {
            return throwError(() => ({ error: { error: 'Estimated hours must be > 0.' } }));
        }
        const items = this.readAll();
        const newItem: BacklogItem = {
            id: this.uuid(),
            title: item.title.trim(),
            description: item.description || '',
            category: item.category,
            estimatedHours: item.estimatedHours,
            isArchived: false,
            isInActivePlan: false,
            createdAt: new Date().toISOString()
        };
        items.push(newItem);
        this.writeAll(items);
        return of(newItem);
    }

    update(id: string, item: { title: string; description?: string; category: BacklogCategory; estimatedHours: number }): Observable<BacklogItem> {
        const items = this.readAll();
        const idx = items.findIndex(i => i.id === id);
        if (idx === -1) return throwError(() => ({ error: { error: 'Item not found.' } }));
        items[idx] = {
            ...items[idx],
            title: item.title,
            description: item.description || '',
            category: item.category,
            estimatedHours: item.estimatedHours
        };
        this.writeAll(items);
        return of(items[idx]);
    }

    archive(id: string): Observable<void> {
        const items = this.readAll();
        const idx = items.findIndex(i => i.id === id);
        if (idx === -1) return throwError(() => ({ error: { error: 'Item not found.' } }));
        items[idx] = { ...items[idx], isArchived: true };
        this.writeAll(items);
        return of(void 0);
    }

    delete(id: string): Observable<void> {
        let items = this.readAll();
        items = items.filter(i => i.id !== id);
        this.writeAll(items);
        return of(void 0);
    }
}
