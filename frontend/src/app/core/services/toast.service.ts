import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'warning' | 'error';
}

/** Manages the application-wide toast notification queue. */
@Injectable({ providedIn: 'root' })
export class ToastService {
    private _toasts$ = new BehaviorSubject<Toast[]>([]);
    toasts$ = this._toasts$.asObservable();
    private nextId = 0;

    show(message: string, type: 'success' | 'warning' | 'error' = 'success'): void {
        const id = this.nextId++;
        const toast: Toast = { id, message, type };
        this._toasts$.next([...this._toasts$.value, toast]);
        // Auto-dismiss after 4 seconds
        setTimeout(() => this.dismiss(id), 4000);
    }

    dismiss(id: number): void {
        this._toasts$.next(this._toasts$.value.filter(t => t.id !== id));
    }
}
