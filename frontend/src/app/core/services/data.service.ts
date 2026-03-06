import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MemberRole, BacklogCategory } from '../enums/enums';

/** localStorage service for seed, export, import, and reset operations. */
@Injectable({ providedIn: 'root' })
export class DataService {
    private readonly ALL_KEYS = [
        'wpt_team_members',
        'wpt_backlog_items',
        'wpt_current_plan',
        'wpt_past_plans',
        'wpt_assignments',
        'wpt_progress_updates'
    ];

    private uuid(): string {
        return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    /** Loads pre-built sample data per PRD §10. */
    seed(): Observable<any> {
        const now = new Date().toISOString();

        // Clear existing data
        this.ALL_KEYS.forEach(k => localStorage.removeItem(k));

        // Team members
        const members = [
            { id: this.uuid(), name: 'Alice Chen', role: MemberRole.Lead, isActive: true, createdAt: now },
            { id: this.uuid(), name: 'Bob Martinez', role: MemberRole.Member, isActive: true, createdAt: now },
            { id: this.uuid(), name: 'Carol Williams', role: MemberRole.Member, isActive: true, createdAt: now },
            { id: this.uuid(), name: 'Dave Kim', role: MemberRole.Member, isActive: true, createdAt: now }
        ];
        localStorage.setItem('wpt_team_members', JSON.stringify(members));

        // Backlog items
        const backlogItems = [
            { id: this.uuid(), title: 'Client Onboarding Flow', description: 'Build the full onboarding experience for new clients', category: BacklogCategory.ClientFocused, estimatedHours: 20, isArchived: false, isInActivePlan: false, createdAt: now },
            { id: this.uuid(), title: 'Fix Billing Page Bugs', description: 'Fix critical bugs on the billing page', category: BacklogCategory.ClientFocused, estimatedHours: 8, isArchived: false, isInActivePlan: false, createdAt: now },
            { id: this.uuid(), title: 'Dashboard Redesign', description: 'Redesign the main analytics dashboard', category: BacklogCategory.ClientFocused, estimatedHours: 15, isArchived: false, isInActivePlan: false, createdAt: now },
            { id: this.uuid(), title: 'Support Ticket Integration', description: 'Integrate with the support ticket system', category: BacklogCategory.ClientFocused, estimatedHours: 12, isArchived: false, isInActivePlan: false, createdAt: now },
            { id: this.uuid(), title: 'Migrate to PostgreSQL', description: 'Migrate from MySQL to PostgreSQL', category: BacklogCategory.TechDebt, estimatedHours: 20, isArchived: false, isInActivePlan: false, createdAt: now },
            { id: this.uuid(), title: 'Remove Deprecated API Endpoints', description: 'Clean up old API endpoints', category: BacklogCategory.TechDebt, estimatedHours: 8, isArchived: false, isInActivePlan: false, createdAt: now },
            { id: this.uuid(), title: 'Add Integration Tests', description: 'Add integration tests for core modules', category: BacklogCategory.TechDebt, estimatedHours: 10, isArchived: false, isInActivePlan: false, createdAt: now },
            { id: this.uuid(), title: 'Refactor Auth Module', description: 'Refactor the authentication module', category: BacklogCategory.TechDebt, estimatedHours: 12, isArchived: false, isInActivePlan: false, createdAt: now },
            { id: this.uuid(), title: 'Evaluate LLM for Support', description: 'Evaluate LLM capabilities for customer support', category: BacklogCategory.RAndD, estimatedHours: 12, isArchived: false, isInActivePlan: false, createdAt: now },
            { id: this.uuid(), title: 'Prototype Real-time Notifications', description: 'Build a prototype for real-time push notifications', category: BacklogCategory.RAndD, estimatedHours: 6, isArchived: false, isInActivePlan: false, createdAt: now }
        ];
        localStorage.setItem('wpt_backlog_items', JSON.stringify(backlogItems));

        // No active plan or assignments
        localStorage.setItem('wpt_assignments', JSON.stringify([]));
        localStorage.setItem('wpt_progress_updates', JSON.stringify([]));
        localStorage.setItem('wpt_past_plans', JSON.stringify([]));

        return of({ success: true });
    }

    /** Downloads all app data as a JSON Blob. */
    export(): Observable<Blob> {
        const data: any = {};
        this.ALL_KEYS.forEach(key => {
            const raw = localStorage.getItem(key);
            data[key] = raw ? JSON.parse(raw) : null;
        });
        // Also include friendly keys for backward compatibility
        data.teamMembers = data['wpt_team_members'] || [];
        data.backlogItems = data['wpt_backlog_items'] || [];
        data.currentPlan = data['wpt_current_plan'] || null;
        data.pastPlans = data['wpt_past_plans'] || [];
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        return of(blob);
    }

    /** Restores data from a JSON backup file. */
    import(file: File): Observable<any> {
        return new Observable(subscriber => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result as string);

                    // Support both key formats
                    if (data['wpt_team_members']) {
                        // New format — direct localStorage keys
                        this.ALL_KEYS.forEach(key => {
                            if (data[key] !== undefined && data[key] !== null) {
                                localStorage.setItem(key, JSON.stringify(data[key]));
                            }
                        });
                    } else if (data.teamMembers) {
                        // Old format — friendly keys from server export
                        localStorage.setItem('wpt_team_members', JSON.stringify(data.teamMembers));
                        localStorage.setItem('wpt_backlog_items', JSON.stringify(data.backlogItems || []));
                        if (data.currentPlan) {
                            localStorage.setItem('wpt_current_plan', JSON.stringify(data.currentPlan));
                        } else {
                            localStorage.removeItem('wpt_current_plan');
                        }
                        localStorage.setItem('wpt_past_plans', JSON.stringify(data.pastPlans || data.pastWeeks || []));
                        localStorage.setItem('wpt_assignments', JSON.stringify(data.assignments || []));
                        localStorage.setItem('wpt_progress_updates', JSON.stringify(data.progressUpdates || []));
                    } else {
                        subscriber.error({ error: { error: 'Invalid backup file format.' } });
                        return;
                    }

                    subscriber.next({ success: true });
                    subscriber.complete();
                } catch {
                    subscriber.error({ error: { error: 'Could not parse backup file.' } });
                }
            };
            reader.onerror = () => subscriber.error({ error: { error: 'Could not read file.' } });
            reader.readAsText(file);
        });
    }

    /** Clears all application data from localStorage. */
    reset(): Observable<any> {
        this.ALL_KEYS.forEach(k => localStorage.removeItem(k));
        // Also clear the current user session
        sessionStorage.removeItem('wpt_current_user');
        return of({ success: true });
    }
}
