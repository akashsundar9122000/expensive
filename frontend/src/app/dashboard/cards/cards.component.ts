import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ExpenseService } from '../../services/expense.service';
import { User, DashboardStats } from '../../services/models';
import { Observable } from 'rxjs';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  template: `

    <main class="dashboard-layout" *ngIf="{
      user: user$ | async,
      stats: stats$ | async
    } as data">
      <app-sidebar [isMobileOpen]="isMobileMenuOpen" (closeMobile)="isMobileMenuOpen = false"></app-sidebar>

      <div class="main-content">
        <header class="top-header">
          <div class="header-left">
            <button class="menu-trigger" (click)="isMobileMenuOpen = !isMobileMenuOpen">
                <i class="ph ph-list"></i>
            </button>
            <h1>My Cards & Banks</h1>
            <p>Manage your linked bank accounts and cards</p>
          </div>
          <div class="header-right">
            <button class="primary-btn" (click)="showAddBankModal = true">
              <i class="ph ph-plus"></i> <span class="btn-label">Add Bank Account</span>
            </button>
            <div class="fallback-header-avatar">
              <i class="ph ph-user"></i>
            </div>
          </div>
        </header>

        <div class="dashboard-body">
          <!-- Virtual Card -->
          <div class="section-title">Virtual Card</div>
          <div class="premium-card">
            <div class="card-top">
              <div class="card-chip"></div>
              <div class="contactless"><i class="ph ph-contactless-payment"></i></div>
            </div>
            <div class="card-number">**** **** **** 4589</div>
            <div class="card-details">
              <div class="detail">
                <span class="label">Card Holder</span>
                <span class="value">{{ data.user?.name || 'User' }}</span>
              </div>
              <div class="detail">
                <span class="label">Expires</span>
                <span class="value">12/28</span>
              </div>
            </div>
            <div class="card-type">VISA</div>
          </div>

          <!-- Bank Accounts -->
          <div class="section-title" style="margin-top: 40px;">Linked Bank Accounts</div>
          <div class="banks-grid" *ngIf="data.user?.bankAccounts?.length; else noBanks">
            <div class="bank-card" *ngFor="let bank of data.user?.bankAccounts; let i = index"
              [style.background]="bankGradients[i % bankGradients.length]">
              <div class="bank-card-header">
                <i class="ph ph-bank bank-icon"></i>
                <span class="bank-name">{{ bank }}</span>
              </div>
              <div class="bank-balance">
                ₹{{ data.stats?.bankBalances?.[bank] | number:'1.2-2' }}
              </div>
              <div class="bank-card-footer">
                <span>Available Balance</span>
              </div>
            </div>

            <!-- Add Bank Placeholder -->
            <div class="bank-card add-bank-card" (click)="showAddBankModal = true">
              <i class="ph ph-plus-circle add-icon"></i>
              <p>Add Bank Account</p>
            </div>
          </div>

          <ng-template #noBanks>
            <div class="empty-state">
              <i class="ph ph-bank"></i>
              <p>No bank accounts linked yet.</p>
              <button (click)="showAddBankModal = true" class="primary-btn" style="display: inline-flex; margin-top: 16px;">Add Your First Bank</button>
            </div>
          </ng-template>

          <!-- Card Controls -->
          <div class="card controls-card">
            <h3>Card Controls</h3>
            <div class="control-item">
              <div class="control-info">
                <i class="ph ph-contactless-payment"></i>
                <span>Contactless Payment</span>
              </div>
              <div class="toggle active"></div>
            </div>
            <div class="control-item">
              <div class="control-info">
                <i class="ph ph-globe"></i>
                <span>Online Transaction</span>
              </div>
              <div class="toggle active"></div>
            </div>
            <div class="control-item">
              <div class="control-info">
                <i class="ph ph-airplane"></i>
                <span>International Usage</span>
              </div>
              <div class="toggle"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Bank Modal (Copy of Dashboard styles/structure for consistency) -->
      <div class="modal-overlay" *ngIf="showAddBankModal" (click)="showAddBankModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
                <h3>Add Bank Account</h3>
                <button class="close-btn" (click)="showAddBankModal = false"><i class="ph ph-x"></i></button>
            </div>
            <div class="modal-body">
                <form class="modal-form" (submit)="onAddBank(newBankName.value, +newBankBalance.value); $event.preventDefault()">
                    <div class="form-group">
                        <label>Bank Name</label>
                        <input type="text" #newBankName placeholder="e.g. HDFC Bank, ICICI Bank">
                    </div>
                  <div class="form-group">
                    <label>Opening Balance (₹)</label>
                    <input type="number" #newBankBalance placeholder="e.g. 25000" step="0.01">
                  </div>
                    <div class="modal-actions">
                        <button type="button" class="outline-btn" (click)="showAddBankModal = false">Cancel</button>
                        <button type="submit" class="primary-btn">Add Bank</button>
                    </div>
                </form>
            </div>
        </div>
      </div>
    </main>
  `,

  styles: [`
    .section-title { font-size: 18px; font-weight: 700; color: var(--text-dark); margin-bottom: 20px; }

    .premium-card {
      width: 100%; max-width: 420px; height: 250px;
      background: linear-gradient(135deg, #1e293b, #0f172a, #312e81);
      border-radius: 24px; padding: 36px; color: white;
      display: flex; flex-direction: column; justify-content: space-between;
      position: relative;
      box-shadow: 0 20px 50px rgba(0,0,0,0.3);
      transition: transform var(--transition-normal);
    }
    .premium-card:hover { transform: translateY(-4px); }
    .card-top { display: flex; justify-content: space-between; align-items: center; }
    .card-chip { width: 50px; height: 38px; background: linear-gradient(135deg, #fbbf24, #f59e0b); border-radius: 8px; }
    .contactless { font-size: 24px; opacity: 0.5; }
    .card-number { font-size: 20px; letter-spacing: 2px; font-weight: 500; font-family: 'Courier New', monospace; margin: 20px 0; }
    .card-details { display: flex; gap: 20px; flex-wrap: wrap; }
    .detail { display: flex; flex-direction: column; gap: 4px; }
    .detail .label { font-size: 10px; opacity: 0.5; text-transform: uppercase; letter-spacing: 1px; }
    .detail .value { font-size: 12px; font-weight: 600; }
    .card-type { position: absolute; right: 28px; bottom: 28px; font-size: 20px; font-weight: 800; font-style: italic; opacity: 0.4; }

    .banks-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .bank-card { border-radius: 20px; padding: 28px; color: white; min-height: 160px; display: flex; flex-direction: column; justify-content: space-between; cursor: pointer; transition: transform var(--transition-fast); }
    .bank-card:hover { transform: translateY(-3px); }
    .bank-card-header { display: flex; align-items: center; gap: 12px; }
    .bank-icon { font-size: 28px; opacity: 0.9; }
    .bank-name { font-size: 18px; font-weight: 700; }
    .bank-balance { font-size: 28px; font-weight: 800; }
    .bank-card-footer { font-size: 12px; opacity: 0.7; font-weight: 500; }
    .add-bank-card { background: var(--bg-card) !important; color: var(--text-muted) !important; border: 2px dashed var(--border-light); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
    .add-icon { font-size: 40px; color: var(--primary-blue); }
    .add-bank-card p { font-weight: 600; font-size: 14px; }

    .controls-card { margin-top: 40px; padding: 28px; }
    .controls-card h3 { margin-bottom: 20px; }
    .control-item { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid var(--border-light); }
    .control-info { display: flex; align-items: center; gap: 12px; font-weight: 500; color: var(--text-dark); }
    .control-info i { font-size: 20px; color: var(--text-muted); }

    .menu-trigger {
        background: none;
        border: none;
        color: var(--text-main);
        font-size: 24px;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    @media (max-width: 900px) {
        .banks-grid {
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        }
        .premium-card {
            max-width: 100%;
        }
    }

    @media (max-width: 768px) {
        .premium-card {
            padding: 24px;
            height: 220px;
        }
        .card-number {
            font-size: 18px;
        }
        .banks-grid {
            grid-template-columns: 1fr;
        }
    }
  `]

})
export class CardsComponent implements OnInit {
  user$!: Observable<User | null>;
  stats$!: Observable<DashboardStats>;
  isMobileMenuOpen = false;
  showAddBankModal = false;

  bankGradients = [
    'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #ef4444, #b91c1c)',
    'linear-gradient(135deg, #06b6d4, #0284c7)',
  ];

  constructor(private expenseService: ExpenseService) { }

  ngOnInit() {
    this.user$ = this.expenseService.getUser();
    this.stats$ = this.expenseService.getStats();
  }

  onAddBank(name: string, balance?: number) {
    if (!name) return;
    const normalizedBalance = Number.isFinite(balance as number) ? Number(balance) : 0;
    this.expenseService.addBank(name, normalizedBalance);
    this.showAddBankModal = false;
  }
}

