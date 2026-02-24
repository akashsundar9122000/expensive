import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseService } from '../../services/expense.service';
import { Investment, DashboardStats, User } from '../../services/models';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { FormsModule } from '@angular/forms';

const INVESTMENT_TYPES = [
  { value: 'Mutual Fund', icon: 'ph-chart-pie', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  { value: 'Stock', icon: 'ph-trend-up', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  { value: 'Gold', icon: 'ph-currency-dollar', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  { value: 'Fixed Deposit', icon: 'ph-bank', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  { value: 'Crypto', icon: 'ph-currency-btc', color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
  { value: 'Real Estate', icon: 'ph-house', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  { value: 'PPF', icon: 'ph-shield-check', color: '#06B6D4', bg: 'rgba(6,182,212,0.1)' },
  { value: 'Other', icon: 'ph-dots-three-circle', color: '#64748B', bg: 'rgba(100,116,139,0.1)' },
];

type SortOption = 'amount-desc' | 'amount-asc' | 'name-asc' | 'return-desc';

interface InvestmentInsight {
  total: number;
  projectedValue: number;
  estimatedAnnualReturn: number;
  avgReturn: number;
  topType: string;
  topTypeShare: number;
}

interface InvestmentForm {
  type: string;
  name: string;
  amount: number | null;
  returnPct: number | null;
}

const DEFAULT_NEW_INVESTMENT: InvestmentForm = {
  type: 'Mutual Fund',
  name: '',
  amount: null,
  returnPct: null
};

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  template: `
    <main class="dashboard-layout" *ngIf="{
      user: user$ | async,
      stats: stats$ | async,
      allInvestments: investments$ | async,
      investments: filteredInvestments$ | async,
      investmentTypes: investmentTypeOptions$ | async,
      insights: insights$ | async
    } as data">
      <app-sidebar [isMobileOpen]="isMobileMenuOpen" (closeMobile)="isMobileMenuOpen = false"></app-sidebar>

      <div class="main-content">
        <header class="top-header">
          <div class="header-left">
            <button class="menu-trigger" (click)="isMobileMenuOpen = !isMobileMenuOpen">
                  <i class="ph ph-list"></i>
            </button>
            <h1>Investments</h1>
            <p>Grow your wealth with smart tracking</p>
          </div>
          <div class="header-right">
            <button class="primary-btn add-btn" (click)="openAddModal()">
              <i class="ph ph-plus"></i> <span class="btn-label">Add Investment</span>
            </button>
            <div class="fallback-header-avatar" *ngIf="!data.user?.avatar">
              <i class="ph ph-user"></i>
            </div>
            <img *ngIf="data.user?.avatar" [src]="data.user?.avatar" alt="Avatar" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-light);">
          </div>
        </header>

        <div class="dashboard-body" *ngIf="data.stats">
          <!-- Summary Cards -->
          <div class="stats-grid">
            <div class="stat-card purple-card">
              <span class="card-label">Total Portfolio</span>
              <h3>₹{{ (data.insights?.total ?? data.stats.totalInvestment) | number:'1.2-2' }}</h3>
              <p class="card-sub">Across all investments</p>
            </div>
            <div class="stat-card green-card">
              <span class="card-label">Est. Annual Return</span>
              <h3>₹{{ (data.insights?.estimatedAnnualReturn ?? 0) | number:'1.2-2' }}</h3>
              <p class="card-sub">Avg {{ (data.insights?.avgReturn ?? 0) | number:'1.1-1' }}%</p>
            </div>
            <div class="stat-card blue-card">
              <span class="card-label">Projected Value (1Y)</span>
              <h3>₹{{ (data.insights?.projectedValue ?? 0) | number:'1.2-2' }}</h3>
              <p class="card-sub">Based on entered return %</p>
            </div>
          </div>

          <div class="filter-bar card" style="padding: 16px; margin-bottom: 20px;" *ngIf="data.allInvestments">
            <div class="filter-control search-control">
              <i class="ph ph-magnifying-glass"></i>
              <input
                type="text"
                placeholder="Search investment name"
                [(ngModel)]="searchTerm"
                (ngModelChange)="updateFilters()"
              >
            </div>
            <div class="filter-control">
              <label>Type</label>
              <select [(ngModel)]="selectedType" (ngModelChange)="updateFilters()">
                <option value="All">All</option>
                <option *ngFor="let type of data.investmentTypes" [value]="type">{{ type }}</option>
              </select>
            </div>
            <div class="filter-control">
              <label>Sort</label>
              <select [(ngModel)]="sortBy" (ngModelChange)="updateFilters()">
                <option value="amount-desc">Amount: High to Low</option>
                <option value="amount-asc">Amount: Low to High</option>
                <option value="name-asc">Name: A to Z</option>
                <option value="return-desc">Return %: High to Low</option>
              </select>
            </div>
          </div>

          <!-- Investment List -->
          <div class="card" style="padding: 28px;">
            <div class="flex-between" style="margin-bottom: 20px;">
              <h3>Portfolio Breakdown</h3>
              <div class="top-type" *ngIf="data.insights && data.insights.topTypeShare > 0">
                <span>Top Allocation:</span>
                <strong>{{ data.insights.topType }} ({{ data.insights.topTypeShare | number:'1.0-1' }}%)</strong>
              </div>
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
                <div class="return-badge" *ngIf="inv.returnPct !== undefined && inv.returnPct !== null">
                  {{ inv.returnPct | number:'1.1-1' }}%
                </div>
                <div class="inv-amount">₹{{ inv.amount | number:'1.2-2' }}</div>
                <button class="icon-action" (click)="openEditModal(inv)" aria-label="Edit investment">
                  <i class="ph ph-pencil-simple"></i>
                </button>
                <button class="delete-btn" (click)="deleteInvestment(inv.id)">
                  <i class="ph ph-trash"></i>
                </button>
              </div>
            </div>
            <div class="empty-state" *ngIf="data.allInvestments && data.allInvestments.length === 0">
              <i class="ph ph-chart-pie"></i>
              <p>No investments yet. Add your first investment!</p>
            </div>
            <div class="empty-state" *ngIf="data.allInvestments && data.allInvestments.length > 0 && (!data.investments || data.investments.length === 0)">
              <i class="ph ph-funnel-simple"></i>
              <p>No investments match your current filters.</p>
            </div>
          </div>

          <!-- Category Breakdown -->
          <div class="card" style="padding: 28px; margin-top: 24px;" *ngIf="data.investments && data.investments.length > 0">
            <h3 style="margin-bottom: 24px;">By Category</h3>
            <div class="category-breakdown">
              <div class="category-row" *ngFor="let type of getUniqueTypes(data.investments)">
                <div class="cat-info">
                  <div class="cat-dot" [style.background]="getColor(type).color"></div>
                  <span>{{ type }}</span>
                </div>
                <div class="cat-bar-wrapper">
                  <div class="cat-bar" [style.width]="getCategoryPercent(data.investments, type, data.insights?.total || 0) + '%'"
                    [style.background]="getColor(type).color"></div>
                </div>
                <span class="cat-pct">{{ getCategoryPercent(data.investments, type, data.insights?.total || 0) | number:'1.0-1' }}%</span>
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
          <h3>{{ editingInvestmentId ? 'Edit Investment' : 'Add Investment' }}</h3>
          <button class="close-btn" (click)="closeModal()"><i class="ph ph-x"></i></button>
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
          <input type="text" [(ngModel)]="newInvestment.name" placeholder="e.g. Nifty 50 Index Fund">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group">
            <label>Amount (₹)</label>
            <input type="number" [(ngModel)]="newInvestment.amount" placeholder="0">
          </div>
          <div class="form-group">
            <label>Returns % (optional)</label>
            <input type="number" [(ngModel)]="newInvestment.returnPct" placeholder="e.g. 12.5">
          </div>
        </div>
        <button class="primary-btn" style="width: 100%; justify-content: center; margin-top: 8px;" (click)="saveInvestment()"
          [disabled]="!canSaveInvestment() || isSaving">
          {{ isSaving ? 'Saving...' : (editingInvestmentId ? 'Update Investment' : 'Save Investment') }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 28px; }
    .stat-card { padding: 28px; border-radius: 20px; color: white; }
    .card-label { font-size: 12px; opacity: 0.85; font-weight: 500; }
    .stat-card h3 { font-size: 24px; font-weight: 800; margin: 8px 0 4px; color: white; }
    .card-sub { font-size: 11px; opacity: 0.7; }
    .purple-card { background: linear-gradient(135deg, #9333ea, #7e22ce); }
    .green-card { background: linear-gradient(135deg, #10b981, #059669); }
    .blue-card { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }

    .investment-row { display: flex; align-items: center; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--border-light); transition: background var(--transition-fast); }
    .investment-row:hover { background: var(--bg-hover); margin: 0 -12px; padding: 14px 12px; border-radius: 12px; }
    .inv-type-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
    .inv-details { flex: 1; }
    .inv-details h4 { font-size: 15px; margin-bottom: 4px; }
    .type-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
    .return-badge { background: rgba(16, 185, 129, 0.1); color: #10B981; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 20px; }
    .inv-amount { font-size: 16px; font-weight: 700; margin-right: 8px; color: var(--text-dark); }
    .icon-action { border: 1px solid var(--border-light); width: 32px; height: 32px; border-radius: 10px; background: var(--bg-main); color: var(--text-muted); cursor: pointer; }
    .icon-action:hover { background: var(--bg-hover); color: var(--text-dark); }

    .filter-bar { display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: 12px; align-items: end; }
    .filter-control { display: flex; flex-direction: column; gap: 6px; }
    .filter-control label { font-size: 11px; font-weight: 600; color: var(--text-muted); }
    .filter-control select,
    .filter-control input { width: 100%; border: 1px solid var(--border-light); background: var(--bg-main); color: var(--text-dark); border-radius: 12px; padding: 10px 12px; font-size: 13px; }
    .search-control { position: relative; }
    .search-control i { position: absolute; left: 10px; top: 12px; color: var(--text-muted); }
    .search-control input { padding-left: 34px; }
    .top-type { font-size: 12px; color: var(--text-muted); display: flex; gap: 8px; align-items: center; }
    .top-type strong { color: var(--text-dark); font-size: 12px; }

    .category-breakdown { display: flex; flex-direction: column; gap: 16px; }
    .category-row { display: flex; align-items: center; gap: 16px; }
    .cat-info { display: flex; align-items: center; gap: 10px; width: 120px; font-weight: 500; font-size: 13px; color: var(--text-dark); }
    .cat-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .cat-bar-wrapper { flex: 1; height: 8px; background: var(--bg-chip); border-radius: 4px; overflow: hidden; }
    .cat-bar { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
    .cat-pct { font-size: 13px; font-weight: 600; width: 50px; text-align: right; color: var(--text-muted); }

    .menu-trigger {
        background: none;
        border: none;
        color: var(--text-main);
        font-size: 24px;
        cursor: pointer;
        padding: 4px;
        display: none;
        align-items: center;
        justify-content: center;
    }

    @media (max-width: 900px) {
        .stats-grid {
            grid-template-columns: 1fr;
        }
    }

    @media (max-width: 768px) {
        .menu-trigger {
            display: flex;
        }
        
        .investment-types-grid {
            grid-template-columns: repeat(3, 1fr);
        }

        .btn-label {
            display: none;
        }
        
        .add-btn {
            width: 44px;
            height: 44px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
        }

        .cat-info {
            width: 80px;
        }
        
        .cat-pct {
            width: 40px;
        }

        .filter-bar {
          grid-template-columns: 1fr;
        }
    }

    @media (max-width: 480px) {
        .investment-types-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }
  `]
})
export class InvestmentsComponent implements OnInit {
  user$!: Observable<User | null>;
  stats$!: Observable<DashboardStats>;
  investments$!: Observable<Investment[]>;
  filteredInvestments$!: Observable<Investment[]>;
  investmentTypeOptions$!: Observable<string[]>;
  insights$!: Observable<InvestmentInsight>;

  isMobileMenuOpen = false;
  showModal = false;
  isSaving = false;
  editingInvestmentId: number | null = null;

  investmentTypes = INVESTMENT_TYPES;
  newInvestment: InvestmentForm = { ...DEFAULT_NEW_INVESTMENT };

  searchTerm = '';
  selectedType = 'All';
  sortBy: SortOption = 'amount-desc';

  private searchTerm$ = new BehaviorSubject<string>('');
  private selectedType$ = new BehaviorSubject<string>('All');
  private sortBy$ = new BehaviorSubject<SortOption>('amount-desc');

  constructor(private expenseService: ExpenseService) { }

  ngOnInit() {
    this.user$ = this.expenseService.getUser();
    this.stats$ = this.expenseService.getStats();
    this.investments$ = this.expenseService.getInvestments();

    this.filteredInvestments$ = combineLatest([
      this.investments$,
      this.searchTerm$,
      this.selectedType$,
      this.sortBy$
    ]).pipe(
      map(([investments, searchTerm, selectedType, sortBy]) =>
        this.applyFilters(investments, searchTerm, selectedType, sortBy)
      )
    );

    this.investmentTypeOptions$ = this.investments$.pipe(
      map((investments) => [...new Set(investments.map(i => i.type))].sort((a, b) => a.localeCompare(b)))
    );

    this.insights$ = this.filteredInvestments$.pipe(
      map((investments) => this.calculateInsights(investments))
    );
  }

  updateFilters() {
    this.searchTerm$.next(this.searchTerm || '');
    this.selectedType$.next(this.selectedType || 'All');
    this.sortBy$.next(this.sortBy || 'amount-desc');
  }

  getColor(type: string) {
    return INVESTMENT_TYPES.find(t => t.value === type) || INVESTMENT_TYPES[INVESTMENT_TYPES.length - 1];
  }

  getUniqueTypes(investments: Investment[]): string[] {
    return [...new Set(investments.map(i => i.type))].sort((a, b) => a.localeCompare(b));
  }

  getCategoryPercent(investments: Investment[], type: string, total: number): number {
    if (!total) return 0;
    const sum = investments
      .filter(i => i.type === type)
      .reduce((acc, i) => acc + Number(i.amount || 0), 0);
    return (sum / total) * 100;
  }

  canSaveInvestment(): boolean {
    const name = (this.newInvestment.name || '').trim();
    const amount = Number(this.newInvestment.amount);
    return !!this.newInvestment.type && !!name && Number.isFinite(amount) && amount > 0;
  }

  openAddModal() {
    this.editingInvestmentId = null;
    this.newInvestment = { ...DEFAULT_NEW_INVESTMENT };
    this.showModal = true;
  }

  openEditModal(investment: Investment) {
    this.editingInvestmentId = investment.id;
    this.newInvestment = {
      type: investment.type,
      name: investment.name,
      amount: Number(investment.amount || 0),
      returnPct: investment.returnPct === undefined || investment.returnPct === null ? null : Number(investment.returnPct)
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.isSaving = false;
    this.editingInvestmentId = null;
    this.newInvestment = { ...DEFAULT_NEW_INVESTMENT };
  }

  private toInvestmentPayload() {
    return {
      type: this.newInvestment.type,
      name: (this.newInvestment.name || '').trim(),
      amount: Number(this.newInvestment.amount),
      returnPct: this.newInvestment.returnPct === null || this.newInvestment.returnPct === undefined || this.newInvestment.returnPct === ('' as any)
        ? undefined
        : Number(this.newInvestment.returnPct)
    };
  }

  saveInvestment() {
    if (this.canSaveInvestment() && !this.isSaving) {
      this.isSaving = true;
      const payload = this.toInvestmentPayload();
      const request$ = this.editingInvestmentId
        ? this.expenseService.updateInvestment(this.editingInvestmentId, payload)
        : this.expenseService.addInvestment(payload);

      request$.subscribe({
        next: () => {
          this.closeModal();
        },
        error: (err) => {
          this.isSaving = false;
          console.error('Failed to save investment:', err);
        }
      });
    }
  }

  deleteInvestment(id: number) {
    if (confirm('Delete this investment?')) {
      this.expenseService.deleteInvestment(id);
    }
  }

  private applyFilters(investments: Investment[], searchTerm: string, selectedType: string, sortBy: SortOption): Investment[] {
    const lowerSearch = (searchTerm || '').trim().toLowerCase();
    let processed = [...(investments || [])];

    if (selectedType !== 'All') {
      processed = processed.filter((investment) => investment.type === selectedType);
    }

    if (lowerSearch) {
      processed = processed.filter((investment) => {
        const name = (investment.name || '').toLowerCase();
        const type = (investment.type || '').toLowerCase();
        return name.includes(lowerSearch) || type.includes(lowerSearch);
      });
    }

    switch (sortBy) {
      case 'amount-asc':
        processed.sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));
        break;
      case 'name-asc':
        processed.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'return-desc':
        processed.sort((a, b) => Number(b.returnPct || 0) - Number(a.returnPct || 0));
        break;
      case 'amount-desc':
      default:
        processed.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
        break;
    }

    return processed;
  }

  private calculateInsights(investments: Investment[]): InvestmentInsight {
    const safeInvestments = investments || [];

    const totals = safeInvestments.reduce((acc, investment) => {
      const amount = Number(investment.amount || 0);
      const returnPct = Number(investment.returnPct || 0);
      const projected = amount * (1 + (returnPct / 100));

      acc.total += amount;
      acc.projectedValue += projected;
      acc.byType[investment.type] = (acc.byType[investment.type] || 0) + amount;

      return acc;
    }, { total: 0, projectedValue: 0, byType: {} as Record<string, number> });

    const estimatedAnnualReturn = totals.projectedValue - totals.total;
    const avgReturn = totals.total > 0 ? (estimatedAnnualReturn / totals.total) * 100 : 0;

    let topType = 'N/A';
    let topTypeAmount = 0;
    Object.entries(totals.byType).forEach(([type, amount]) => {
      if (amount > topTypeAmount) {
        topType = type;
        topTypeAmount = amount;
      }
    });

    return {
      total: totals.total,
      projectedValue: totals.projectedValue,
      estimatedAnnualReturn,
      avgReturn,
      topType,
      topTypeShare: totals.total > 0 ? (topTypeAmount / totals.total) * 100 : 0
    };
  }
}
