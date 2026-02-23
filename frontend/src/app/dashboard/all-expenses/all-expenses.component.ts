import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseService } from '../../services/expense.service';
import { Transaction, User } from '../../services/models';
import { Observable, combineLatest, map, BehaviorSubject } from 'rxjs';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-all-expenses',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  template: `
    <main class="dashboard-layout" *ngIf="{
      user: user$ | async,
      transactions: filteredTransactions$ | async
    } as data">
      <app-sidebar [isMobileOpen]="isMobileMenuOpen" (closeMobile)="isMobileMenuOpen = false"></app-sidebar>

      <div class="main-content">
        <header class="top-header">
          <div class="header-left">
            <button class="menu-trigger" (click)="isMobileMenuOpen = true">
                  <i class="ph ph-list"></i>
            </button>
            <h1>All Expenses</h1>
            <p>Manage and filter your transaction history</p>
          </div>

          <div class="header-right">
            <div class="search-box">
              <i class="ph ph-magnifying-glass search-icon"></i>
              <input type="text" 
                     placeholder="Search merchant or category..." 
                     [ngModel]="searchQuery$ | async"
                     (ngModelChange)="updateSearch($event)">
            </div>

            <div class="fallback-header-avatar">
              <i class="ph ph-user"></i>
            </div>
          </div>
        </header>

        <div class="dashboard-body">
          <div class="card table-card">
            <div class="flex-between filter-section">
              <div class="filter-tabs">
                <button class="filter-tab" 
                        [class.active]="(categoryFilter$ | async) === 'All'"
                        (click)="updateCategory('All')">All</button>
                <button class="filter-tab" 
                        [class.active]="(categoryFilter$ | async) === 'Food & Grocery'"
                        (click)="updateCategory('Food & Grocery')">Food</button>
                <button class="filter-tab" 
                        [class.active]="(categoryFilter$ | async) === 'Shopping'"
                        (click)="updateCategory('Shopping')">Shopping</button>
                <button class="filter-tab" 
                        [class.active]="(categoryFilter$ | async) === 'Entertainment'"
                        (click)="updateCategory('Entertainment')">Entertainment</button>
                <button class="filter-tab"
                        [class.active]="(categoryFilter$ | async) === 'Transport'"
                        (click)="updateCategory('Transport')">Transport</button>
                <button class="filter-tab"
                        [class.active]="(categoryFilter$ | async) === 'Bills'"
                        (click)="updateCategory('Bills')">Bills</button>
              </div>
              <button class="outline-btn export-btn" (click)="exportCSV(data.transactions || [])">
                <i class="ph ph-download-simple"></i> <span class="btn-text">Export CSV</span>
              </button>
            </div>

            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Amount</th>
                    <th>Category</th>
                    <th>Merchant</th>
                    <th class="hide-mobile">Date</th>
                    <th class="hide-mobile">Mode</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let t of data.transactions; trackBy: trackById" class="table-row-animate">
                    <td><b class="amount-text">₹{{ t.amount | number:'1.2-2' }}</b></td>
                    <td>
                      <span class="category-badge" [style.background]="getCategoryColor(t.category).bg" [style.color]="getCategoryColor(t.category).color">
                        {{ t.category }}
                      </span>
                    </td>
                    <td>{{ t.subCategory }}</td>
                    <td class="hide-mobile">{{ t.date }}</td>
                    <td class="hide-mobile">
                      <span class="mode-chip" [ngClass]="{
                        'bank-mode': t.mode === 'Bank',
                        'upi-mode': t.mode === 'UPI',
                        'card-mode': t.mode === 'Card'
                      }">{{ t.mode }}</span>
                    </td>
                    <td>
                      <button class="delete-btn" (click)="deleteTransaction(t.id)">
                        <i class="ph ph-trash"></i>
                      </button>
                    </td>
                  </tr>
                  <tr *ngIf="data.transactions?.length === 0">
                    <td colspan="6">
                      <div class="empty-state" style="padding: 40px;">
                        <i class="ph ph-receipt"></i>
                        <p>No transactions found matching your criteria.</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  `,
  styles: [`
    .amount-text { color: var(--text-dark); }
    .category-badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .table-row-animate { animation: fadeIn 0.3s ease; }
    .export-btn { font-size: 13px; padding: 8px 16px; display: flex; align-items: center; gap: 8px; }
    
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

    .search-box {
        position: relative;
    }

    .search-icon {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-muted);
    }

    .search-box input {
        padding-left: 40px !important;
    }

    @media (max-width: 768px) {
        .menu-trigger {
            display: flex;
        }
        
        .main-content {
            margin-left: 0;
        }

        .top-header {
            padding: 0 20px;
            height: 70px;
        }

        .header-left h1 {
            font-size: 18px;
        }

        .header-left p, .header-meta {
            display: none;
        }

        .dashboard-body {
            padding: 20px;
        }

        .filter-section {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
        }

        .filter-tabs {
            width: 100%;
            overflow-x: auto;
            padding-bottom: 8px;
            white-space: nowrap;
            -webkit-overflow-scrolling: touch;
        }

        .filter-tabs::-webkit-scrollbar {
            height: 4px;
        }

        .hide-mobile {
            display: none;
        }

        .btn-text {
            display: none;
        }

        .export-btn {
            padding: 8px;
            border-radius: 50%;
        }
    }

    @media (max-width: 480px) {
        .search-box {
            display: none;
        }
    }
  `]
})
export class AllExpensesComponent implements OnInit {
  user$!: Observable<User | null>;
  searchQuery$ = new BehaviorSubject<string>('');
  categoryFilter$ = new BehaviorSubject<string>('All');
  isMobileMenuOpen = false;
  filteredTransactions$!: Observable<Transaction[]>;

  private categoryColors: Record<string, { bg: string; color: string }> = {
    'Food & Grocery': { bg: 'rgba(16, 185, 129, 0.1)', color: '#10B981' },
    'Shopping': { bg: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' },
    'Entertainment': { bg: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' },
    'Transport': { bg: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' },
    'Bills': { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' },
  };

  constructor(private expenseService: ExpenseService) { }

  ngOnInit(): void {
    this.user$ = this.expenseService.getUser();

    this.filteredTransactions$ = combineLatest([
      this.expenseService.getTransactions(),
      this.searchQuery$,
      this.categoryFilter$
    ]).pipe(
      map(([transactions, query, category]) => {
        return transactions.filter(t => {
          const matchesQuery = !query ||
            (t.subCategory && t.subCategory.toLowerCase().includes(query.toLowerCase())) ||
            (t.category && t.category.toLowerCase().includes(query.toLowerCase()));
          const matchesCategory = category === 'All' || t.category === category;
          return matchesQuery && matchesCategory;
        });
      })
    );
  }

  getCategoryColor(category: string) {
    return this.categoryColors[category] || { bg: 'rgba(100, 116, 139, 0.1)', color: '#64748B' };
  }

  trackById(index: number, item: Transaction) { return item.id; }

  updateSearch(query: string) {
    this.searchQuery$.next(query);
  }

  updateCategory(category: string) {
    this.categoryFilter$.next(category);
  }

  deleteTransaction(id: number) {
    if (confirm('Are you sure you want to delete this transaction?')) {
      this.expenseService.deleteTransaction(id);
    }
  }

  exportCSV(transactions: Transaction[]) {
    if (!transactions.length) return;
    const headers = ['Amount', 'Category', 'Merchant', 'Date', 'Mode'];
    const rows = transactions.map(t => [t.amount, t.category, t.subCategory, t.date, t.mode].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'expenses.csv'; a.click();
    URL.revokeObjectURL(url);
  }
}
