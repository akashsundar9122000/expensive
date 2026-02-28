import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-delete-confirm-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay delete-confirm-overlay" *ngIf="visible" (click)="closed.emit()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="close-btn" (click)="closed.emit()"><i class="ph ph-x"></i></button>
        </div>

        <p style="color: var(--text-muted); margin-bottom: 18px;">
          {{ message }}
        </p>

        <div class="form-group" *ngIf="requirePassword">
          <label>Enter password</label>
          <input
            type="password"
            [ngModel]="password"
            (ngModelChange)="passwordChange.emit($event)"
            [placeholder]="passwordPlaceholder"
          >
        </div>

        <p *ngIf="errorMessage" style="color: #ef4444; font-size: 12px; margin-top: -6px; margin-bottom: 12px;">
          {{ errorMessage }}
        </p>

        <div class="confirm-actions-row">
          <button class="outline-btn action-btn" (click)="closed.emit()">{{ cancelText }}</button>
          <button
            class="primary-btn action-btn delete-action-btn"
            (click)="confirmed.emit(password)"
            [disabled]="isProcessing || (requirePassword && !password.trim())"
          >
            {{ isProcessing ? processingText : confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .delete-confirm-overlay {
      z-index: 4000;
    }

    .confirm-actions-row {
      display: flex;
      gap: 12px;
    }

    .action-btn {
      flex: 1;
      justify-content: center;
      min-height: 42px;
    }

    .delete-action-btn {
      background: #ef4444;
    }

    @media (max-width: 420px) {
      .confirm-actions-row {
        flex-direction: column;
      }
    }
  `]
})
export class DeleteConfirmModalComponent {
  @Input() visible = false;
  @Input() title = 'Confirm Delete';
  @Input() message = 'Are you sure?';
  @Input() confirmText = 'Delete';
  @Input() cancelText = 'Cancel';
  @Input() processingText = 'Deleting...';
  @Input() requirePassword = false;
  @Input() password = '';
  @Input() passwordPlaceholder = 'Your account password';
  @Input() isProcessing = false;
  @Input() errorMessage = '';

  @Output() closed = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<string>();
  @Output() passwordChange = new EventEmitter<string>();
}
