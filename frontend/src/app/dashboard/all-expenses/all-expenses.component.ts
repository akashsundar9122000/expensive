import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseService } from '../../services/expense.service';
import { Transaction, User } from '../../services/models';
import { Observable, combineLatest, map, BehaviorSubject } from 'rxjs';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-all-expenses',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule, ReactiveFormsModule],
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

            <button class="primary-btn add-btn" (click)="toggleModal()">
               <i class="ph ph-plus"></i> <span class="btn-label">Add Expense</span>
            </button>

            <div class="fallback-header-avatar" *ngIf="!(data.user?.avatar)">
              <i class="ph ph-user"></i>
            </div>
            <img *ngIf="data.user?.avatar" [src]="data.user?.avatar" class="header-avatar" alt="Avatar">
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
                    <td class="hide-mobile">{{ t.date | date:'mediumDate' }}</td>
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

    <!-- Modal for Adding Expense -->
    <div class="modal-overlay" *ngIf="showModal" (click)="toggleModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
                <h3>Add New Expense</h3>
                <button class="close-btn" (click)="toggleModal()"><i class="ph ph-x"></i></button>
            </div>
            <form [formGroup]="expenseForm" (ngSubmit)="onSubmit()">
                <div class="form-group">
                    <label>Amount (₹)</label>
                    <input type="number" formControlName="amount" placeholder="0.00">
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Category</label>
                        <select formControlName="category">
                            <option value="Food & Grocery">Food & Grocery</option>
                            <option value="Education">Education</option>
                            <option value="Transport">Transport</option>
                            <option value="Shopping">Shopping</option>
                            <option value="Bills">Bills</option>
                            <option value="Entertainment">Entertainment</option>
                            <option value="Home">Home</option>
                            <option value="Healthcare">Healthcare</option>
                            <option value="Lifestyle">Lifestyle</option>
                            <option value="Finance">Finance</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Merchant / Note</label>
                        <input type="text" formControlName="subCategory" placeholder="e.g. Starbucks">
                    </div>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Date</label>
                        <input type="date" formControlName="date">
                    </div>
                    <div class="form-group">
                        <label>Payment Mode</label>
                        <select formControlName="mode">
                            <option value="UPI">UPI</option>
                            <option value="Bank">Bank Transfer</option>
                            <option value="Card">Credit Card</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Bank Account</label>
                    <select formControlName="bank">
                        <option *ngFor="let bank of (user$ | async)?.bankAccounts" [value]="bank">{{bank}}</option>
                    </select>
                </div>
                <button type="submit" class="primary-btn" [disabled]="expenseForm.invalid" style="width: 100%; justify-content: center; margin-top: 10px;">
                    <i class="ph ph-check"></i> Add Transaction
                </button>
            </form>
        </div>
    </div>
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

    .header-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid var(--primary-blue-light);
    }

    .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.2s ease;
    }

    .modal-card {
        background: var(--bg-card);
        width: 450px;
        max-width: 90%;
        border-radius: 24px;
        padding: 32px;
        box-shadow: var(--shadow-xl);
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
    }

    .close-btn {
        background: var(--bg-hover);
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
    }

    .btn-label {
        font-weight: 600;
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
  showModal = false;
  expenseForm!: FormGroup;
  filteredTransactions$!: Observable<Transaction[]>;

  private categoryColors: Record<string, { bg: string; color: string }> = {
    'Food & Grocery': { bg: 'rgba(16, 185, 129, 0.1)', color: '#10B981' },
    'Shopping': { bg: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' },
    'Entertainment': { bg: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' },
    'Transport': { bg: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' },
    'Bills': { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' },
  };

  constructor(private expenseService: ExpenseService, private fb: FormBuilder) {
    this.initForm();
  }

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

  private initForm() {
    this.expenseForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(1)]],
      category: ['Food & Grocery', Validators.required],
      subCategory: ['', Validators.required],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      mode: ['UPI', Validators.required],
      bank: ['SBI']
    });
  }

  toggleModal() {
    this.showModal = !this.showModal;
    if (!this.showModal) {
      this.expenseForm.reset({
        category: 'Food & Grocery',
        date: new Date().toISOString().split('T')[0],
        mode: 'UPI',
        bank: 'SBI'
      });
    } else {
      // Pre-select first bank if available
      this.user$.subscribe(user => {
        if (user && user.bankAccounts && user.bankAccounts.length > 0) {
          this.expenseForm.patchValue({ bank: user.bankAccounts[0] });
        }
      });
    }
  }

  onSubmit() {
    if (this.expenseForm.valid) {
      const formValue = this.expenseForm.value;
      const { bank, ...transactionData } = formValue;
      this.expenseService.addTransaction(transactionData, bank);
      this.toggleModal();
    }
  }
}
