import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseService } from '../../services/expense.service';
import { Transaction, User, Bank } from '../../services/models';
import { Observable, combineLatest, map, BehaviorSubject, take } from 'rxjs';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';
import Chart from 'chart.js/auto';
import * as XLSX from 'xlsx';

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
            <div class="filter-section-wrapper">
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
            </div>

            <div class="filter-controls-wrapper">
              <div class="filter-controls">
                <div class="filter-group hide-mobile" style="min-width: 140px;">
                  <label style="font-size: 12px; color: var(--text-muted); margin-right: 6px;">Month:</label>
                  <input type="month" (ngModelChange)="updateMonth($event)" [ngModel]="monthFilter$ | async" style="width: 100px; padding: 6px 8px; border-radius: 8px; border: 1px solid var(--border-light); background: var(--bg-card); font-size: 11px; box-sizing: border-box;">
                </div>
                <div class="filter-group hide-mobile">
                  <label style="font-size: 12px; color: var(--text-muted); margin-right: 8px;">Bank:</label>
                  <select (ngModelChange)="updateBank($event)" [ngModel]="(bankFilter$ | async)" style="padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border-light); background: var(--bg-card); font-size: 12px;">
                    <option value="All">All Banks</option>
                    <option *ngFor="let bank of (banks$ | async)" [value]="bank.name">{{ bank.name }}</option>
                  </select>
                </div>
                <div class="filter-group hide-mobile">
                  <label style="font-size: 12px; color: var(--text-muted); margin-right: 8px;">Mode:</label>
                  <select (ngModelChange)="updateMode($event)" [ngModel]="(modeFilter$ | async)" style="padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border-light); background: var(--bg-card); font-size: 12px;">
                    <option value="All">All Modes</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="Card">Credit Card</option>
                  </select>
                </div>
              </div>
              <div class="export-buttons">
                <button class="outline-btn export-btn" (click)="exportCSV(data.transactions || [])">
                  <i class="ph ph-download-simple"></i> <span class="btn-text">Export CSV</span>
                </button>
                <button class="outline-btn export-btn" (click)="exportPDF(data.transactions || [])">
                  <i class="ph ph-file-pdf"></i> <span class="btn-text">Export PDF</span>
                </button>
                <button class="outline-btn export-btn" (click)="exportXLSX(data.transactions || [])">
                  <i class="ph ph-file-xls"></i> <span class="btn-text">Export XLSX</span>
                </button>
              </div>
            </div>

            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Amount</th>
                    <th>Category</th>
                    <th>Merchant</th>
                    <th class="hide-mobile">Bank</th>
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
                    <td class="hide-mobile">
                      <span class="bank-chip">{{ getTransactionBank(t.id) || 'N/A' }}</span>
                    </td>
                    <td class="hide-mobile">{{ t.date | date:'mediumDate' }}</td>
                    <td class="hide-mobile">
                      <span class="mode-chip" [ngClass]="{
                        'bank-mode': t.mode === 'Bank',
                        'upi-mode': t.mode === 'UPI',
                        'card-mode': t.mode === 'Card'
                      }">{{ t.mode }}</span>
                    </td>
                    <td>
                      <div class="action-buttons">
                        <button class="edit-btn" (click)="editTransaction(t)" title="Edit">
                          <i class="ph ph-pencil"></i>
                        </button>
                        <button class="delete-btn" (click)="deleteTransaction(t)" title="Delete">
                          <i class="ph ph-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="data.transactions?.length === 0">
                    <td colspan="7">
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

    <!-- Hidden Charts Container for PDF Export -->
    <div #chartsContainer style="position: absolute; left: -9999px; width: 800px; background: white; padding: 20px;">
      <div style="margin-bottom: 30px;">
        <h2 style="color: #1f2937; margin-bottom: 20px; font-size: 20px;">Expenses by Category</h2>
        <canvas #categoryChart style="background: white; border-radius: 8px;"></canvas>
      </div>
      <div style="margin-bottom: 30px;">
        <h2 style="color: #1f2937; margin-bottom: 20px; font-size: 20px;">Expenses by Payment Mode</h2>
        <canvas #modeChart style="background: white; border-radius: 8px;"></canvas>
      </div>
      <div style="margin-bottom: 30px;">
        <h2 style="color: #1f2937; margin-bottom: 20px; font-size: 20px;">Expenses by Bank</h2>
        <canvas #bankChart style="background: white; border-radius: 8px;"></canvas>
      </div>
    </div>

    <!-- Modal for Adding/Editing Expense -->
    <div class="modal-overlay" *ngIf="showModal" (click)="toggleModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
                <h3>{{ editingTransactionId ? 'Edit Expense' : 'Add New Expense' }}</h3>
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
                    <option value="" disabled *ngIf="(banks$ | async)?.length === 0">No bank accounts available</option>
                        <option *ngFor="let bank of (banks$ | async)" [value]="bank.name">{{bank.name}}</option>
                    </select>
                  <p *ngIf="currentBanks.length === 0" style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">
                    Please add a bank account from Settings or Dashboard first.
                  </p>
                </div>
                <button type="submit" class="primary-btn" [disabled]="expenseForm.invalid || currentBanks.length === 0" style="width: 100%; justify-content: center; margin-top: 10px;">
                    <i class="ph" [ngClass]="editingTransactionId ? 'ph-check' : 'ph-plus'"></i> 
                    {{ editingTransactionId ? 'Update Transaction' : 'Add Transaction' }}
                </button>
            </form>
        </div>
    </div>

    <div class="toast-container" *ngIf="toast.show" [class]="toast.type">
      <div class="toast-content">
        <i class="ph" [class]="toast.type === 'danger' ? 'ph-warning-octagon' : toast.type === 'warning' ? 'ph-warning' : 'ph-check-circle'"></i>
        <span>{{ toast.message }}</span>
      </div>
      <button class="toast-close" (click)="toast.show = false"><i class="ph ph-x"></i></button>
    </div>

    <div class="confirm-overlay" *ngIf="showDeleteConfirm" (click)="cancelDelete()">
      <div class="confirm-card" (click)="$event.stopPropagation()">
        <div class="confirm-icon-wrap">
          <i class="ph ph-trash"></i>
        </div>
        <h3 class="confirm-title">Delete Expense?</h3>
        <p class="confirm-msg">
          You're about to delete <strong>{{ transactionToDelete?.subCategory || transactionToDelete?.category || 'this expense' }}</strong>.
          This action cannot be undone.
        </p>
        <div class="confirm-actions">
          <button class="cancel-action-btn" (click)="cancelDelete()">Cancel</button>
          <button class="delete-action-btn" (click)="confirmDelete()">
            <i class="ph ph-trash"></i> Delete
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .amount-text { color: var(--text-dark); }
    .category-badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .bank-chip { 
      padding: 4px 10px; 
      border-radius: 6px; 
      font-size: 12px; 
      font-weight: 500; 
      background: rgba(59, 130, 246, 0.1); 
      color: #3B82F6;
    }
    .table-row-animate { animation: fadeIn 0.3s ease; }
    .export-btn { font-size: 13px; padding: 8px 16px; display: flex; align-items: center; gap: 8px; }

    .toast-container {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 3000;
      min-width: 280px;
      max-width: 420px;
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      border-left: 4px solid var(--primary-blue);
      border-radius: 12px;
      box-shadow: 0 12px 28px rgba(0,0,0,0.12);
      padding: 12px 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
    }

    .toast-container.success { border-left-color: #10b981; }
    .toast-container.warning { border-left-color: #f59e0b; }
    .toast-container.danger { border-left-color: #ef4444; }

    .toast-content {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-dark);
      font-size: 13px;
      line-height: 1.4;
    }

    .toast-close {
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 1px;
    }

    .confirm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }

    .confirm-card {
      background: var(--bg-card);
      border-radius: 24px;
      padding: 36px 32px;
      width: 380px;
      max-width: 92%;
      box-shadow: 0 24px 64px rgba(0,0,0,0.18);
      text-align: center;
      animation: scaleIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .confirm-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(239,68,68,0.1);
      color: #ef4444;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      margin: 0 auto 20px;
    }

    .confirm-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-dark);
      margin-bottom: 12px;
    }

    .confirm-msg {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 28px;
    }

    .confirm-msg strong { color: var(--text-dark); }

    .confirm-actions {
      display: flex;
      gap: 12px;
    }

    .cancel-action-btn {
      flex: 1;
      padding: 12px;
      border-radius: 12px;
      border: 1.5px solid var(--border-light);
      background: var(--bg-chip);
      color: var(--text-dark);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }

    .delete-action-btn {
      flex: 1;
      padding: 12px;
      border-radius: 12px;
      border: none;
      background: #ef4444;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    
    .filter-section {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
    }
    
    .filter-section-wrapper {
      display: flex;
      width: 100%;
      margin-bottom: 16px;
    }

    .filter-controls-wrapper {
      display: flex;
      width: 100%;
      gap: 16px;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
    }

    .filter-controls {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }

    .export-buttons {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-shrink: 0;
    }
    
    .table-card {
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow: hidden;
    }
    
    .table-container {
      overflow-x: auto;
      border-radius: 8px;
      background: var(--bg-card);
    }

    .table-container table {
      min-width: 100%;
      border-spacing: 0;
    }

    .action-buttons {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .edit-btn, .delete-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 16px;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .edit-btn:hover {
      background: rgba(59, 130, 246, 0.1);
      color: #3B82F6;
    }

    .delete-btn:hover {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .filter-group select {
      color: var(--text-dark);
      cursor: pointer;
    }

    .filter-group select:focus {
      outline: none;
      border-color: var(--primary-blue);
    }
    
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

        .filter-section-wrapper {
            display: flex;
            width: 100%;
            overflow-x: auto;
        }

        .filter-controls-wrapper {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
        }

        .filter-controls {
            flex-direction: column;
            width: 100%;
            gap: 12px;
        }

        .export-buttons {
            width: 100%;
            justify-content: space-around;
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
  banks$!: Observable<Bank[]>;
  searchQuery$ = new BehaviorSubject<string>('');
  categoryFilter$ = new BehaviorSubject<string>('All');
  bankFilter$ = new BehaviorSubject<string>('All');
  modeFilter$ = new BehaviorSubject<string>('All');
  monthFilter$ = new BehaviorSubject<string>(this.getCurrentMonth());
  isMobileMenuOpen = false;
  showModal = false;
  expenseForm!: FormGroup;
  filteredTransactions$!: Observable<Transaction[]>;
  editingTransactionId: number | null = null;
  transactionBankMap: Map<number, string> = new Map();
  currentBanks: Bank[] = [];
  toast: { show: boolean; message: string; type: 'success' | 'warning' | 'danger' } = { show: false, message: '', type: 'success' };
  showDeleteConfirm = false;
  transactionToDelete: Transaction | null = null;

  @ViewChild('chartsContainer') chartsContainer!: ElementRef;
  @ViewChild('categoryChart') categoryChart!: ElementRef;
  @ViewChild('modeChart') modeChart!: ElementRef;
  @ViewChild('bankChart') bankChart!: ElementRef;

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
    this.banks$ = this.expenseService.getBanks();

    this.banks$.subscribe(banks => {
      this.currentBanks = banks || [];
      const selectedBank = this.expenseForm.get('bank')?.value;
      if ((!selectedBank || !this.currentBanks.some(b => b.name === selectedBank)) && this.currentBanks.length > 0) {
        this.expenseForm.patchValue({ bank: this.currentBanks[0].name });
      }
      if (this.currentBanks.length === 0) {
        this.expenseForm.patchValue({ bank: '' });
      }
    });

    // Store bank information for transactions
    this.expenseService.getTransactions().pipe(take(1)).subscribe(transactions => {
      transactions.forEach(t => {
        // Since we don't have bank data in transaction, we'll track it differently
        // This will be updated when we have proper bank mapping
      });
    });

    this.filteredTransactions$ = combineLatest([
      this.expenseService.getTransactions(),
      this.searchQuery$,
      this.categoryFilter$,
      this.bankFilter$,
      this.modeFilter$,
      this.monthFilter$
    ]).pipe(
      map(([transactions, query, category, bank, mode, month]) => {
        this.syncTransactionBankMap(transactions);
        return transactions.filter(t => {
          const matchesQuery = !query ||
            (t.subCategory && t.subCategory.toLowerCase().includes(query.toLowerCase())) ||
            (t.category && t.category.toLowerCase().includes(query.toLowerCase()));
          const matchesCategory = category === 'All' || t.category === category;
          const matchesBank = bank === 'All' || this.getTransactionBank(t.id) === bank;
          const matchesMode = mode === 'All' || t.mode === mode;
          const matchesMonth = !month || this.isTransactionInMonth(t.date, month);
          return matchesQuery && matchesCategory && matchesBank && matchesMode && matchesMonth;
        });
      })
    );
  }

  private syncTransactionBankMap(transactions: Transaction[]) {
    (transactions || []).forEach(t => {
      if (t?.bankName) {
        this.transactionBankMap.set(t.id, t.bankName);
      }
    });
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

  updateBank(bank: string) {
    this.bankFilter$.next(bank);
  }

  updateMode(mode: string) {
    this.modeFilter$.next(mode);
  }

  updateMonth(month: string) {
    this.monthFilter$.next(month);
  }

  private getCurrentMonth(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private isTransactionInMonth(dateStr: string, monthStr: string): boolean {
    try {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const transactionMonth = `${year}-${month}`;
      return transactionMonth === monthStr;
    } catch (e) {
      return false;
    }
  }

  private getCategoryData(transactions: Transaction[]): { labels: string[], data: number[], colors: string[] } {
    const categoryMap = new Map<string, number>();
    const categoryColors: Record<string, string> = {
      'Food & Grocery': '#10B981',
      'Shopping': '#8B5CF6',
      'Entertainment': '#F59E0B',
      'Transport': '#3B82F6',
      'Bills': '#EF4444',
      'Education': '#EC4899',
      'Home': '#14B8A6',
      'Healthcare': '#F43F5E',
      'Lifestyle': '#06B6D4',
      'Finance': '#8B5CF6',
      'Other': '#64748B'
    };

    transactions.forEach(t => {
      const amount = categoryMap.get(t.category) || 0;
      categoryMap.set(t.category, amount + t.amount);
    });

    const labels = Array.from(categoryMap.keys());
    const data = labels.map(l => parseFloat((categoryMap.get(l) || 0).toFixed(2)));
    const colors = labels.map(l => categoryColors[l] || '#64748B');

    return { labels, data, colors };
  }

  private getModeData(transactions: Transaction[]): { labels: string[], data: number[], colors: string[] } {
    const modeMap = new Map<string, number>();
    const modeColors: Record<string, string> = {
      'UPI': '#3B82F6',
      'Bank': '#10B981',
      'Card': '#F59E0B'
    };

    transactions.forEach(t => {
      const amount = modeMap.get(t.mode) || 0;
      modeMap.set(t.mode, amount + t.amount);
    });

    const labels = Array.from(modeMap.keys());
    const data = labels.map(l => parseFloat((modeMap.get(l) || 0).toFixed(2)));
    const colors = labels.map(l => modeColors[l] || '#64748B');

    return { labels, data, colors };
  }

  private getBankData(transactions: Transaction[]): { labels: string[], data: number[], colors: string[] } {
    const bankMap = new Map<string, number>();
    const bankColors: string[] = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F43F5E'];
    let colorIndex = 0;

    transactions.forEach(t => {
      const bank = this.getTransactionBank(t.id) || 'Unknown';
      const amount = bankMap.get(bank) || 0;
      bankMap.set(bank, amount + t.amount);
    });

    const labels = Array.from(bankMap.keys());
    const data = labels.map(l => parseFloat((bankMap.get(l) || 0).toFixed(2)));
    const colors = labels.map(() => bankColors[colorIndex++ % bankColors.length]);

    return { labels, data, colors };
  }

  getTransactionBank(transactionId: number): string {
    // This will be populated from the transaction service
    // For now, return a placeholder - in a real app, this should come from the backend
    return this.transactionBankMap.get(transactionId) || '';
  }

  editTransaction(transaction: Transaction) {
    this.editingTransactionId = transaction.id;
    this.expenseForm.patchValue({
      amount: transaction.amount,
      category: transaction.category,
      subCategory: transaction.subCategory,
      date: transaction.date,
      mode: transaction.mode,
      bank: this.getTransactionBank(transaction.id) || this.currentBanks[0]?.name || ''
    });
    this.showModal = true;
  }

  deleteTransaction(transaction: Transaction) {
    this.transactionToDelete = transaction;
    this.showDeleteConfirm = true;
  }

  confirmDelete() {
    if (this.transactionToDelete) {
      this.expenseService.deleteTransaction(this.transactionToDelete.id);
    }
    this.cancelDelete();
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
    this.transactionToDelete = null;
  }

  exportCSV(transactions: Transaction[]) {
    if (!transactions.length) {
      this.showToast('No transactions to export', 'warning');
      return;
    }
    const headers = ['Amount', 'Category', 'Merchant', 'Date', 'Mode'];
    const rows = transactions.map(t => [t.amount, t.category, t.subCategory, t.date, t.mode].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'expenses.csv'; a.click();
    URL.revokeObjectURL(url);
    this.showToast('CSV exported successfully!', 'success');
  }

  private async generateChartImage(chartType: 'category' | 'mode' | 'bank' | 'line' | 'bar'): Promise<string> {
    const container = document.createElement('div');
    container.style.width = '600px';
    container.style.height = '350px';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.backgroundColor = 'white';
    document.body.appendChild(container);

    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    let data;
    let chartConfig: any;

    if (chartType === 'category') {
      data = this.getCategoryData(this.currentTransactions);
      chartConfig = {
        type: 'doughnut',
        data: {
          labels: data.labels,
          datasets: [{
            data: data.data,
            backgroundColor: data.colors,
            borderColor: 'white',
            borderWidth: 2
          }]
        }
      };
    } else if (chartType === 'mode') {
      data = this.getModeData(this.currentTransactions);
      chartConfig = {
        type: 'pie',
        data: {
          labels: data.labels,
          datasets: [{
            data: data.data,
            backgroundColor: data.colors,
            borderColor: 'white',
            borderWidth: 2
          }]
        }
      };
    } else if (chartType === 'bank') {
      data = this.getBankData(this.currentTransactions);
      chartConfig = {
        type: 'doughnut',
        data: {
          labels: data.labels,
          datasets: [{
            data: data.data,
            backgroundColor: data.colors,
            borderColor: 'white',
            borderWidth: 2
          }]
        }
      };
    } else if (chartType === 'line') {
      const lineData = this.getTimeSeriesData(this.currentTransactions);
      chartConfig = {
        type: 'line',
        data: {
          labels: lineData.dates,
          datasets: [{
            label: 'Daily Spending',
            data: lineData.amounts,
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: '#3B82F6'
          }]
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'top' as const }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: (value: any) => `₹${value}` }
            }
          }
        }
      };
    } else if (chartType === 'bar') {
      data = this.getCategoryData(this.currentTransactions);
      chartConfig = {
        type: 'bar',
        data: {
          labels: data.labels,
          datasets: [{
            label: 'Amount Spent',
            data: data.data,
            backgroundColor: data.colors,
            borderColor: data.colors.map(() => '#333'),
            borderWidth: 1
          }]
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          indexAxis: 'y' as const,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              ticks: { callback: (value: any) => `₹${value}` }
            }
          }
        }
      };
    }

    const chart = new Chart(canvas, chartConfig);

    await new Promise(resolve => setTimeout(resolve, 800));

    const imgData = canvas.toDataURL('image/png');
    document.body.removeChild(container);
    chart.destroy();

    return imgData;
  }

  private getTimeSeriesData(transactions: Transaction[]): { dates: string[]; amounts: number[] } {
    const dateMap = new Map<string, number>();
    
    transactions.forEach(t => {
      try {
        const date = new Date(t.date);
        const dateStr = date.toLocaleDateString('en-IN');
        const current = dateMap.get(dateStr) || 0;
        dateMap.set(dateStr, current + (parseFloat(String(t.amount)) || 0));
      } catch (e) {
        // Skip invalid dates
      }
    });

    const sortedEntries = Array.from(dateMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

    return {
      dates: sortedEntries.map(e => e[0]),
      amounts: sortedEntries.map(e => parseFloat(e[1].toFixed(2)))
    };
  }

  currentTransactions: Transaction[] = [];

  async exportPDF(transactions: Transaction[]) {
    if (!transactions.length) {
      this.showToast('No transactions to export', 'warning');
      return;
    }

    try {
      this.currentTransactions = transactions;
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 15;
      const imgWidth = 170;
      const imgHeight = 70;

      // Title
      doc.setFontSize(18);
      doc.setTextColor(31, 41, 55);
      doc.text('Transaction Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 12;

      // Report Date and Month Filter
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      const monthValue = (this.monthFilter$ as BehaviorSubject<string>).value || 'All months';
      doc.text(`Generated: ${new Date().toLocaleDateString()} | Period: ${monthValue}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Summary Stats
      const totalAmount = transactions.reduce((sum, t) => sum + (parseFloat(String(t.amount)) || 0), 0);
      const avgAmount = transactions.length > 0 ? (totalAmount / transactions.length) : 0;

      const summaryData = [
        ['Total Transactions', String(transactions.length)],
        ['Total Amount', `₹${totalAmount.toFixed(2)}`],
        ['Average Amount', `₹${avgAmount.toFixed(2)}`]
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [['Metric', 'Value']],
        body: summaryData,
        margin: 12,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 1: { halign: 'right' } }
      });
      yPosition = (doc as any).lastAutoTable?.finalY + 12;

      // Category Breakdown Chart
      const categoryData = this.getCategoryData(transactions);
      if (categoryData.labels.length > 0 && totalAmount > 0) {
        try {
          if (yPosition + imgHeight + 20 > pageHeight) {
            doc.addPage();
            yPosition = 15;
          }

          doc.setFontSize(12);
          doc.setTextColor(31, 41, 55);
          doc.text('Category Breakdown', 12, yPosition);
          yPosition += 8;

          const categoryChart = await this.generateChartImage('category');
          doc.addImage(categoryChart, 'PNG', (pageWidth - imgWidth) / 2, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 12;
        } catch (e) {
          console.warn('Category chart error:', e);
          yPosition += 8;
        }
      }

      // Bar Chart - Category Comparison
      try {
        if (yPosition + imgHeight + 20 > pageHeight) {
          doc.addPage();
          yPosition = 15;
        }

        doc.setFontSize(12);
        doc.setTextColor(31, 41, 55);
        doc.text('Spending by Category (Bar Chart)', 12, yPosition);
        yPosition += 8;

        const barChart = await this.generateChartImage('bar');
        doc.addImage(barChart, 'PNG', (pageWidth - imgWidth) / 2, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 12;
      } catch (e) {
        console.warn('Bar chart error:', e);
        yPosition += 8;
      }

      // Line Chart - Daily Spending Trend
      const timeSeriesData = this.getTimeSeriesData(transactions);
      if (timeSeriesData.dates.length > 1) {
        try {
          if (yPosition + imgHeight + 20 > pageHeight) {
            doc.addPage();
            yPosition = 15;
          }

          doc.setFontSize(12);
          doc.setTextColor(31, 41, 55);
          doc.text('Daily Spending Trend', 12, yPosition);
          yPosition += 8;

          const lineChart = await this.generateChartImage('line');
          doc.addImage(lineChart, 'PNG', (pageWidth - imgWidth) / 2, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 12;
        } catch (e) {
          console.warn('Line chart error:', e);
          yPosition += 8;
        }
      }

      // Payment Mode Chart
      const modeData = this.getModeData(transactions);
      if (modeData.labels.length > 0 && totalAmount > 0) {
        try {
          if (yPosition + imgHeight + 20 > pageHeight) {
            doc.addPage();
            yPosition = 15;
          }

          doc.setFontSize(12);
          doc.setTextColor(31, 41, 55);
          doc.text('Payment Mode Distribution', 12, yPosition);
          yPosition += 8;

          const modeChart = await this.generateChartImage('mode');
          doc.addImage(modeChart, 'PNG', (pageWidth - imgWidth) / 2, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 12;
        } catch (e) {
          console.warn('Mode chart error:', e);
          yPosition += 8;
        }
      }

      // Bank Account Chart
      const bankData = this.getBankData(transactions);
      if (bankData.labels.length > 0 && totalAmount > 0) {
        try {
          if (yPosition + imgHeight + 20 > pageHeight) {
            doc.addPage();
            yPosition = 15;
          }

          doc.setFontSize(12);
          doc.setTextColor(31, 41, 55);
          doc.text('Bank Account Distribution', 12, yPosition);
          yPosition += 8;

          const bankChart = await this.generateChartImage('bank');
          doc.addImage(bankChart, 'PNG', (pageWidth - imgWidth) / 2, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 12;
        } catch (e) {
          console.warn('Bank chart error:', e);
          yPosition += 8;
        }
      }

      // Category Details Table
      if (yPosition + 40 > pageHeight) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFontSize(12);
      doc.setTextColor(31, 41, 55);
      doc.text('Category Details', 12, yPosition);
      yPosition += 8;

      const categoryTableData = categoryData.labels.map((label, idx) => [
        label.substring(0, 20),
        `₹${(categoryData.data[idx] || 0).toFixed(2)}`,
        `${((categoryData.data[idx] / totalAmount) * 100).toFixed(1)}%`
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Category', 'Amount', '%']],
        body: categoryTableData,
        margin: 12,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } }
      });
      yPosition = (doc as any).lastAutoTable?.finalY + 10;

      // Payment Mode Details Table
      if (yPosition + 40 > pageHeight) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFontSize(12);
      doc.setTextColor(31, 41, 55);
      doc.text('Payment Mode Details', 12, yPosition);
      yPosition += 8;

      const modeTableData = modeData.labels.map((label, idx) => [
        label,
        `₹${(modeData.data[idx] || 0).toFixed(2)}`,
        `${((modeData.data[idx] / totalAmount) * 100).toFixed(1)}%`
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Payment Mode', 'Amount', '%']],
        body: modeTableData,
        margin: 12,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } }
      });
      yPosition = (doc as any).lastAutoTable?.finalY + 10;

      // Bank Details Table
      if (yPosition + 40 > pageHeight) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFontSize(12);
      doc.setTextColor(31, 41, 55);
      doc.text('Bank Account Details', 12, yPosition);
      yPosition += 8;

      const bankTableData = bankData.labels.map((label, idx) => [
        label.substring(0, 15),
        `₹${(bankData.data[idx] || 0).toFixed(2)}`,
        `${((bankData.data[idx] / totalAmount) * 100).toFixed(1)}%`
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Bank', 'Amount', '%']],
        body: bankTableData,
        margin: 12,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } }
      });
      yPosition = (doc as any).lastAutoTable?.finalY + 10;

      // Transaction Details
      if (yPosition + 40 > pageHeight) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFontSize(12);
      doc.setTextColor(31, 41, 55);
      doc.text('Recent Transactions', 12, yPosition);
      yPosition += 8;

      const transactionTableData = transactions.slice(0, 50).map(t => {
        try {
          const dateStr = t.date ? new Date(t.date).toLocaleDateString('en-IN') : 'N/A';
          return [
            dateStr,
            (t.category || 'N/A').substring(0, 12),
            (t.subCategory || 'N/A').substring(0, 10),
            `₹${(parseFloat(String(t.amount)) || 0).toFixed(2)}`,
            (t.mode || 'N/A').substring(0, 8)
          ];
        } catch (e) {
          return [t.date || 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'];
        }
      });

      autoTable(doc, {
        startY: yPosition,
        head: [['Date', 'Category', 'Desc', 'Amount', 'Mode']],
        body: transactionTableData,
        margin: 12,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 3: { halign: 'right' } },
        pageBreak: 'auto'
      });

      // Add page numbers
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
      }

      // Save PDF
      const fileName = `expenses_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      this.showToast('PDF exported successfully!', 'success');
    } catch (error) {
      console.error('PDF Export Error:', error);
      this.showToast('Error exporting PDF. Please try again.', 'danger');
    }
  }

  exportXLSX(transactions: Transaction[]) {
    if (!transactions.length) {
      this.showToast('No transactions to export', 'warning');
      return;
    }

    try {
      // Prepare transaction data
      const transactionData = transactions.map(t => ({
        'Date': t.date ? new Date(t.date).toLocaleDateString('en-IN') : 'N/A',
        'Category': t.category || 'N/A',
        'Merchant': t.subCategory || 'N/A',
        'Amount': parseFloat(String(t.amount)) || 0,
        'Mode': t.mode || 'N/A',
        'Bank': this.getTransactionBank(t.id) || 'N/A'
      }));

      // Summary stats
      const totalAmount = transactions.reduce((sum, t) => sum + (parseFloat(String(t.amount)) || 0), 0);
      const avgAmount = transactions.length > 0 ? (totalAmount / transactions.length) : 0;

      const summaryData = [
        { 'Metric': 'Total Transactions', 'Value': transactions.length },
        { 'Metric': 'Total Amount', 'Value': totalAmount.toFixed(2) },
        { 'Metric': 'Average Amount', 'Value': avgAmount.toFixed(2) }
      ];

      // Category breakdown
      const categoryData = this.getCategoryData(transactions);
      const categoryBreakdown = categoryData.labels.map((label, idx) => ({
        'Category': label,
        'Amount': categoryData.data[idx].toFixed(2),
        'Percentage': ((categoryData.data[idx] / totalAmount) * 100).toFixed(1) + '%'
      }));

      // Payment mode breakdown
      const modeData = this.getModeData(transactions);
      const modeBreakdown = modeData.labels.map((label, idx) => ({
        'Payment Mode': label,
        'Amount': modeData.data[idx].toFixed(2),
        'Percentage': ((modeData.data[idx] / totalAmount) * 100).toFixed(1) + '%'
      }));

      // Bank breakdown
      const bankData = this.getBankData(transactions);
      const bankBreakdown = bankData.labels.map((label, idx) => ({
        'Bank': label,
        'Amount': bankData.data[idx].toFixed(2),
        'Percentage': ((bankData.data[idx] / totalAmount) * 100).toFixed(1) + '%'
      }));

      // Create workbook with multiple sheets
      const workbook = XLSX.utils.book_new();

      // Add sheets
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryData), 'Summary');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(transactionData), 'Transactions');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(categoryBreakdown), 'Category Breakdown');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(modeBreakdown), 'Payment Mode');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(bankBreakdown), 'Bank Details');

      // Generate filename with date
      const fileName = `expenses_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Write file
      XLSX.writeFile(workbook, fileName);
      this.showToast('XLSX exported successfully!', 'success');
    } catch (error) {
      console.error('XLSX Export Error:', error);
      this.showToast('Error exporting XLSX. Please try again.', 'danger');
    }
  }

  showToast(message: string, type: 'success' | 'warning' | 'danger' = 'success') {
    this.toast = { show: true, message, type };
    setTimeout(() => this.toast.show = false, 3500);
  }

  private initForm() {
    this.expenseForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(1)]],
      category: ['Food & Grocery', Validators.required],
      subCategory: ['', Validators.required],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      mode: ['UPI', Validators.required],
      bank: ['']
    });
  }

  toggleModal() {
    this.showModal = !this.showModal;
    this.editingTransactionId = null;
    this.banks$.pipe(take(1)).subscribe(banks => {
      const firstBank = banks[0]?.name || '';
      if (!this.showModal) {
        this.expenseForm.reset({
          category: 'Food & Grocery',
          date: new Date().toISOString().split('T')[0],
          mode: 'UPI',
          bank: firstBank
        });
        this.editingTransactionId = null;
      } else if (firstBank) {
        this.expenseForm.patchValue({ bank: firstBank });
      }
    });
  }

  onSubmit() {
    if (this.currentBanks.length === 0) {
      alert('Please add at least one bank account first.');
      return;
    }

    if (this.expenseForm.valid) {
      const formValue = this.expenseForm.value;
      const { bank, ...transactionData } = formValue;
      
      if (this.editingTransactionId) {
        // Update existing transaction
        this.expenseService.updateTransaction(this.editingTransactionId, transactionData);
        this.transactionBankMap.set(this.editingTransactionId, bank);
      } else {
        // Add new transaction
        this.expenseService.addTransaction(transactionData, bank);
      }
      
      this.toggleModal();
    }
  }
}
