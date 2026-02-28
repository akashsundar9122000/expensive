import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseService } from '../../services/expense.service';
import { Investment, Sip, DashboardStats, User, Bank, IndianStockOption } from '../../services/models';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { FormsModule } from '@angular/forms';
import { DeleteConfirmModalComponent } from '../../shared/delete-confirm-modal/delete-confirm-modal.component';
import { RouterLink } from '@angular/router';

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

interface SipForm {
  type: string;
  investmentName: string;
  monthlyAmount: number | null;
  sipDay: number | null;
  bankName: string;
}

const DEFAULT_NEW_INVESTMENT: InvestmentForm = {
  type: 'Mutual Fund',
  name: '',
  amount: null,
  returnPct: null
};

const DEFAULT_NEW_SIP: SipForm = {
  type: 'Mutual Fund',
  investmentName: '',
  monthlyAmount: null,
  sipDay: null,
  bankName: ''
};

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule, DeleteConfirmModalComponent, RouterLink],
  template: `
    <main class="dashboard-layout" *ngIf="{
      user: user$ | async,
      stats: stats$ | async,
      allInvestments: investments$ | async,
      investments: filteredInvestments$ | async,
      investmentTypes: investmentTypeOptions$ | async,
      insights: insights$ | async,
      sips: sips$ | async
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
            <a routerLink="/stock-details" class="outline-btn add-btn stock-details-btn">
              <i class="ph ph-chart-line-up"></i> <span class="btn-label">Stock Details</span>
            </a>
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
                <button class="delete-btn" (click)="openDeleteModal('investment', inv.id, inv.name)">
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

          <!-- SIP Section -->
          <div class="card" style="padding: 28px; margin-top: 24px;">
            <div class="flex-between" style="margin-bottom: 20px;">
              <h3>SIP Plans</h3>
              <div class="sip-header-actions">
                <select class="sip-bank-filter" [(ngModel)]="selectedSipBank">
                  <option value="All">All Banks</option>
                  <option *ngFor="let bank of currentBanks" [value]="bank.name">{{ bank.name }}</option>
                </select>
                <button class="primary-btn" (click)="openAddSipModal()">
                  <i class="ph ph-plus"></i> Add SIP
                </button>
              </div>
            </div>

            <div *ngIf="data.sips && data.sips.length > 0 && getFilteredSips(data.sips).length > 0">
              <div class="sip-row" *ngFor="let sip of getFilteredSips(data.sips)">
                <div class="inv-type-icon" [style.background]="getColor(sip.type).bg" [style.color]="getColor(sip.type).color">
                  <i class="ph" [ngClass]="getColor(sip.type).icon"></i>
                </div>
                <div class="inv-details">
                  <h4>{{ sip.investmentName || sip.type }}</h4>
                  <span class="type-badge" [style.background]="getColor(sip.type).bg" [style.color]="getColor(sip.type).color">
                    {{ sip.type }} • Day {{ sip.sipDay }}
                  </span>
                  <div class="sip-bank">Bank: {{ sip.bankName || 'N/A' }}</div>
                </div>
                <div class="inv-amount">₹{{ sip.monthlyAmount | number:'1.2-2' }}/mo</div>
                <button class="icon-action" (click)="openEditSipModal(sip)" aria-label="Edit SIP">
                  <i class="ph ph-pencil-simple"></i>
                </button>
                <button class="delete-btn" (click)="openDeleteModal('sip', sip.id, sip.investmentName || sip.type)">
                  <i class="ph ph-trash"></i>
                </button>
              </div>
            </div>

            <div class="empty-state" *ngIf="data.sips && data.sips.length === 0">
              <i class="ph ph-calendar"></i>
              <p>No SIP plans yet. Add your first SIP!</p>
            </div>

            <div class="empty-state" *ngIf="data.sips && data.sips.length > 0 && getFilteredSips(data.sips).length === 0">
              <i class="ph ph-funnel-simple"></i>
              <p>No SIPs found for selected bank.</p>
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

        <div class="form-group">
          <label>Investment</label>
          <select [(ngModel)]="newInvestment.type" (ngModelChange)="onInvestmentTypeChange($event)">
            <option *ngFor="let t of investmentTypes" [value]="t.value">{{ t.value }}</option>
          </select>
        </div>

        <div class="form-group" *ngIf="newInvestment.type !== 'Stock'">
          <label>Name / Description</label>
          <input type="text" [(ngModel)]="newInvestment.name" placeholder="e.g. Nifty 50 Index Fund">
        </div>

        <div class="form-group" *ngIf="newInvestment.type === 'Stock'">
          <label>Select Indian Stock (NSE)</label>
          <div class="stock-picker">
            <div class="stock-picker-input-wrap" [class.open]="showStockDropdown && isStockInputFocused">
              <input
                type="text"
                [(ngModel)]="newInvestment.name"
                placeholder="Select stock (symbol or name)"
                (focus)="openStockDropdown()"
                (blur)="onStockInputBlur()"
                (ngModelChange)="onStockInputChange()"
              >
              <i class="ph ph-caret-down stock-picker-caret"></i>
            </div>
            <div class="stock-dropdown" *ngIf="showStockDropdown && isStockInputFocused">
              <button
                type="button"
                class="stock-option"
                *ngFor="let stock of filteredIndianStockOptions"
                (mousedown)="selectStockOption(stock, $event)">
                <span class="stock-option-symbol">{{ stock.symbol }}</span>
                <span class="stock-option-name">{{ stock.name }}</span>
              </button>
              <div class="stock-empty" *ngIf="filteredIndianStockOptions.length === 0">
                No stocks found for "{{ newInvestment.name || 'search' }}"
              </div>
            </div>
          </div>
          <div class="stock-hint" *ngIf="isIndianStocksLoading">Loading Indian stock list...</div>
          <div class="stock-hint" *ngIf="!isIndianStocksLoading && indianStockOptions.length > 0">
            {{ indianStockOptions.length | number:'1.0-0' }} Indian stocks loaded.
          </div>
        </div>
        <div class="modal-grid-2">
          <div class="form-group">
            <label>Amount (₹)</label>
            <input type="number" [(ngModel)]="newInvestment.amount" placeholder="0">
          </div>
          <div class="form-group" *ngIf="newInvestment.type !== 'Stock'">
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

    <!-- Add/Edit SIP Modal -->
    <div class="modal-overlay" *ngIf="showSipModal" (click)="showSipModal = false">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ editingSipId ? 'Edit SIP' : 'Add SIP' }}</h3>
          <button class="close-btn" (click)="closeSipModal()"><i class="ph ph-x"></i></button>
        </div>

        <div class="form-group">
          <label>Investment</label>
          <select [(ngModel)]="newSip.type">
            <option *ngFor="let t of investmentTypes" [value]="t.value">{{ t.value }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>{{ getSipInvestmentNameLabel(newSip.type) }}</label>
          <input type="text" [(ngModel)]="newSip.investmentName" [placeholder]="getSipInvestmentNamePlaceholder(newSip.type)">
        </div>

        <div class="modal-grid-2">
          <div class="form-group">
            <label>Monthly Amount (₹)</label>
            <input type="number" [(ngModel)]="newSip.monthlyAmount" placeholder="0">
          </div>
          <div class="form-group">
            <label>SIP Date (1-31)</label>
            <input type="number" min="1" max="31" [(ngModel)]="newSip.sipDay" placeholder="e.g. 5">
          </div>
        </div>

        <div class="form-group">
          <label>Bank Account</label>
          <select [(ngModel)]="newSip.bankName">
            <option value="" disabled *ngIf="currentBanks.length === 0">No bank accounts available</option>
            <option *ngFor="let bank of currentBanks" [value]="bank.name">{{ bank.name }}</option>
          </select>
        </div>

        <button class="primary-btn" style="width: 100%; justify-content: center; margin-top: 8px;" (click)="saveSip()"
          [disabled]="!canSaveSip() || isSavingSip">
          {{ isSavingSip ? 'Saving...' : (editingSipId ? 'Update SIP' : 'Save SIP') }}
        </button>
      </div>
    </div>

    <app-delete-confirm-modal
      [visible]="showDeleteModal"
      [title]="'Confirm Delete'"
      [message]="'Delete ' + (deleteTargetType === 'sip' ? 'SIP' : 'investment') + ' ' + (deleteTargetName || '') + '?'"
      [confirmText]="'Delete'"
      [processingText]="'Deleting...'"
      [requirePassword]="true"
      [password]="deletePassword"
      (passwordChange)="deletePassword = $event"
      [isProcessing]="isDeleting"
      [errorMessage]="deleteError"
      (closed)="closeDeleteModal()"
      (confirmed)="confirmDelete()">
    </app-delete-confirm-modal>
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
    .sip-row { display: flex; align-items: center; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--border-light); transition: background var(--transition-fast); }
    .sip-row:hover { background: var(--bg-hover); margin: 0 -12px; padding: 14px 12px; border-radius: 12px; }
    .inv-type-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
    .inv-details { flex: 1; }
    .inv-details h4 { font-size: 15px; margin-bottom: 4px; }
    .type-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
    .sip-bank { margin-top: 6px; font-size: 12px; color: var(--text-muted); }
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
    .modal-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .top-type { font-size: 12px; color: var(--text-muted); display: flex; gap: 8px; align-items: center; }
    .top-type strong { color: var(--text-dark); font-size: 12px; }
    .sip-header-actions { display: flex; align-items: center; gap: 10px; }
    .sip-bank-filter {
      border: 1px solid var(--border-light);
      background: var(--bg-main);
      color: var(--text-dark);
      border-radius: 10px;
      padding: 8px 10px;
      font-size: 12px;
      min-width: 140px;
    }

    .stock-details-btn {
      text-decoration: none;
    }

    .market-card { padding: 24px; margin-bottom: 20px; }
    .market-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 18px; }
    .market-header-actions { display: flex; align-items: center; gap: 8px; }
    .market-header p { margin: 4px 0 0; font-size: 12px; color: var(--text-muted); }
    .market-title-row { display: flex; align-items: center; gap: 10px; }
    .market-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 20px;
      line-height: 1;
    }
    .market-status-badge.market-open {
      background: rgba(16, 185, 129, 0.12);
      color: #10B981;
      border: 1px solid rgba(16, 185, 129, 0.25);
    }
    .market-status-badge.market-closed {
      background: rgba(100, 116, 139, 0.1);
      color: var(--text-muted);
      border: 1px solid var(--border-light);
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      flex-shrink: 0;
    }
    .market-open .status-dot { animation: pulse-dot 1.5s ease-in-out infinite; }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .market-updated { font-size: 12px; color: var(--text-muted); }
    .market-refresh-btn {
      border: 1px solid var(--border-light);
      background: var(--bg-main);
      color: var(--text-dark);
      border-radius: 10px;
      padding: 6px 10px;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    .market-refresh-btn:hover { background: var(--bg-hover); }
    .market-refresh-btn:disabled { opacity: 0.65; cursor: not-allowed; }
    .index-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 14px; }
    .index-item { border: 1px solid var(--border-light); border-radius: 12px; padding: 12px; background: var(--bg-main); }
    .index-name-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .index-name { font-size: 12px; color: var(--text-muted); }
    .index-value { font-size: 20px; font-weight: 700; color: var(--text-dark); margin: 4px 0; }
    .market-move { font-size: 12px; font-weight: 600; }
    .positive { color: var(--success-green); }
    .negative { color: var(--danger-red); }
    .gainers-losers-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 12px; }
    .market-list-card { border: 1px solid var(--border-light); border-radius: 12px; padding: 12px; background: var(--bg-main); }
    .market-list-card h4 { margin-bottom: 10px; font-size: 14px; }
    .market-row { display: flex; justify-content: space-between; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-light); }
    .market-row:last-child { border-bottom: none; }
    .row-name { min-width: 0; display: flex; flex-direction: column; }
    .row-name strong { font-size: 12px; color: var(--text-dark); }
    .row-name span { font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px; }
    .row-metrics { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: var(--text-dark); }
    .market-badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 999px;
      border: 1px solid var(--border-light);
      background: var(--bg-chip);
      color: var(--text-muted);
      white-space: nowrap;
    }
    .market-empty { font-size: 12px; color: var(--text-muted); padding: 6px 0 2px; }
    .market-note { margin-top: 10px; font-size: 12px; color: var(--text-muted); }
    .stock-hint { margin-top: 6px; font-size: 11px; color: var(--text-muted); }
    .stock-picker { position: relative; }
    .stock-picker-input-wrap {
      position: relative;
      border: 1px solid var(--border-light);
      border-radius: 12px;
      background: var(--bg-main);
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }
    .stock-picker-input-wrap.open {
      border-color: var(--primary-blue);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
    }
    .stock-picker-input-wrap input {
      width: 100%;
      border: none;
      background: transparent;
      color: var(--text-dark);
      font-size: 13px;
      padding: 10px 34px 10px 12px;
      border-radius: 12px;
    }
    .stock-picker-input-wrap input:focus {
      outline: none;
    }
    .stock-picker-caret {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 14px;
      color: var(--text-muted);
      pointer-events: none;
    }
    .stock-dropdown {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      max-height: 260px;
      overflow-y: auto;
      border: 1px solid var(--border-light);
      background: var(--bg-card);
      border-radius: 12px;
      z-index: 20;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
    }
    .stock-option {
      width: 100%;
      border: none;
      border-bottom: 1px solid var(--border-light);
      background: transparent;
      color: var(--text-dark);
      text-align: left;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }
    .stock-option:last-child { border-bottom: none; }
    .stock-option:hover { background: var(--bg-hover); }
    .stock-option-symbol {
      font-size: 12px;
      font-weight: 700;
      min-width: 86px;
      color: var(--text-dark);
    }
    .stock-option-name {
      font-size: 12px;
      color: var(--text-main);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .stock-empty {
      padding: 10px 12px;
      font-size: 12px;
      color: var(--text-muted);
    }

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

        .top-header .header-right {
          gap: 10px;
        }

        .market-header {
          flex-direction: column;
          align-items: stretch;
        }

        .market-header-actions {
          justify-content: space-between;
        }

        .top-type {
          flex-wrap: wrap;
          justify-content: flex-end;
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

        .index-grid,
        .gainers-losers-grid {
          grid-template-columns: 1fr;
        }

        .investment-row,
        .sip-row {
          flex-wrap: wrap;
          row-gap: 10px;
          column-gap: 12px;
          align-items: flex-start;
        }

        .inv-details {
          min-width: 0;
          flex: 1 1 calc(100% - 56px);
        }

        .inv-details h4 {
          word-break: break-word;
        }

        .inv-amount {
          margin-left: auto;
          margin-right: 0;
          font-size: 15px;
        }

        .modal-grid-2 {
          grid-template-columns: 1fr;
          gap: 0;
        }

        .sip-header-actions {
          width: 100%;
          justify-content: space-between;
        }

        .sip-bank-filter {
          flex: 1;
          min-width: 0;
        }
    }

    @media (max-width: 480px) {
        .investment-types-grid {
            grid-template-columns: repeat(2, 1fr);
        }

        .sip-header-actions {
          flex-direction: column;
          align-items: stretch;
          gap: 8px;
        }

        .sip-header-actions .primary-btn {
          width: 100%;
          justify-content: center;
        }

        .inv-amount {
          width: 100%;
          margin-left: 0;
          text-align: right;
        }
    }

    @media (max-width: 375px) {
        .inv-type-icon {
          width: 38px;
          height: 38px;
          font-size: 18px;
        }

        .inv-details h4 {
          font-size: 14px;
        }

        .type-badge,
        .sip-bank {
          font-size: 11px;
        }

        .inv-amount {
          font-size: 14px;
        }
    }
  `]
})
export class InvestmentsComponent implements OnInit {
  user$!: Observable<User | null>;
  stats$!: Observable<DashboardStats>;
  investments$!: Observable<Investment[]>;
  sips$!: Observable<Sip[]>;
  banks$!: Observable<Bank[]>;
  filteredInvestments$!: Observable<Investment[]>;
  investmentTypeOptions$!: Observable<string[]>;
  insights$!: Observable<InvestmentInsight>;

