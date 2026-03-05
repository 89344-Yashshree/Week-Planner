import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ConfirmConfig {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
    private _config = new BehaviorSubject<ConfirmConfig | null>(null);
    readonly config$ = this._config.asObservable();

    private resolveFn?: (value: boolean) => void;

    open(config: ConfirmConfig): Promise<boolean> {
        this._config.next(config);
        return new Promise(resolve => {
            this.resolveFn = resolve;
        });
    }

    confirm(): void {
        this.resolveFn?.(true);
        this._config.next(null);
    }

    cancel(): void {
        this.resolveFn?.(false);
        this._config.next(null);
    }
}
