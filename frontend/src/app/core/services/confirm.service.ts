import { Injectable, signal } from '@angular/core';

export interface ConfirmConfig {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
    readonly config = signal<ConfirmConfig | null>(null);
    private resolveFn?: (value: boolean) => void;

    open(config: ConfirmConfig): Promise<boolean> {
        this.config.set(config);
        return new Promise(resolve => {
            this.resolveFn = resolve;
        });
    }

    confirm(): void {
        this.resolveFn?.(true);
        this.config.set(null);
    }

    cancel(): void {
        this.resolveFn?.(false);
        this.config.set(null);
    }
}
