import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseService } from '../../services/expense.service';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { User, DashboardStats } from '../../services/models';
import { Observable } from 'rxjs';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  template: `
    <main class="dashboard-layout" *ngIf="user$ | async as user">
      <app-sidebar></app-sidebar>

      <div class="main-content">
        <header class="top-header">
          <div class="header-left">
            <h1>Settings</h1>
            <p>Manage your account preferences</p>
          </div>
        </header>

        <div class="dashboard-body">
          <div class="settings-grid">
            <div class="card profile-card">
              <div class="profile-preview">
                <div class="avatar-container">
                  <img *ngIf="user.avatar; else fallbackAvatar" [src]="user.avatar" alt="Avatar">
                  <ng-template #fallbackAvatar>
                    <div class="fallback-avatar">
                      <i class="ph ph-user"></i>
                    </div>
                  </ng-template>
                </div>
                <h3>{{ user.name }}</h3>
                <p>{{ user.email }}</p>
              </div>

              <div class="profile-actions">
                <label>Profile Picture URL</label>
                <div class="input-group">
                  <input type="text" [(ngModel)]="avatarUrl" placeholder="https://image.url">
                  <button class="primary-btn" (click)="updateAvatar()">Update</button>
                </div>
              </div>
            </div>

            <div class="card settings-list">
              <div class="bank-management">
                <h3>Bank Accounts</h3>
                <p class="sub-text">Add your bank accounts to track balances</p>
                
                <div class="bank-list">
                  <div class="bank-item" *ngFor="let bank of user.bankAccounts">
                    <div class="bank-info">
                       <i class="ph ph-bank"></i>
                       <span>{{ bank }}</span>
                    </div>
                    <span class="bank-balance-text">₹{{ (stats$ | async)?.bankBalances?.[bank] || 0 | number }}</span>
                  </div>
                  <p *ngIf="user.bankAccounts.length === 0" class="no-banks">No bank accounts added.</p>
                </div>

                <div class="input-group">
                  <input type="text" [(ngModel)]="newBankName" placeholder="Bank Name (e.g. HDFC)">
                  <button class="outline-btn" (click)="addBank()" [disabled]="!newBankName">Add Bank</button>
                </div>
              </div>

              <hr class="divider">

              <h3>Preferences</h3>

              <div class="setting-item">
                <div class="setting-info">
                  <i class="ph ph-moon"></i>
                  <div>
                    <h4>Dark Mode</h4>
                    <p>Switch between light and dark themes</p>
                  </div>
                </div>
                <div class="toggle" [class.active]="themeService.isDarkMode$ | async" (click)="themeService.toggle()"></div>
              </div>

              <div class="setting-item">
                <div class="setting-info">
                  <i class="ph ph-bell"></i>
                  <div>
                    <h4>Push Notifications</h4>
                    <p>Receive alerts for new transactions</p>
                  </div>
                </div>
                <div class="toggle active"></div>
              </div>

              <div class="setting-item">
                <div class="setting-info">
                  <i class="ph ph-currency-circle-dollar"></i>
                  <div>
                    <h4>Currency</h4>
                    <p>Display currency preference</p>
                  </div>
                </div>
                <span class="currency-display">₹ INR</span>
              </div>
              
              <button class="danger-btn" style="width: 100%; margin-top: 32px;" (click)="logout()">
                <i class="ph ph-sign-out"></i> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  `,
  styles: [`
    .settings-grid { display: grid; grid-template-columns: 340px 1fr; gap: 32px; }
    .profile-card { padding: 36px; text-align: center; }
    .avatar-container { margin-bottom: 20px; display: flex; justify-content: center; }
    .avatar-container img, .fallback-avatar { 
      width: 100px; height: 100px; border-radius: 50%; 
      border: 4px solid var(--primary-blue-light); object-fit: cover;
    }
    .fallback-avatar { 
       background: var(--bg-chip); color: var(--text-muted);
       display: flex; align-items: center; justify-content: center; font-size: 40px;
    }
    .profile-preview h3 { margin-bottom: 4px; }
    .profile-preview p { color: var(--text-muted); font-size: 13px; }

    .profile-actions { text-align: left; margin-top: 24px; }
    .profile-actions label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 8px; color: var(--text-muted); }

    .settings-list { padding: 36px; }
    .sub-text { color: var(--text-muted); font-size: 13px; margin-top: 4px; }
    .bank-list { margin: 20px 0; }
    .bank-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: var(--bg-hover); border-radius: 12px; margin-bottom: 8px; }
    .bank-info { display: flex; align-items: center; gap: 12px; font-weight: 500; color: var(--text-dark); }
    .bank-info i { font-size: 20px; color: var(--primary-blue); }
    .bank-balance-text { font-weight: 600; color: var(--text-dark); }
    .no-banks { color: var(--text-muted); font-size: 13px; }

    .divider { margin: 32px 0; border: none; border-top: 1px solid var(--border-light); }

    .setting-item { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid var(--border-light); }
    .setting-info { display: flex; align-items: center; gap: 16px; }
    .setting-info > i { font-size: 22px; color: var(--text-muted); }
    .setting-info h4 { margin-bottom: 2px; font-size: 14px; }
    .setting-info p { font-size: 12px; color: var(--text-muted); }
    .currency-display { font-weight: 700; color: var(--text-dark); font-size: 14px; }

    .danger-btn { display: flex; align-items: center; justify-content: center; gap: 8px; }

    @media (max-width: 900px) {
      .settings-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class SettingsComponent implements OnInit {
  user$!: Observable<User | null>;
  stats$!: Observable<DashboardStats>;
  avatarUrl: string = '';
  newBankName: string = '';

  constructor(
    private expenseService: ExpenseService,
    private authService: AuthService,
    public themeService: ThemeService
  ) { }

  ngOnInit() {
    this.user$ = this.expenseService.getUser();
    this.stats$ = this.expenseService.getStats();
    this.user$.subscribe(user => {
      if (user) this.avatarUrl = user.avatar || '';
    });
  }

  updateAvatar() {
    this.authService.updateUserInfo({ avatar: this.avatarUrl });
  }

  addBank() {
    if (this.newBankName.trim()) {
      this.expenseService.addBank(this.newBankName.trim());
      this.newBankName = '';
    }
  }

  logout() {
    this.authService.logout();
  }
}
