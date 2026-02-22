import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseService } from '../../services/expense.service';
import { Investment, DashboardStats, User } from '../../services/models';
import { Observable } from 'rxjs';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { FormsModule } from '@angular/forms';

const INVESTMENT_TYPES = [
  { value: 'Mutual Fund', icon: 'ph-chart-pie', color: '#8B5CF6', bg: '#F3E8FF' },
  { value: 'Stock', icon: 'ph-trend-up', color: '#10B981', bg: '#ECFDF5' },
  { value: 'Gold', icon: 'ph-currency-dollar', color: '#F59E0B', bg: '#FFF7ED' },
  { value: 'Fixed Deposit', icon: 'ph-bank', color: '#3B82F6', bg: '#EFF6FF' },
  { value: 'Crypto', icon: 'ph-currency-btc', color: '#F97316', bg: '#FFF7ED' },
  { value: 'Real Estate', icon: 'ph-house', color: '#EF4444', bg: '#FEF2F2' },
  { value: 'PPF', icon: 'ph-shield-check', color: '#06B6D4', bg: '#ECFEFF' },
  { value: 'Other', icon: 'ph-dots-three-circle', color: '#64748B', bg: '#F8FAFC' },
];

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  template: `
    <main class="dashboard-layout" *ngIf="{
      user: user$ | async,
      stats: stats$ | async,
      investments: investments$ | async
    } as data">
      <app-sidebar></app-sidebar>

      <div class="main-content">
        <header class="top-header">
          <div class="header-left">
            <h1>Investments</h1>
            <p>Grow your wealth with smart tracking</p>
          </div>
          <div class="header-right">
            <button class="primary-btn" (click)="showModal = true">
              <i class="ph ph-plus"></i> Add Investment
            </button>
            <div class="fallback-header-avatar">
              <i class="ph ph-user"></i>
            </div>
          </div>
        </header>

        <div class="dashboard-body" *ngIf="data.stats">
          <!-- Summary Cards -->
          <div class="stats-grid">
            <div class="card stat-card purple-card">
              <span class="card-label">Total Portfolio</span>
              <h3>₹{{ data.stats.totalInvestment | number:'1.2-2' }}</h3>
              <p class="card-sub">Across all investments</p>
            </div>
            <div class="card stat-card green-card">
              <span class="card-label">Bank Balance</span>
              <h3>₹{{ data.stats.balance | number:'1.2-2' }}</h3>
              <p class="card-sub">Available cash</p>
            </div>
            <div class="card stat-card blue-card">
              <span class="card-label">Net Worth</span>
              <h3>₹{{ (data.stats.balance + data.stats.totalInvestment) | number:'1.2-2' }}</h3>
              <p class="card-sub">Balance + Portfolio</p>
            </div>
          </div>

          <!-- Investment List -->
          <div class="card investments-table">
            <div class="flex-between" style="margin-bottom: 24px;">
              <h3>Portfolio Breakdown</h3>
            </div>
            <div *ngIf="data.investments && data.investments.length > 0">
              <div class="investment-row" *ngFor="let inv of data.investments">
                <div class="inv-type-icon" [style.background]="getColor(inv.type).bg" [style.color]="getColor(inv.type).color">
                  <i class="ph" [ngClass]="getColor(inv.type).icon"></i>
                </div>
                <div class="inv-details">
                  <h4>{{ inv.name }}</h4>
                  <span class="type-badge" [style.background]="getColor(inv.type).bg" [style.color]="getColor(inv.type).color">{{ inv.type }}</span>
                </div>
                <div class="inv-return" *ngIf="inv.returnPct">
                  <span class="return-badge">{{ inv.returnPct }}% p.a.</span>
                </div>
                <div class="inv-amount">₹{{ inv.amount | number:'1.2-2' }}</div>
                <button class="delete-btn" (click)="deleteInvestment(inv.id)">
                  <i class="ph ph-trash"></i>
                </button>
              </div>
            </div>
            <div class="empty-state" *ngIf="!data.investments || data.investments.length === 0">
              <i class="ph ph-chart-pie"></i>
              <p>No investments yet. Add your first investment!</p>
            </div>
          </div>

          <!-- Category Breakdown -->
          <div class="card" style="padding: 32px; margin-top: 24px;" *ngIf="data.investments && data.investments.length > 0">
            <h3 style="margin-bottom: 24px;">By Category</h3>
            <div class="category-breakdown">
              <div class="category-row" *ngFor="let type of getUniqueTypes(data.investments)">
                <div class="cat-info">
                  <div class="cat-dot" [style.background]="getColor(type).color"></div>
                  <span>{{ type }}</span>
                </div>
                <div class="cat-bar-wrapper">
                  <div class="cat-bar" [style.width]="getCategoryPercent(data.investments, type, data.stats.totalInvestment) + '%'"
                    [style.background]="getColor(type).color"></div>
                </div>
                <span class="cat-pct">{{ getCategoryPercent(data.investments, type, data.stats.totalInvestment) | number:'1.0-1' }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Add Investment Modal -->
    <div class="modal-overlay" *ngIf="showModal" (click)="showModal = false">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Add Investment</h3>
          <button class="close-btn" (click)="showModal = false"><i class="ph ph-x"></i></button>
        </div>

        <div class="investment-types-grid">
          <div class="type-option" *ngFor="let t of investmentTypes"
            [class.selected]="newInvestment.type === t.value"
            (click)="newInvestment.type = t.value">
            <div class="type-icon" [style.background]="t.bg" [style.color]="t.color">
              <i class="ph" [ngClass]="t.icon"></i>
            </div>
            <span>{{ t.value }}</span>
          </div>
        </div>

        <div class="form-group">
          <label>Name / Description</label>
          <input type="text" [(ngModel)]="newInvestment.name" placeholder="e.g. Nifty 50 Index Fund, HDFC Flexi Cap">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Amount (₹)</label>
            <input type="number" [(ngModel)]="newInvestment.amount" placeholder="0">
          </div>
          <div class="form-group">
            <label>Returns % (optional)</label>
            <input type="number" [(ngModel)]="newInvestment.returnPct" placeholder="e.g. 12.5">
          </div>
        </div>
        <button class="primary-btn" style="width: 100%; margin-top: 8px;" (click)="saveInvestment()"
          [disabled]="!newInvestment.name || !newInvestment.amount || newInvestment.amount <= 0">
          Save Investment
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-layout { display: flex; min-height: 100vh; }
    .main-content { flex: 1; margin-left: var(--sidebar-width); }
    .top-header { height: 100px; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; background: var(--bg-main); position: sticky; top: 0; z-index: 10; }
    .header-left h1 { font-size: 24px; margin-bottom: 4px; }
    .header-right { display: flex; align-items: center; gap: 16px; }
    .fallback-header-avatar { width: 44px; height: 44px; border-radius: 50%; background: #F1F5F9; color: #64748B; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .primary-btn { padding: 12px 20px; background: var(--text-dark); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; }
    .dashboard-body { padding: 40px; }

    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 32px; }
    .stat-card { padding: 32px; border-radius: 20px; color: white; }
    .card-label { font-size: 13px; opacity: 0.8; font-weight: 500; }
    .stat-card h3 { font-size: 28px; font-weight: 800; margin: 12px 0 4px; }
    .card-sub { font-size: 12px; opacity: 0.7; }
    .purple-card { background: linear-gradient(135deg, #9333ea, #7e22ce); }
    .green-card { background: linear-gradient(135deg, #10b981, #059669); }
    .blue-card { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }

    .investments-table { padding: 32px; }
    .investment-row { display: flex; align-items: center; gap: 16px; padding: 16px 0; border-bottom: 1px solid var(--border-light); }
    .inv-type-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
    .inv-details { flex: 1; }
    .inv-details h4 { font-size: 15px; margin-bottom: 4px; }
    .type-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
    .return-badge { background: #ECFDF5; color: #10B981; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 20px; }
    .inv-amount { font-size: 16px; font-weight: 700; margin-right: 8px; }
    .delete-btn { border: none; background: none; color: var(--text-muted); cursor: pointer; font-size: 18px; transition: color 0.2s; }
    .delete-btn:hover { color: var(--danger-red); }

    .empty-state { text-align: center; padding: 60px; color: var(--text-muted); }
    .empty-state i { font-size: 48px; opacity: 0.3; display: block; margin-bottom: 12px; }

    .category-breakdown { display: flex; flex-direction: column; gap: 20px; }
    .category-row { display: flex; align-items: center; gap: 16px; }
    .cat-info { display: flex; align-items: center; gap: 10px; width: 140px; font-weight: 500; font-size: 14px; }
    .cat-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .cat-bar-wrapper { flex: 1; height: 8px; background: #F1F5F9; border-radius: 4px; overflow: hidden; }
    .cat-bar { height: 100%; border-radius: 4px; transition: width 0.4s ease; }
    .cat-pct { font-size: 13px; font-weight: 600; width: 50px; text-align: right; color: var(--text-muted); }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal-card { background: white; border-radius: 24px; padding: 32px; width: 480px; max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .close-btn { border: none; background: none; font-size: 24px; cursor: pointer; color: var(--text-muted); }

    .investment-types-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .type-option { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 8px; border-radius: 16px; border: 2px solid var(--border-light); cursor: pointer; transition: all 0.2s; font-size: 11px; font-weight: 600; text-align: center; }
    .type-option:hover { border-color: var(--primary-blue); }
    .type-option.selected { border-color: var(--primary-blue); background: var(--primary-blue-light); }
    .type-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; }

    .form-group { margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px; }
    .form-group label { font-size: 13px; font-weight: 600; color: var(--text-muted); }
    .form-group input { padding: 12px; border: 1px solid var(--border-light); border-radius: 12px; outline: none; font-size: 14px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  `]
})
export class InvestmentsComponent implements OnInit {
  user$!: Observable<User | null>;
  stats$!: Observable<DashboardStats>;
  investments$!: Observable<Investment[]>;
  showModal = false;
  investmentTypes = INVESTMENT_TYPES;
  newInvestment = { type: 'Mutual Fund', name: '', amount: 0, returnPct: undefined as number | undefined };

  constructor(private expenseService: ExpenseService) { }

  ngOnInit() {
    this.user$ = this.expenseService.getUser();
    this.stats$ = this.expenseService.getStats();
    this.investments$ = this.expenseService.getInvestments();
  }

  getColor(type: string) {
    return INVESTMENT_TYPES.find(t => t.value === type) || INVESTMENT_TYPES[INVESTMENT_TYPES.length - 1];
  }

  getUniqueTypes(investments: Investment[]): string[] {
    return [...new Set(investments.map(i => i.type))];
  }

  getCategoryPercent(investments: Investment[], type: string, total: number): number {
    if (!total) return 0;
    const sum = investments.filter(i => i.type === type).reduce((acc, i) => acc + i.amount, 0);
    return (sum / total) * 100;
  }

  saveInvestment() {
    if (this.newInvestment.name && this.newInvestment.amount > 0) {
      this.expenseService.addInvestment({ ...this.newInvestment });
      this.showModal = false;
      this.newInvestment = { type: 'Mutual Fund', name: '', amount: 0, returnPct: undefined };
    }
  }

  deleteInvestment(id: number) {
    if (confirm('Delete this investment?')) {
      this.expenseService.deleteInvestment(id);
    }
  }
}
