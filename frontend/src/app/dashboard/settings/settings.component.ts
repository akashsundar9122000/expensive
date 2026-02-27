import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseService } from '../../services/expense.service';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { User, Bank } from '../../services/models';
import { Observable } from 'rxjs';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { FormsModule } from '@angular/forms';
import { DeleteConfirmModalComponent } from '../../shared/delete-confirm-modal/delete-confirm-modal.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule, DeleteConfirmModalComponent],
  template: `
    <main class="dashboard-layout">
      <app-sidebar [isMobileOpen]="isMobileMenuOpen" (closeMobile)="isMobileMenuOpen = false"></app-sidebar>

      <div class="main-content">
        <header class="top-header">
          <div class="header-left">
            <button class="menu-trigger" (click)="isMobileMenuOpen = !isMobileMenuOpen">
              <i class="ph ph-list"></i>
            </button>
            <h1>Settings</h1>
            <p>Manage your account preferences</p>
          </div>
        </header>

        <div class="dashboard-body">
          <div class="settings-grid">
            <div class="card profile-card">
              <div class="profile-preview">
                <div class="avatar-container">
                  <img *ngIf="(user$ | async)?.avatar; else fallbackAvatar" [src]="(user$ | async)?.avatar" alt="Avatar">
                  <ng-template #fallbackAvatar>
                    <div class="fallback-avatar">
                      <i class="ph ph-user"></i>
                    </div>
                  </ng-template>
                </div>
                <h3>{{ (user$ | async)?.name || 'User' }}</h3>
                <p>{{ (user$ | async)?.email || '' }}</p>
              </div>

              <div class="profile-actions">
                <div class="form-group" style="margin-bottom: 24px;">
                    <label>Display Name</label>
                    <div class="input-group">
                        <input type="text" [(ngModel)]="newUserName" placeholder="Your Name">
                        <button class="primary-btn" (click)="updateName()">Update</button>
                    </div>
                </div>

                <label>Select Avatar</label>
                <div class="avatar-grid">
                    <div class="avatar-option" *ngFor="let av of avatars"
                         [class.selected]="(user$ | async)?.avatar === av"
                         (click)="selectAvatar(av)">
                        <img [src]="av" alt="Avatar">
                    </div>
                </div>

                <div class="form-group" style="margin-top: 24px;">
                    <label>Custom Avatar URL</label>
                    <div class="input-group">
                      <input type="text" [(ngModel)]="avatarUrl" placeholder="https://image.url">
                      <button class="outline-btn" (click)="updateAvatar()">Set</button>
                    </div>
                </div>
              </div>
            </div>


            <div class="card settings-list">
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

              <div class="setting-item danger-setting">
                <div class="setting-info">
                  <i class="ph ph-warning-circle"></i>
                  <div>
                    <h4>Delete Account</h4>
                    <p>Permanently remove your account and all your data</p>
                  </div>
                </div>
                <button class="danger-outline-btn" (click)="openDeleteAccountModal()">
                  <i class="ph ph-trash"></i> Delete
                </button>
              </div>

              <button class="danger-btn" style="width: 100%; margin-top: 32px;" (click)="logout()">
                <i class="ph ph-sign-out"></i> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <app-delete-confirm-modal
      [visible]="showDeleteConfirm"
      [title]="'Delete Bank?'"
      [message]="'Are you sure you want to delete ' + (bankToDelete?.name || 'this bank') + '?'"
      [confirmText]="'Delete Bank'"
      [errorMessage]="deleteBankError"
      (closed)="cancelDelete()"
      (confirmed)="confirmDelete()">
    </app-delete-confirm-modal>

    <div class="confirm-overlay" *ngIf="showDeleteAccountConfirm" (click)="cancelDeleteAccount()">
      <div class="confirm-card" (click)="$event.stopPropagation()">
        <div class="confirm-icon-wrap">
          <i class="ph ph-user-minus"></i>
        </div>
        <h3 class="confirm-title">Delete Your Account?</h3>
        <p class="confirm-msg">
          Enter your current password to confirm account deletion. This action cannot be undone.
        </p>
        <div class="confirm-form">
          <div class="confirm-password-wrap">
            <input
              [type]="showDeleteAccountPassword ? 'text' : 'password'"
              class="confirm-password-input"
              [(ngModel)]="deleteAccountPassword"
              placeholder="Current password"
              (keyup.enter)="confirmDeleteAccount()">
            <button type="button" class="confirm-password-toggle" (click)="showDeleteAccountPassword = !showDeleteAccountPassword">
              <i class="ph" [ngClass]="showDeleteAccountPassword ? 'ph-eye-slash' : 'ph-eye'"></i>
            </button>
          </div>
          <p class="confirm-error" *ngIf="deleteAccountError">{{ deleteAccountError }}</p>
        </div>
        <div class="confirm-actions">
          <button class="cancel-action-btn" (click)="cancelDeleteAccount()">Cancel</button>
          <button class="delete-action-btn" (click)="confirmDeleteAccount()" [disabled]="isDeletingAccount">
            <i class="ph ph-trash"></i> {{ isDeletingAccount ? 'Deleting...' : 'Delete Account' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 24px; }
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

    .avatar-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 8px; }
    .avatar-option {
        width: 100%; aspect-ratio: 1; border-radius: 12px; overflow: hidden;
        cursor: pointer; border: 2px solid transparent; transition: all 0.2s;
        background: var(--bg-chip);
    }
    .avatar-option:hover { transform: scale(1.05); }
    .avatar-option.selected { border-color: var(--primary-blue); }
    .avatar-option img { width: 100%; height: 100%; object-fit: cover; }

    .settings-list { padding: 36px; }
    .sub-text { color: var(--text-muted); font-size: 13px; margin-top: 4px; }
    .bank-list { margin: 16px 0 0; display: flex; flex-direction: column; gap: 8px; }

    .bank-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 14px; background: var(--bg-hover); border-radius: 12px;
    }
    .bank-info { display: flex; align-items: center; gap: 12px; }
    .bank-info > i { font-size: 20px; color: var(--primary-blue); flex-shrink: 0; }
    .bank-name { display: block; font-weight: 500; color: var(--text-dark); font-size: 14px; }
    .bank-balance { display: block; font-size: 12px; color: var(--text-muted); margin-top: 2px; }

    .bank-actions { display: flex; gap: 6px; }
    .icon-btn {
      width: 32px; height: 32px; border-radius: 8px; border: none;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; font-size: 16px; transition: background 0.15s;
    }
    .edit-btn { background: var(--bg-chip); color: var(--text-muted); }
    .edit-btn:hover { background: var(--primary-blue-light); color: var(--primary-blue); }
    .delete-btn { background: var(--bg-chip); color: var(--text-muted); }
    .delete-btn:hover { background: #fee2e2; color: #ef4444; }
    .save-btn { background: var(--primary-blue-light); color: var(--primary-blue); }
    .save-btn:hover { background: var(--primary-blue); color: #fff; }
    .cancel-btn { background: var(--bg-chip); color: var(--text-muted); }
    .cancel-btn:hover { background: var(--bg-hover); color: var(--text-dark); }

    .bank-edit-input {
      flex: 1; padding: 6px 10px; border-radius: 8px;
      border: 1.5px solid var(--primary-blue); background: var(--bg-main);
      color: var(--text-dark); font-size: 14px; outline: none;
      margin-right: 8px;
    }
    .bank-edit-row { display: flex; align-items: center; gap: 8px; flex: 1; }
    .bank-edit-balance { max-width: 140px; }
    .bank-add-group input[type="number"] { max-width: 160px; }

    .no-banks { color: var(--text-muted); font-size: 13px; padding: 8px 0; }

    .divider { margin: 32px 0; border: none; border-top: 1px solid var(--border-light); }

    .setting-item { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid var(--border-light); }
    .setting-info { display: flex; align-items: center; gap: 16px; }
    .setting-info > i { font-size: 22px; color: var(--text-muted); }
    .setting-info h4 { margin-bottom: 2px; font-size: 14px; }
    .setting-info p { font-size: 12px; color: var(--text-muted); }
    .currency-display { font-weight: 700; color: var(--text-dark); font-size: 14px; }
    .danger-setting .setting-info > i { color: var(--danger-red); }

    .danger-outline-btn {
      display: inline-flex; align-items: center; gap: 6px;
      border: 1.5px solid var(--danger-red);
      color: var(--danger-red);
      background: transparent;
      border-radius: 10px;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .danger-outline-btn:hover { background: var(--bg-hover); }

    .danger-btn { display: flex; align-items: center; justify-content: center; gap: 8px; }

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
      margin-bottom: 18px;
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
      color: var(--text-muted);
    }

    @media (max-width: 900px) {
      .settings-grid { grid-template-columns: 1fr; }
    }

    /* Delete Confirmation Modal */
    .confirm-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.45); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .confirm-card {
      background: var(--bg-card); border-radius: 24px;
      padding: 36px 32px; width: 380px; max-width: 92%;
      box-shadow: 0 24px 64px rgba(0,0,0,0.18);
      text-align: center;
      animation: scaleIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes scaleIn { from { opacity:0; transform: scale(0.88); } to { opacity:1; transform: scale(1); } }

    .confirm-icon-wrap {
      width: 64px; height: 64px; border-radius: 50%;
      background: rgba(239,68,68,0.1); color: #ef4444;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px; margin: 0 auto 20px;
    }

    .confirm-title {
      font-size: 18px; font-weight: 700;
      color: var(--text-dark); margin-bottom: 12px;
    }

    .confirm-msg {
      font-size: 14px; color: var(--text-muted);
      line-height: 1.6; margin-bottom: 28px;
    }
    .confirm-msg strong { color: var(--text-dark); }

    .confirm-form {
      margin-bottom: 18px;
      text-align: left;
    }

    .confirm-password-input {
      width: 100%;
      padding: 10px 44px 10px 12px;
      border-radius: 10px;
      border: 1.5px solid var(--border-light);
      background: var(--bg-main);
      color: var(--text-dark);
      outline: none;
      font-size: 14px;
    }
    .confirm-password-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .confirm-password-toggle {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      cursor: pointer;
    }
    .confirm-password-toggle:hover { color: var(--primary-blue); }
    .confirm-password-input:focus {
      border-color: var(--primary-blue);
      box-shadow: 0 0 0 2px var(--primary-blue-light);
    }

    .confirm-error {
      margin: 8px 2px 0;
      font-size: 12px;
      color: var(--danger-red);
    }

    .confirm-actions {
      display: flex; gap: 12px;
    }
    .cancel-action-btn {
      flex: 1; padding: 12px; border-radius: 12px;
      border: 1.5px solid var(--border-light);
      background: var(--bg-chip); color: var(--text-dark);
      font-size: 14px; font-weight: 600; cursor: pointer;
      transition: all 0.15s;
    }
    .cancel-action-btn:hover { background: var(--bg-hover); }

    .delete-action-btn {
      flex: 1; padding: 12px; border-radius: 12px; border: none;
      background: #ef4444; color: #fff;
      font-size: 14px; font-weight: 600; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      transition: background 0.15s;
    }
    .delete-action-btn:hover { background: #dc2626; }

    @media (max-width: 768px) {
        .menu-trigger {
            display: flex !important;
        }

        .profile-card, .settings-list {
            padding: 24px;
        }

        .avatar-grid {
            grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
        }
    }
  `]

})
export class SettingsComponent implements OnInit {
  user$!: Observable<User | null>;
  banks$!: Observable<Bank[]>;
  avatarUrl: string = '';
  newUserName: string = '';
  newBankName: string = '';
  newBankBalance: number | null = null;
  isMobileMenuOpen = false;
  editingBankId: number | null = null;
  editingBankName: string = '';
  editingBankBalance: number | null = null;
  showDeleteConfirm = false;
  bankToDelete: Bank | null = null;
  deleteBankError = '';
  bankCount = 0;
  showDeleteAccountConfirm = false;
  deleteAccountPassword = '';
  deleteAccountError = '';
  isDeletingAccount = false;
  showDeleteAccountPassword = false;

