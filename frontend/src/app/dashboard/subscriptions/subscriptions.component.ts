import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseService } from '../../services/expense.service';
import { Subscription, User } from '../../services/models';
import { Observable } from 'rxjs';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { FormsModule } from '@angular/forms';

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
  imports: [CommonModule, SidebarComponent, FormsModule],
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
            <button class="primary-btn add-btn" (click)="toggleModal()">
              <i class="ph ph-plus"></i> <span class="btn-label">Add Subscription</span>
            </button>
            <div class="fallback-header-avatar">
              <i class="ph ph-user"></i>
            </div>
          </div>
        </header>

        <div class="dashboard-body">
          <div class="sub-grid" *ngIf="data.subscriptions?.length; else emptyState">
            <div class="card sub-card" *ngFor="let s of data.subscriptions" [style.border-left]="'4px solid ' + s.color">
              <div class="sub-top">
                <div class="sub-icon" [style.background-color]="s.color + '15'" [style.color]="s.color">
                  <i class="ph-bold" [ngClass]="s.icon || 'ph-ticket'"></i>
                </div>
                <button class="delete-btn" (click)="deleteSub(s.id)">
                  <i class="ph ph-trash"></i>
                </button>
              </div>
              <h4>{{ s.name }}</h4>
              <div class="sub-amount">₹{{ s.amount | number:'1.0-0' }}<span>/mo</span></div>
              <span class="sub-date">{{ s.date || 'Active' }}</span>
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

    <!-- Add Subscription Modal -->
    <div class="modal-overlay" *ngIf="showModal" (click)="toggleModal()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <header class="modal-header">
           <h3>Add Subscription</h3>
           <button class="close-btn" (click)="toggleModal()"><i class="ph ph-x"></i></button>
        </header>

        <div class="quick-add">
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

        <hr style="border: none; border-top: 1px solid var(--border-light); margin: 20px 0;">
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
            Save Subscription
          </button>
        </div>
      </div>
    </div>
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

    @media (max-width: 900px) {
      .menu-trigger { display: flex; }
      .total-badge.hide-mobile { display: none; }
    }

    @media (max-width: 768px) {
      .quick-grid { grid-template-columns: repeat(3, 1fr); }
    }

    @media (max-width: 480px) {
      .quick-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class SubscriptionsComponent implements OnInit {
  user$!: Observable<User | null>;
  subscriptions$!: Observable<Subscription[]>;
  isMobileMenuOpen = false;
  showModal = false;
  saveError = '';
  popularServices = POPULAR_SERVICES;
  newSub = { name: '', amount: 0 as number, icon: 'ph-ticket', color: '#3B82F6', date: 'Active' };

  constructor(private expenseService: ExpenseService) { }

  ngOnInit() {
    this.user$ = this.expenseService.getUser();
    this.subscriptions$ = this.expenseService.getSubscriptions();
  }

  getTotalMonthly(subs: Subscription[]): number {
    return subs.reduce((sum, s) => sum + s.amount, 0);
  }

  toggleModal() {
    this.showModal = !this.showModal;
    this.saveError = '';
  }

  quickAdd(svc: { name: string; icon: string; color: string }) {
    this.newSub.name = svc.name;
    this.newSub.icon = svc.icon;
    this.newSub.color = svc.color;
    this.saveError = '';
  }

  saveSub() {
    const amount = +this.newSub.amount;
    if (!this.newSub.name.trim()) {
      this.saveError = 'Please enter a service name.';
      return;
    }
    if (!(amount > 0)) {
      this.saveError = 'Please enter a valid monthly amount (greater than 0).';
      return;
    }
    this.saveError = '';
    this.expenseService.addSubscription({ ...this.newSub, amount }).subscribe({
      next: () => {
        this.toggleModal();
        this.newSub = { name: '', amount: 0, icon: 'ph-ticket', color: '#3B82F6', date: 'Active' };
      },
      error: (err) => {
        console.error('Subscription save error:', err);
        this.saveError = err?.error?.message || 'Failed to save. Check your connection and try again.';
      }
    });
  }

  deleteSub(id: number) {
    if (confirm('Delete this subscription?')) {
      this.expenseService.deleteSubscription(id);
    }
  }
}
