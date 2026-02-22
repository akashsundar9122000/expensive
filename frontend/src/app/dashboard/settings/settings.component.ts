import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseService } from '../../services/expense.service';
import { AuthService } from '../../services/auth.service';
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

              <div class="profile-actions" style="margin-top: 24px;">
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
                <p class="sub-text">Add your bank accounts to track local balances</p>
                
                <div class="bank-list" style="margin: 24px 0;">
                  <div class="bank-item" *ngFor="let bank of user.bankAccounts">
                    <div class="bank-info">
                       <i class="ph ph-bank"></i>
                       <span>{{ bank }}</span>
                    </div>
                    <span>₹{{ (stats$ | async)?.bankBalances?.[bank] || 0 | number }}</span>
                  </div>
                  <p *ngIf="user.bankAccounts.length === 0" style="color: var(--text-muted);">No bank accounts added.</p>
                </div>

                <div class="input-group">
                  <input type="text" [(ngModel)]="newBankName" placeholder="Bank Name (e.g. HDFC)">
                  <button class="outline-btn" (click)="addBank()" [disabled]="!newBankName">Add Bank</button>
                </div>
              </div>

              <hr style="margin: 40px 0; border: none; border-top: 1px solid var(--border-light);">

              <div class="setting-item">
                <div class="setting-info">
                  <h4>Push Notifications</h4>
                  <p>Receive alerts for new transactions</p>
                </div>
                <div class="toggle active"></div>
              </div>
              
              <button class="danger-btn" (click)="logout()">Sign Out</button>
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
    .dashboard-body { padding: 40px; }

    .settings-grid { display: grid; grid-template-columns: 350px 1fr; gap: 40px; }
    .profile-card { padding: 40px; text-align: center; }
    .avatar-container { margin-bottom: 24px; display: flex; justify-content: center; }
    .avatar-container img, .fallback-avatar { 
      width: 120px; height: 120px; border-radius: 50%; 
      border: 4px solid var(--primary-blue-light); object-fit: cover;
    }
    .fallback-avatar { 
       background: #F1F5F9; color: #64748B;
       display: flex; align-items: center; justify-content: center; font-size: 48px;
    }
    .profile-preview h3 { margin-bottom: 8px; }
    .profile-preview p { color: var(--text-muted); }

    .profile-actions { text-align: left; }
    .profile-actions label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 8px; color: var(--text-muted); }

    .settings-list { padding: 40px; }
    .bank-item { display: flex; justify-content: space-between; padding: 12px; background: #F8FAFC; border-radius: 12px; margin-bottom: 8px; }
    .bank-info { display: flex; align-items: center; gap: 12px; font-weight: 500; }
    .bank-info i { font-size: 20px; color: var(--primary-blue); }

    .input-group { display: flex; gap: 12px; }
    .input-group input { flex: 1; padding: 12px; border: 1px solid var(--border-light); border-radius: 12px; outline: none; }

    .setting-item { display: flex; justify-content: space-between; align-items: center; padding: 24px 0; border-bottom: 1px solid var(--border-light); }
    .setting-info h4 { margin-bottom: 4px; }
    .setting-info p { font-size: 14px; color: var(--text-muted); }

    .toggle { width: 44px; height: 24px; background: #e2e8f0; border-radius: 12px; position: relative; cursor: pointer; }
    .toggle::after { content: ""; position: absolute; width: 18px; height: 18px; background: white; border-radius: 50%; top: 3px; left: 3px; transition: all 0.2s; }
    .toggle.active { background: var(--primary-blue); }
    .toggle.active::after { left: 23px; }

    .danger-btn { margin-top: 40px; padding: 12px 24px; border: 1px solid var(--danger-red); color: var(--danger-red); border-radius: 12px; background: none; cursor: pointer; font-weight: 600; width: 100%; }
    .danger-btn:hover { background: #FEF2F2; }
  `]
})
export class SettingsComponent implements OnInit {
  user$!: Observable<User | null>;
  stats$!: Observable<DashboardStats>;
  avatarUrl: string = '';
  newBankName: string = '';

  constructor(
    private expenseService: ExpenseService,
    private authService: AuthService
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