  isMobileMenuOpen = false;
  showModal = false;
  showSipModal = false;
  showDeleteModal = false;
  isSaving = false;
  isSavingSip = false;
  isDeleting = false;
  editingInvestmentId: number | null = null;
  editingSipId: number | null = null;
  deleteTargetType: 'investment' | 'sip' | null = null;
  deleteTargetId: number | null = null;
  deleteTargetName = '';
  deletePassword = '';
  deleteError = '';

  investmentTypes = INVESTMENT_TYPES;
  currentBanks: Bank[] = [];
  newInvestment: InvestmentForm = { ...DEFAULT_NEW_INVESTMENT };
  newSip: SipForm = { ...DEFAULT_NEW_SIP };
  indianStockOptions: IndianStockOption[] = [];
  filteredIndianStockOptions: IndianStockOption[] = [];
  isIndianStocksLoading = false;
  showStockDropdown = false;
  isStockInputFocused = false;

  searchTerm = '';
  selectedType = 'All';
  sortBy: SortOption = 'amount-desc';
  selectedSipBank = 'All';

  private searchTerm$ = new BehaviorSubject<string>('');
  private selectedType$ = new BehaviorSubject<string>('All');
  private sortBy$ = new BehaviorSubject<SortOption>('amount-desc');

  constructor(private expenseService: ExpenseService) { }