  avatars = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aria',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Maya',
  ];

  constructor(
    private expenseService: ExpenseService,
    private authService: AuthService,
    public themeService: ThemeService
  ) { }

  ngOnInit() {
    this.user$ = this.expenseService.getUser();
    this.banks$ = this.expenseService.getBanks();

    this.banks$.subscribe(banks => {
      this.bankCount = banks?.length || 0;
      if (this.bankCount <= 1 && this.showDeleteConfirm) {
        this.cancelDelete();
      }
    });

    this.user$.subscribe(user => {
      if (user) {
        this.avatarUrl = user.avatar || '';
        this.newUserName = user.name || '';
      }
    });
  }

  updateAvatar() {
    this.authService.updateUserInfo({ avatar: this.avatarUrl });
  }

  selectAvatar(url: string) {
    this.avatarUrl = url;
    this.updateAvatar();
  }

  updateName() {
    if (this.newUserName.trim()) {
      this.authService.updateUserInfo({ name: this.newUserName.trim() });
    }
  }

  addBank() {
    if (this.newBankName.trim()) {
      const balance = this.newBankBalance != null ? this.newBankBalance : 0;
      this.expenseService.addBank(this.newBankName.trim(), balance);
      this.newBankName = '';
      this.newBankBalance = null;
    }
  }

  startEdit(bank: Bank) {
    this.editingBankId = bank.id;
    this.editingBankName = bank.name;
    this.editingBankBalance = bank.balance;
  }

  saveEdit(bank: Bank) {
    const trimmedName = this.editingBankName.trim();
    const normalizedBalance = this.editingBankBalance != null ? this.editingBankBalance : bank.balance;
    const nameChanged = trimmedName && trimmedName !== bank.name;
    const balanceChanged = normalizedBalance !== bank.balance;
    if (trimmedName && (nameChanged || balanceChanged)) {
      this.expenseService.updateBank(bank.id, trimmedName, normalizedBalance);
    }
    this.cancelEdit();
  }

  cancelEdit() {
    this.editingBankId = null;
    this.editingBankName = '';
    this.editingBankBalance = null;
  }

  deleteBank(bank: Bank) {
    this.bankToDelete = bank;
    this.deleteBankError = this.bankCount <= 1 ? 'At least one bank account is required.' : '';
    this.showDeleteConfirm = true;
  }

  confirmDelete() {
    if (this.bankCount <= 1) {
      this.deleteBankError = 'At least one bank account is required.';
      return;
    }
    if (this.bankToDelete) {
      this.expenseService.deleteBank(this.bankToDelete.id);
    }
    this.cancelDelete();
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
    this.bankToDelete = null;
    this.deleteBankError = '';
  }

  openDeleteAccountModal() {
    this.deleteAccountPassword = '';
    this.deleteAccountError = '';
    this.showDeleteAccountPassword = false;
    this.showDeleteAccountConfirm = true;
  }

  cancelDeleteAccount() {
    this.showDeleteAccountConfirm = false;
    this.deleteAccountPassword = '';
    this.deleteAccountError = '';
    this.isDeletingAccount = false;
    this.showDeleteAccountPassword = false;
  }

  confirmDeleteAccount() {
    const password = this.deleteAccountPassword;
    if (!password) {
      this.deleteAccountError = 'Current password is required.';
      return;
    }

    this.isDeletingAccount = true;
    this.deleteAccountError = '';
    this.authService.deleteAccount(password).subscribe({
      next: () => {
        this.cancelDeleteAccount();
      },
      error: (err) => {
        this.isDeletingAccount = false;
        this.deleteAccountError = err?.error?.message || 'Incorrect current password.';
      }
    });
  }

  logout() {
    this.authService.logout();
  }
}
