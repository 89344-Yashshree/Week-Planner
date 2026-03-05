import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmService } from '../services/confirm.service';

/** Global confirmation dialog — place once in AppComponent template. */
@Component({
    selector: 'app-confirm-dialog',
    standalone: true,
    imports: [CommonModule],
    template: `
    @if (svc.config()) {
      <div class="confirm-overlay" (click)="svc.cancel()">
        <div class="confirm-box" (click)="$event.stopPropagation()">
          <h3 class="confirm-title">{{ svc.config()!.title }}</h3>
          <p class="confirm-message">{{ svc.config()!.message }}</p>
          <div class="confirm-actions">
            <button class="btn btn-secondary" (click)="svc.cancel()">
              {{ svc.config()!.cancelLabel || 'Cancel' }}
            </button>
            <button class="btn"
                    [class.btn-danger]="svc.config()!.danger"
                    [class.btn-primary]="!svc.config()!.danger"
                    (click)="svc.confirm()">
              {{ svc.config()!.confirmLabel || 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
    styles: [`
    .confirm-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.15s ease;
    }
    .confirm-box {
      background: #1e1e2e;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 16px;
      padding: 2rem;
      width: 100%; max-width: 420px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.5);
      animation: slideUp 0.2s ease;
    }
    .confirm-title {
      font-size: 1.2rem; font-weight: 700;
      color: #f4f4f5; margin: 0 0 0.5rem;
    }
    .confirm-message {
      color: #a1a1aa; font-size: 0.95rem;
      margin: 0 0 1.5rem; line-height: 1.5;
    }
    .confirm-actions {
      display: flex; gap: 0.75rem; justify-content: flex-end;
    }
    @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
    @keyframes slideUp { from { transform: translateY(20px); opacity:0 } to { transform: translateY(0); opacity:1 } }
  `]
})
export class ConfirmDialogComponent {
    svc = inject(ConfirmService);
}