  ngOnInit() {
    this.user$ = this.expenseService.getUser();
    this.stats$ = this.expenseService.getStats();
    this.investments$ = this.expenseService.getInvestments();
    this.sips$ = this.expenseService.getSips();
    this.banks$ = this.expenseService.getBanks();

    this.banks$.subscribe((banks) => {
      this.currentBanks = banks || [];
      if (this.currentBanks.length > 0 && !this.newSip.bankName) {
        this.newSip.bankName = this.currentBanks[0].name;
      }
    });

    this.loadIndianStockOptions();

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

  getFilteredSips(sips: Sip[]): Sip[] {
    const source = Array.isArray(sips) ? sips : [];
    if (this.selectedSipBank === 'All') {
      return source;
    }
    return source.filter((sip) => (sip.bankName || '') === this.selectedSipBank);
  }

  canSaveInvestment(): boolean {
    const name = this.getNormalizedInvestmentName();
    const amount = Number(this.newInvestment.amount);
    return !!this.newInvestment.type && !!name && Number.isFinite(amount) && amount > 0;
  }

  onInvestmentTypeChange(type: string) {
    if (type === 'Stock') {
      this.newInvestment.name = '';
      this.newInvestment.returnPct = null;
      this.filteredIndianStockOptions = this.indianStockOptions;
      this.showStockDropdown = false;
      this.isStockInputFocused = false;
      if (this.indianStockOptions.length === 0 && !this.isIndianStocksLoading) {
        this.loadIndianStockOptions();
      }
      return;
    }

    if (this.newInvestment.name && this.newInvestment.name.includes(' - ')) {
      this.newInvestment.name = this.newInvestment.name.split(' - ')[0].trim();
    }
  }

  onStockInputChange() {
    this.filterIndianStocks(this.newInvestment.name || '');
    this.showStockDropdown = this.isStockInputFocused;
  }

  openStockDropdown() {
    if (this.newInvestment.type !== 'Stock') {
      return;
    }
    this.isStockInputFocused = true;
    this.filterIndianStocks(this.newInvestment.name || '');
    this.showStockDropdown = true;
  }

  onStockInputBlur() {
    setTimeout(() => {
      this.showStockDropdown = false;
      this.isStockInputFocused = false;
    }, 120);
  }

  selectStockOption(stock: IndianStockOption, event: MouseEvent) {
    event.preventDefault();
    this.newInvestment.name = `${stock.symbol} - ${stock.name}`;
    this.filterIndianStocks(stock.symbol);
    this.showStockDropdown = false;
    this.isStockInputFocused = false;
  }

  private loadIndianStockOptions() {
    this.isIndianStocksLoading = true;
    this.expenseService.getIndianStocks().subscribe({
      next: (stocks) => {
        this.indianStockOptions = Array.isArray(stocks) ? stocks : [];
        this.filteredIndianStockOptions = this.indianStockOptions;
        this.isIndianStocksLoading = false;
      },
      error: (err) => {
        console.error('Failed to load Indian stocks:', err);
        this.indianStockOptions = [];
        this.filteredIndianStockOptions = [];
        this.isIndianStocksLoading = false;
      }
    });
  }

  private filterIndianStocks(query: string) {
    const term = String(query || '').trim().toLowerCase();
    if (!term) {
      this.filteredIndianStockOptions = this.indianStockOptions;
      return;
    }

    this.filteredIndianStockOptions = this.indianStockOptions.filter((stock) => {
      const symbol = String(stock.symbol || '').toLowerCase();
      const name = String(stock.name || '').toLowerCase();
      const display = String(stock.display || '').toLowerCase();
      return symbol.includes(term) || name.includes(term) || display.includes(term);
    });
  }

  openAddModal() {
    this.editingInvestmentId = null;
    this.newInvestment = { ...DEFAULT_NEW_INVESTMENT };
    this.showStockDropdown = false;
    this.isStockInputFocused = false;
    if (this.newInvestment.type === 'Stock' && this.indianStockOptions.length === 0) {
      this.loadIndianStockOptions();
    }
    this.filterIndianStocks('');
    this.showModal = true;
  }

  openEditModal(investment: Investment) {
    this.editingInvestmentId = investment.id;
    this.newInvestment = {
      type: investment.type,
      name: investment.type === 'Stock' ? investment.name : investment.name,
      amount: Number(investment.amount || 0),
      returnPct: investment.returnPct === undefined || investment.returnPct === null ? null : Number(investment.returnPct)
    };
    this.showStockDropdown = false;
    this.isStockInputFocused = false;
    if (this.newInvestment.type === 'Stock' && this.indianStockOptions.length === 0) {
      this.loadIndianStockOptions();
    }
    this.filterIndianStocks(this.newInvestment.type === 'Stock' ? this.newInvestment.name : '');
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.isSaving = false;
    this.editingInvestmentId = null;
    this.newInvestment = { ...DEFAULT_NEW_INVESTMENT };
    this.showStockDropdown = false;
    this.isStockInputFocused = false;
    this.filterIndianStocks('');
  }

  canSaveSip(): boolean {
    const investmentName = (this.newSip.investmentName || '').trim();
    const amount = Number(this.newSip.monthlyAmount);
    const sipDay = Number(this.newSip.sipDay);
    const bankName = (this.newSip.bankName || '').trim();
    return !!this.newSip.type && !!investmentName && !!bankName && Number.isFinite(amount) && amount > 0 && Number.isInteger(sipDay) && sipDay >= 1 && sipDay <= 31;
  }

  openAddSipModal() {
    this.editingSipId = null;
    this.newSip = { ...DEFAULT_NEW_SIP, bankName: this.currentBanks[0]?.name || '' };
    this.showSipModal = true;
  }

  openEditSipModal(sip: Sip) {
    this.editingSipId = sip.id;
    this.newSip = {
      type: sip.type,
      investmentName: sip.investmentName || '',
      monthlyAmount: Number(sip.monthlyAmount || 0),
      sipDay: Number(sip.sipDay || 1),
      bankName: sip.bankName || this.currentBanks[0]?.name || ''
    };
    this.showSipModal = true;
  }

  closeSipModal() {
    this.showSipModal = false;
    this.isSavingSip = false;
    this.editingSipId = null;
    this.newSip = { ...DEFAULT_NEW_SIP, bankName: this.currentBanks[0]?.name || '' };
  }

  private toSipPayload() {
    return {
      type: this.newSip.type,
      investmentName: (this.newSip.investmentName || '').trim(),
      monthlyAmount: Number(this.newSip.monthlyAmount),
      sipDay: Number(this.newSip.sipDay),
      bankName: (this.newSip.bankName || '').trim()
    };
  }

  getSipInvestmentNameLabel(type: string): string {
    if (type === 'Mutual Fund') return 'Mutual Fund Name';
    if (type === 'Stock') return 'Stock Name';
    return `${type} Name`;
  }

  getSipInvestmentNamePlaceholder(type: string): string {
    if (type === 'Mutual Fund') return 'e.g. Axis Bluechip Fund';
    if (type === 'Stock') return 'e.g. Reliance Industries';
    return `Enter ${type.toLowerCase()} name`;
  }

  private toInvestmentPayload() {
    const shouldSendReturnPct = this.newInvestment.type !== 'Stock';
    return {
      type: this.newInvestment.type,
      name: this.getNormalizedInvestmentName(),
      amount: Number(this.newInvestment.amount),
      returnPct: !shouldSendReturnPct || this.newInvestment.returnPct === null || this.newInvestment.returnPct === undefined || this.newInvestment.returnPct === ('' as any)
        ? undefined
        : Number(this.newInvestment.returnPct)
    };
  }

  private getNormalizedInvestmentName(): string {
    const raw = (this.newInvestment.name || '').trim();
    if (this.newInvestment.type !== 'Stock') {
      return raw;
    }

    const resolved = this.resolveStockFromInput(raw);
    if (!resolved) {
      return '';
    }

    return `${resolved.symbol} - ${resolved.name}`;
  }

  private extractStockSymbol(value: string): string {
    const raw = String(value || '').trim();
    if (!raw) return '';

    const fromDash = raw.split(' - ')[0].trim();
    const fromBracket = fromDash.replace(/[()]/g, '').trim();
    return fromBracket.toUpperCase();
  }

  private resolveStockFromInput(value: string): IndianStockOption | null {
    const raw = String(value || '').trim();
    if (!raw) {
      return null;
    }

    const symbol = this.extractStockSymbol(raw);
    const bySymbol = this.indianStockOptions.find((stock) => stock.symbol.toUpperCase() === symbol.toUpperCase());
    if (bySymbol) {
      return bySymbol;
    }

    const lower = raw.toLowerCase();
    const byName = this.indianStockOptions.find((stock) => stock.name.toLowerCase() === lower);
    if (byName) {
      return byName;
    }

    const byContains = this.indianStockOptions.find((stock) =>
      stock.symbol.toLowerCase().includes(lower) || stock.name.toLowerCase().includes(lower)
    );
    return byContains || null;
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

  openDeleteModal(type: 'investment' | 'sip', id: number, name: string) {
    this.deleteTargetType = type;
    this.deleteTargetId = id;
    this.deleteTargetName = name || '';
    this.deletePassword = '';
    this.deleteError = '';
    this.isDeleting = false;
    this.showDeleteModal = true;
  }

  saveSip() {
    if (this.canSaveSip() && !this.isSavingSip) {
      this.isSavingSip = true;
      const payload = this.toSipPayload();
      const request$ = this.editingSipId
        ? this.expenseService.updateSip(this.editingSipId, payload)
        : this.expenseService.addSip(payload);

      request$.subscribe({
        next: () => {
          this.closeSipModal();
        },
        error: (err) => {
          this.isSavingSip = false;
          console.error('Failed to save SIP:', err);
          alert(err?.error?.error || 'Failed to save SIP. Please check details and try again.');
        }
      });
    }
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.isDeleting = false;
    this.deleteTargetType = null;
    this.deleteTargetId = null;
    this.deleteTargetName = '';
    this.deletePassword = '';
    this.deleteError = '';
  }

  confirmDelete() {
    if (!this.deleteTargetType || !this.deleteTargetId || !this.deletePassword.trim() || this.isDeleting) {
      return;
    }

    this.isDeleting = true;
    this.deleteError = '';

    const request$ = this.deleteTargetType === 'sip'
      ? this.expenseService.deleteSip(this.deleteTargetId, this.deletePassword.trim())
      : this.expenseService.deleteInvestment(this.deleteTargetId, this.deletePassword.trim());

    request$.subscribe({
      next: () => {
        this.closeDeleteModal();
      },
      error: (err) => {
        this.isDeleting = false;
        this.deleteError = err?.error?.error || 'Delete failed. Please check password and try again.';
      }
    });
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
