import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { ConfirmService, ConfirmConfig } from '../services/confirm.service';

/** Global confirmation dialog — place once in AppComponent template. */
@Component({
    selector: 'app-confirm-dialog',
    standalone: true,
    imports: [CommonModule, AsyncPipe],
    template: `
    <ng-container *ngIf="svc.config$ | async as cfg">
      <div class="modal-backdrop" (click)="svc.cancel()">
        <div class="modal-box" (click)="$event.stopPropagation()" id="confirm-dialog">
          <h3 id="confirm-title">{{ cfg.title }}</h3>
          <p id="confirm-body">{{ cfg.message }}</p>
          <div class="modal-actions">
            <button id="confirm-cancel-btn" class="btn btn-secondary" (click)="svc.cancel()">
              {{ cfg.cancelLabel || 'Cancel' }}
            </button>
            <button id="confirm-ok-btn" class="btn"
                    [class.btn-danger]="cfg.danger"
                    [class.btn-primary]="!cfg.danger"
                    (click)="svc.confirm()">
              {{ cfg.confirmLabel || 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    </ng-container>
  `
})
export class ConfirmDialogComponent {
    svc = inject(ConfirmService);
}
