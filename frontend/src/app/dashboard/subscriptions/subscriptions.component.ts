import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseService } from '../../services/expense.service';
import { Subscription, User, Bank } from '../../services/models';
import { Observable } from 'rxjs';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { FormsModule } from '@angular/forms';
import { DeleteConfirmModalComponent } from '../../shared/delete-confirm-modal/delete-confirm-modal.component';

const POPULAR_SERVICES = [
  { name: 'Netflix', icon: 'ph-play', color: '#E50914' },
  { name: 'Spotify', icon: 'ph-spotify-logo', color: '#1DB954' },
  { name: 'YouTube Premium', icon: 'ph-youtube-logo', color: '#FF0000' },
  { name: 'Amazon Prime', icon: 'ph-amazon-logo', color: '#FF9900' },
  { name: 'Disney+ Hotstar', icon: 'ph-star', color: '#113CCF' },
  { name: 'iCloud', icon: 'ph-cloud', color: '#3693F5' },
  { name: 'Gym', icon: 'ph-barbell', color: '#8B5CF6' },
  { name: 'Internet', icon: 'ph-wifi-high', color: '#06B6D4' },
];

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule, DeleteConfirmModalComponent],
  template: `
    <main class="dashboard-layout" *ngIf="{
      user: user$ | async,
      subscriptions: subscriptions$ | async
    } as data">
      <app-sidebar [isMobileOpen]="isMobileMenuOpen" (closeMobile)="isMobileMenuOpen = false"></app-sidebar>

      <div class="main-content">
        <header class="top-header">
          <div class="header-left">
            <button class="menu-trigger" (click)="isMobileMenuOpen = !isMobileMenuOpen">
                  <i class="ph ph-list"></i>
            </button>
            <h1>Subscriptions</h1>
            <p>Manage your recurring bills and services</p>
          </div>

          <div class="header-right">
            <div class="total-badge hide-mobile" *ngIf="data.subscriptions?.length">
              <span>Monthly Total</span>
              <strong>₹{{ getTotalMonthly(data.subscriptions!) | number:'1.0-0' }}</strong>
            </div>
            <button class="primary-btn add-btn" (click)="openNewModal()">
              <i class="ph ph-plus"></i> <span class="btn-label">Add Subscription</span>
            </button>
            <div class="fallback-header-avatar" *ngIf="!data.user?.avatar">
              <i class="ph ph-user"></i>
            </div>
            <img *ngIf="data.user?.avatar" [src]="data.user?.avatar" alt="Avatar" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-light);">
          </div>
        </header>

        <div class="dashboard-body">
          <div class="sub-grid" *ngIf="data.subscriptions?.length; else emptyState">
            <div class="card sub-card" *ngFor="let s of data.subscriptions" [style.border-left]="'4px solid ' + s.color">
              <div class="sub-top">
                <div class="sub-icon" [style.background-color]="s.color + '15'" [style.color]="s.color">
                  <i class="ph-bold" [ngClass]="s.icon || 'ph-ticket'"></i>
                </div>
                <div class="sub-actions">
                  <button class="edit-btn" (click)="editSub(s)" title="Edit">
                    <i class="ph ph-pencil"></i>
                  </button>
                  <button class="delete-btn" (click)="deleteSub(s)">
                    <i class="ph ph-trash"></i>
                  </button>
                </div>
              </div>
              <h4>{{ s.name }}</h4>
              <div class="sub-amount">₹{{ s.amount | number:'1.0-0' }}<span>/mo</span></div>
              <span class="sub-date">Deducts on: <strong>{{ s.date || 'Not set' }}</strong></span>
              <span class="sub-date">Bank: <strong>{{ s.bankName || 'N/A' }}</strong></span>
            </div>
          </div>

          <ng-template #emptyState>
            <div class="empty-state">
              <i class="ph ph-ticket"></i>
              <p>No active subscriptions. Add your first service!</p>
            </div>
          </ng-template>
        </div>
      </div>
    </main>

    <!-- Add/Edit Subscription Modal -->
    <div class="modal-overlay" *ngIf="showModal" (click)="toggleModal()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <header class="modal-header">
           <h3>{{ isEditMode ? 'Edit Subscription' : 'Add Subscription' }}</h3>
           <button class="close-btn" (click)="toggleModal()"><i class="ph ph-x"></i></button>
        </header>

        <div class="quick-add" *ngIf="!isEditMode">
          <p class="section-label">Quick Add Popular Services</p>
          <div class="quick-grid">
            <div class="quick-item"
                 *ngFor="let svc of popularServices"
                 (click)="quickAdd(svc)"
                 [class.selected-service]="newSub.name === svc.name">
              <div class="quick-icon" [style.background]="svc.color + '15'" [style.color]="svc.color">
                <i class="ph" [ngClass]="svc.icon"></i>
              </div>
              <span>{{ svc.name }}</span>
            </div>
          </div>
        </div>

        <hr *ngIf="!isEditMode" style="border: none; border-top: 1px solid var(--border-light); margin: 20px 0;">
        <p class="section-label">Subscription Details</p>

        <div class="form-group">
          <label>Service Name *</label>
          <input type="text" [(ngModel)]="newSub.name" placeholder="e.g. Netflix, Spotify...">
        </div>
        <div class="form-group">
          <label>Monthly Amount (₹) *</label>
          <input type="number" [(ngModel)]="newSub.amount" placeholder="Enter monthly amount" min="1">
        </div>
        <div class="form-group">
          <label>Billing Date (Day of Month) *</label>
          <input type="number" [(ngModel)]="newSub.date" placeholder="e.g. 1, 15, 30..." min="1" max="31">
          <p class="hint">Day of month when amount will be deducted</p>
        </div>
        <div class="form-group">
          <label>Bank Account *</label>
          <select [(ngModel)]="newSub.bankName">
            <option value="" disabled *ngIf="currentBanks.length === 0">No bank accounts available</option>
            <option *ngFor="let bank of currentBanks" [value]="bank.name">{{ bank.name }}</option>
          </select>
          <p class="hint" *ngIf="currentBanks.length === 0">Please add a bank account first.</p>
        </div>
        <div class="form-group">
          <label>Accent Color</label>
          <div style="display:flex; align-items:center; gap: 12px;">
            <input type="color" [(ngModel)]="newSub.color" style="height: 40px; width: 60px; padding: 2px; border-radius: 8px; border: 1px solid var(--border-light); cursor:pointer;">
            <span style="font-size: 13px; color: var(--text-muted);">{{ newSub.color }}</span>
          </div>
        </div>

        <div *ngIf="saveError" style="color: var(--danger-red); font-size: 13px; margin-bottom: 12px; display: flex; align-items:center; gap: 6px;">
          <i class="ph ph-warning-circle"></i> {{ saveError }}
        </div>

        <div style="display:flex; gap: 12px; margin-top:8px;">
          <button class="outline-btn" style="flex: 1;" (click)="toggleModal()">Cancel</button>
          <button class="primary-btn" style="flex: 2; justify-content: center;" (click)="saveSub()">
            {{ isEditMode ? 'Update Subscription' : 'Save Subscription' }}
          </button>
        </div>
      </div>
    </div>

    <app-delete-confirm-modal
      [visible]="showDeleteConfirm"
      [title]="'Delete Subscription?'"
      [message]="'You are about to delete ' + (subToDelete?.name || 'this subscription') + '. This action cannot be undone.'"
      [confirmText]="'Delete'"
      (closed)="cancelDelete()"
      (confirmed)="confirmDelete()">
    </app-delete-confirm-modal>
  `,
  styles: [`
    .total-badge {
      background: var(--primary-blue-light);
      color: var(--primary-blue);
      padding: 8px 16px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .total-badge span { font-size: 10px; font-weight: 600; text-transform: uppercase; }
    .total-badge strong { font-size: 16px; }

    .sub-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
    .sub-card { padding: 24px; display: flex; flex-direction: column; gap: 12px; border-left-width: 4px; transition: all var(--transition-fast); }
    .sub-card:hover { transform: translateY(-2px); }
    .sub-top { display: flex; justify-content: space-between; align-items: center; }
    .sub-icon { width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
    .sub-card h4 { font-size: 16px; }
    .sub-amount { font-size: 24px; font-weight: 800; color: var(--text-dark); }
    .sub-amount span { font-size: 13px; font-weight: 500; color: var(--text-muted); margin-left: 2px; }
    .sub-date { font-size: 12px; color: var(--text-muted); }

    .sub-actions { display: flex; gap: 8px; align-items: center; }
    .edit-btn, .delete-btn { background: none; border: none; color: var(--text-muted); font-size: 18px; cursor: pointer; padding: 4px; border-radius: 6px; transition: all var(--transition-fast); }
    .edit-btn:hover { background: var(--bg-hover); color: var(--primary-blue); }
    .delete-btn:hover { background: var(--bg-hover); color: var(--danger-red); }

    .quick-add { margin-bottom: 8px; }
    .section-label { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
    .quick-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .quick-item {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      padding: 12px 4px; border-radius: 12px; cursor: pointer;
      transition: all var(--transition-fast); border: 1px solid var(--border-light);
      font-size: 11px; font-weight: 600; text-align: center; color: var(--text-dark);
    }
    .quick-item:hover { background: var(--bg-hover); border-color: var(--primary-blue); }
    .quick-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
    .selected-service { background: var(--primary-blue-light) !important; border-color: var(--primary-blue) !important; color: var(--primary-blue) !important; }

    .menu-trigger {
      background: none; border: none; color: var(--text-main);
      font-size: 24px; cursor: pointer; padding: 4px;
      display: none; align-items: center; justify-content: center; flex-shrink: 0;
    }

    .hint { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

    @media (max-width: 900px) {
      .menu-trigger { display: flex; }
      .total-badge.hide-mobile { display: none; }
    }

    @media (max-width: 768px) {
      .quick-grid { grid-template-columns: repeat(3, 1fr); }

      .sub-top {
        align-items: flex-start;
      }

      .sub-actions {
        flex-shrink: 0;
      }

      .sub-card h4 {
        word-break: break-word;
      }
    }

    @media (max-width: 480px) {
      .quick-grid { grid-template-columns: repeat(2, 1fr); }

      .sub-top {
        flex-wrap: wrap;
        gap: 8px;
      }

      .sub-amount {
        width: 100%;
        font-size: 22px;
      }
    }

  `]
})
export class SubscriptionsComponent implements OnInit {
  user$!: Observable<User | null>;
  subscriptions$!: Observable<Subscription[]>;
  banks$!: Observable<Bank[]>;
  isMobileMenuOpen = false;
  showModal = false;
  isEditMode = false;
  editingSubId: number | null = null;
  showDeleteConfirm = false;
  subToDelete: Subscription | null = null;
  saveError = '';
  popularServices = POPULAR_SERVICES;
  currentBanks: Bank[] = [];
  newSub = { name: '', amount: 0 as number, icon: 'ph-ticket', color: '#3B82F6', date: '', bankName: '' };

