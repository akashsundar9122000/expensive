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
      <app-sidebar></app-sidebar>

      <div class="main-content">
        <header class="top-header">
          <div class="header-left">
            <h1>All Expenses</h1>
            <p>Manage and filter your transaction history</p>
          </div>

          <div class="header-right">
            <div class="search-box">
              <input type="text" 
                     placeholder="Search merchant or category..." 
                     [ngModel]="searchQuery$ | async"
                     (ngModelChange)="updateSearch($event)">
              <button class="search-btn"><i class="ph ph-magnifying-glass"></i></button>
            </div>

            <div class="profile-dropdown">
                <img *ngIf="data.user?.avatar; else fallbackAvatar" [src]="data.user?.avatar" alt="Profile" class="profile-img">
                <ng-template #fallbackAvatar>
                  <div class="fallback-header-avatar">
                    <i class="ph ph-user"></i>
                  </div>
                </ng-template>
            </div>
          </div>
        </header>

        <div class="dashboard-body">
          <div class="card table-card">
            <div class="flex-between chart-header" style="margin-bottom: 24px;">
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
              </div>
            </div>

            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Amount</th>
                    <th>Category</th>
                    <th>Merchant</th>
                    <th>Date</th>
                    <th>Mode</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let t of data.transactions">
                    <td><b>₹{{ t.amount | number:'1.2-2' }}</b></td>
                    <td>{{ t.category }}</td>
                    <td>{{ t.subCategory }}</td>
                    <td>{{ t.date }}</td>
                    <td>
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
                    <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
                      No transactions found matching your criteria.
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
    .dashboard-layout { display: flex; min-height: 100vh; }
    .main-content { flex: 1; margin-left: var(--sidebar-width); }
    .top-header { height: 100px; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; background: var(--bg-main); position: sticky; top: 0; z-index: 10; }
    .header-left h1 { font-size: 24px; margin-bottom: 4px; }
    .header-right { display: flex; align-items: center; gap: 24px; }
    .search-box { position: relative; width: 300px; }
    .search-box input { width: 100%; padding: 12px 20px 12px 48px; border-radius: 24px; border: 1px solid var(--border-light); outline: none; }
    .search-box .search-btn { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); border: none; background: none; color: var(--text-muted); }
    
    .profile-img, .fallback-header-avatar { 
      width: 44px; height: 44px; border-radius: 50%; object-fit: cover; 
    }
    .fallback-header-avatar {
      background: #F1F5F9; color: #64748B; border: 1px solid var(--border-light);
      display: flex; align-items: center; justify-content: center; font-size: 20px;
    }

    .dashboard-body { padding: 24px 40px; }
    
    .filter-tabs { display: flex; gap: 12px; }
    .filter-tab { padding: 8px 20px; border-radius: 20px; border: 1px solid var(--border-light); background: white; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .filter-tab.active { background: var(--text-dark); color: white; border-color: var(--text-dark); }
    
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 16px; color: var(--text-muted); border-bottom: 1px solid var(--border-light); font-weight: 500; }
    td { padding: 16px; border-bottom: 1px solid var(--border-light); font-size: 14px; }
    .mode-chip { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .bank-mode { background: #EFF6FF; color: #3B82F6; }
    .upi-mode { background: #FFF7ED; color: #F59E0B; }
    .card-mode { background: #F3E8FF; color: #8B5CF6; }
    .delete-btn { border: none; background: none; color: var(--text-muted); cursor: pointer; font-size: 18px; transition: color 0.2s; }
    .delete-btn:hover { color: var(--danger-red); }
  `]
})
export class AllExpensesComponent implements OnInit {
  user$!: Observable<User | null>;
  searchQuery$ = new BehaviorSubject<string>('');
  categoryFilter$ = new BehaviorSubject<string>('All');
  filteredTransactions$!: Observable<Transaction[]>;

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
            t.subCategory.toLowerCase().includes(query.toLowerCase()) ||
            t.category.toLowerCase().includes(query.toLowerCase());
          const matchesCategory = category === 'All' || t.category === category;
          return matchesQuery && matchesCategory;
        });
      })
    );
  }

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
}