  constructor(private expenseService: ExpenseService) { }

  ngOnInit() {
    this.user$ = this.expenseService.getUser();
    this.subscriptions$ = this.expenseService.getSubscriptions();
    this.banks$ = this.expenseService.getBanks();

    this.banks$.subscribe((banks) => {
      this.currentBanks = banks || [];
      if (this.currentBanks.length > 0 && !this.newSub.bankName) {
        this.newSub.bankName = this.currentBanks[0].name;
      }
    });
  }

  getTotalMonthly(subs: Subscription[]): number {
    return subs.reduce((sum, s) => sum + s.amount, 0);
  }

  toggleModal() {
    this.showModal = !this.showModal;
    this.saveError = '';
    if (!this.showModal) {
      this.resetForm();
    }
  }

  openNewModal() {
    this.isEditMode = false;
    this.editingSubId = null;
    this.resetForm();
    this.showModal = true;
  }

  resetForm() {
    this.newSub = {
      name: '',
      amount: 0,
      icon: 'ph-ticket',
      color: '#3B82F6',
      date: '',
      bankName: this.currentBanks[0]?.name || ''
    };
    this.saveError = '';
  }

  quickAdd(svc: { name: string; icon: string; color: string }) {
    this.newSub.name = svc.name;
    this.newSub.icon = svc.icon;
    this.newSub.color = svc.color;
    this.saveError = '';
  }

  editSub(sub: Subscription) {
    this.isEditMode = true;
    this.editingSubId = sub.id;
    this.newSub = { 
      name: sub.name, 
      amount: sub.amount, 
      icon: sub.icon || 'ph-ticket', 
      color: sub.color, 
      date: sub.date || '',
      bankName: sub.bankName || this.currentBanks[0]?.name || ''
    };
    this.saveError = '';
    this.showModal = true;
  }

  saveSub() {
    const amount = +this.newSub.amount;
    const dateStr = String(this.newSub.date).trim();
    
    if (!this.newSub.name.trim()) {
      this.saveError = 'Please enter a service name.';
      return;
    }
    if (!(amount > 0)) {
      this.saveError = 'Please enter a valid monthly amount (greater than 0).';
      return;
    }
    if (!dateStr) {
      this.saveError = 'Please enter a billing date (day of month).';
      return;
    }

    const selectedBankName = String(this.newSub.bankName || '').trim();
    if (!selectedBankName) {
      this.saveError = 'Please select a bank account.';
      return;
    }
    
    const dateNum = parseInt(dateStr, 10);
    if (isNaN(dateNum) || dateNum < 1 || dateNum > 31) {
      this.saveError = 'Billing date must be between 1 and 31.';
      return;
    }
    
    this.saveError = '';
    
    const payload = {
      name: this.newSub.name,
      amount: amount,
      date: dateStr,
      bankName: selectedBankName,
      icon: this.newSub.icon,
      color: this.newSub.color
    };
    
    if (this.isEditMode && this.editingSubId) {
      this.expenseService.editSubscription(this.editingSubId, payload).subscribe({
        next: () => {
          this.toggleModal();
          this.resetForm();
        },
        error: (err) => {
          console.error('Subscription update error:', err);
          const errorMsg = err?.error?.details || err?.error?.message || err?.message || 'Failed to update. Check your connection and try again.';
          this.saveError = errorMsg;
        }
      });
    } else {
      this.expenseService.addSubscription(payload).subscribe({
        next: () => {
          this.toggleModal();
          this.resetForm();
        },
        error: (err) => {
          console.error('Subscription save error:', err);
          const errorMsg = err?.error?.details || err?.error?.message || err?.message || 'Failed to save. Check your connection and try again.';
          this.saveError = errorMsg;
        }
      });
    }
  }

  deleteSub(sub: Subscription) {
    this.subToDelete = sub;
    this.showDeleteConfirm = true;
  }

  confirmDelete() {
    if (this.subToDelete) {
      this.expenseService.deleteSubscription(this.subToDelete.id);
    }
    this.cancelDelete();
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
    this.subToDelete = null;
  }
}
