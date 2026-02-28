import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseService } from '../../services/expense.service';
import { User, DashboardStats } from '../../services/models';
import { Observable } from 'rxjs';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CREDIT_CARD_CATALOG, CreditCardCatalogItem } from './credit-card-catalog';
import { AuthService } from '../../services/auth.service';
import { Bank } from '../../services/models';

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  template: `

    <main class="dashboard-layout" *ngIf="{
      user: user$ | async,
      stats: stats$ | async,
      banks: banks$ | async
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
            <button class="primary-btn" (click)="openAddCardModal(data.user?.bankAccounts)">
              <i class="ph ph-credit-card"></i> <span class="btn-label">Add Credit Card</span>
            </button>
            <button class="primary-btn" (click)="showAddBankModal = true">
              <i class="ph ph-plus"></i> <span class="btn-label">Add Bank Account</span>
            </button>
            <div class="fallback-header-avatar" *ngIf="!data.user?.avatar">
              <i class="ph ph-user"></i>
            </div>
            <img *ngIf="data.user?.avatar" [src]="data.user?.avatar" alt="Avatar" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-light);">
          </div>
        </header>

        <div class="dashboard-body">
          <div class="section-header-flex">
            <div class="section-title" style="margin-bottom: 0;">Saved Credit Cards</div>
            <div class="cards-header-actions">
              <select class="bank-filter-select" [(ngModel)]="selectedBankFilter" name="selectedBankFilter">
                <option value="ALL">All Banks</option>
                <option *ngFor="let bankName of bankFilterOptions" [value]="bankName">{{ bankName }}</option>
              </select>
              <button class="primary-btn" (click)="openAddCardModal(data.user?.bankAccounts)">
                <i class="ph ph-plus"></i> Add Card
              </button>
            </div>
          </div>

          <div class="saved-cards-grid" *ngIf="displayedCards.length > 0; else noSavedCards">
            <div class="premium-card compact-card saved-card" *ngFor="let card of displayedCards" [style.background]="card.color">
              <div class="card-actions">
                <button type="button" class="card-action-btn" (click)="startEditCard(card)" title="Edit Card">
                  <i class="ph ph-pencil"></i>
                </button>
                <button type="button" class="card-action-btn danger" (click)="openDeletePasswordModal(card.id)" title="Delete Card">
                  <i class="ph ph-trash"></i>
                </button>
              </div>
              <div class="card-top">
                <div class="card-chip"></div>
                <div class="contactless"><i class="ph ph-contactless-payment"></i></div>
              </div>
              <div class="card-number saved-card-number">{{ card.cardNumber }}</div>
              <div class="card-details saved-card-details">
                <div class="card-meta-left">
                  <div class="detail">
                    <span class="label">Card Holder</span>
                    <span class="value">{{ card.holderName }}</span>
                  </div>
                  <div class="detail">
                    <span class="label">Expires</span>
                    <span class="value">{{ card.expiry }}</span>
                  </div>
                </div>
                <div class="card-meta-right">
                  <div class="detail cvv-detail">
                    <span class="label">CVV</span>
                    <button type="button" class="cvv-btn" (click)="onCvvClick(card)">
                      {{ card.cvvVisible ? card.cvv : '***' }}
                    </button>
                  </div>
                  <div class="detail bank-detail">
                    <span class="label">Bank</span>
                    <span class="value">{{ card.bankName }}</span>
                  </div>
                </div>
              </div>
              <div class="card-brand-row">
                <div class="card-name-text">{{ card.cardName }}</div>
                <div class="card-type">{{ card.network }}</div>
              </div>
            </div>
          </div>

          <ng-template #noSavedCards>
            <div class="empty-state">
              <i class="ph ph-credit-card"></i>
              <p>{{ savedCards.length === 0 ? 'No credit cards added yet.' : 'No cards found for selected bank.' }}</p>
              <button *ngIf="savedCards.length === 0" (click)="openAddCardModal(data.user?.bankAccounts)" class="primary-btn" style="display: inline-flex; margin-top: 16px;">Add Your First Card</button>
            </div>
          </ng-template>

          <!-- Bank Accounts -->
          <div class="section-title" style="margin-top: 40px;">Linked Bank Accounts</div>
          <div class="banks-grid" *ngIf="data.banks?.length; else noBanks">
            <div class="bank-card" *ngFor="let bank of data.banks; let i = index"
              [style.background]="bankGradients[i % bankGradients.length]">
              <div class="bank-card-actions">
                <button class="bank-icon-btn" title="Edit bank" (click)="openEditBankModal(bank)">
                  <i class="ph ph-pencil-simple"></i>
                </button>
                <button class="bank-icon-btn danger" title="Delete bank" (click)="openDeleteBankPasswordModal(bank.id)">
                  <i class="ph ph-trash"></i>
                </button>
              </div>
              <div class="bank-card-header">
                <i class="ph ph-bank bank-icon"></i>
                <span class="bank-name">{{ bank.name }}</span>
              </div>
              <div class="bank-balance">
                ₹{{ bank.balance | number:'1.2-2' }}
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

      <div class="modal-overlay" *ngIf="showEditBankModal" (click)="closeEditBankModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Edit Bank Account</h3>
            <button class="close-btn" (click)="closeEditBankModal()"><i class="ph ph-x"></i></button>
          </div>
          <div class="modal-body">
            <form class="modal-form" (submit)="onUpdateBank(); $event.preventDefault()">
              <div class="form-group">
                <label>Bank Name</label>
                <input type="text" [(ngModel)]="editBankName" name="editBankName" placeholder="e.g. HDFC Bank">
              </div>
              <div class="form-group">
                <label>Balance (₹)</label>
                <input type="number" [(ngModel)]="editBankBalance" name="editBankBalance" placeholder="e.g. 25000" step="0.01">
              </div>
              <div class="modal-actions">
                <button type="button" class="outline-btn" (click)="closeEditBankModal()">Cancel</button>
                <button type="submit" class="primary-btn">Update Bank</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="showAddCardModal" (click)="closeAddCardModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
            <h3>{{ editingCardId ? 'Edit Credit Card' : 'Add Credit Card' }}</h3>
                <button class="close-btn" (click)="closeAddCardModal()"><i class="ph ph-x"></i></button>
            </div>
            <div class="modal-body">
                <form class="modal-form" (submit)="onSaveCard(data.user?.name || 'User'); $event.preventDefault()">
                    <div class="form-group">
                        <label>Select Bank</label>
                        <select [(ngModel)]="selectedCardBank" name="selectedCardBank" (ngModelChange)="onSelectedBankChange()">
                          <option value="" disabled>Select bank</option>
                          <option *ngFor="let bank of getAvailableBanks(data.user?.bankAccounts)" [value]="bank">{{ bank }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                      <label>Select Credit Card</label>
                      <select [(ngModel)]="selectedCardName" name="selectedCardName" [disabled]="!selectedCardBank">
                        <option value="" disabled>Select card variant</option>
                        <option *ngFor="let card of getCardsByBank(selectedCardBank)" [value]="card.name">{{ card.name }}</option>
                      </select>
                    </div>

                    <div *ngIf="selectedCardName" class="card-entry-wrap">
                      <div class="premium-card compact-card preview-card">
                        <div class="card-top">
                          <div class="card-chip"></div>
                          <div class="contactless"><i class="ph ph-contactless-payment"></i></div>
                        </div>
                        <div class="card-number">{{ getPreviewCardNumber() }}</div>
                        <div class="card-details">
                          <div class="detail">
                            <span class="label">Card Holder</span>
                            <span class="value">{{ data.user?.name || 'User' }}</span>
                          </div>
                          <div class="detail">
                            <span class="label">Expires</span>
                            <span class="value">{{ cardExpiryInput || 'MM/YY' }}</span>
                          </div>
                        </div>
                        <div class="card-brand-row">
                          <div class="card-name-text">{{ selectedCardName }}</div>
                          <div class="card-type">{{ getSelectedCardNetwork() }}</div>
                        </div>
                      </div>

                      <div class="form-group">
                        <label>Card Number</label>
                        <input
                          type="text"
                          inputmode="numeric"
                          maxlength="23"
                          name="cardNumber"
                          placeholder="1234 5678 9012 3456"
                          [(ngModel)]="cardNumberInput"
                          (ngModelChange)="onCardNumberInput($event)">
                      </div>
                      <div class="inline-fields">
                        <div class="form-group">
                          <label>Expiry Date</label>
                          <input
                            type="text"
                            inputmode="numeric"
                            maxlength="5"
                            name="cardExpiry"
                            placeholder="MM/YY"
                            [(ngModel)]="cardExpiryInput"
                            (ngModelChange)="onCardExpiryInput($event)">
                        </div>
                        <div class="form-group">
                          <label>CVV</label>
                          <input
                            type="password"
                            inputmode="numeric"
                            maxlength="4"
                            name="cardCvv"
                            placeholder="***"
                            [(ngModel)]="cardCvvInput"
                            (ngModelChange)="onCardCvvInput($event)">
                        </div>
                      </div>
                      <p class="helper-text">CVV is validated for save and never stored.</p>
                    </div>

                    <div class="modal-actions">
                        <button type="button" class="outline-btn" (click)="closeAddCardModal()">Cancel</button>
                      <button type="submit" class="primary-btn" [disabled]="!selectedCardBank || !selectedCardName">{{ editingCardId ? 'Update Card' : 'Save Card' }}</button>
                    </div>
                </form>
            </div>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="showCvvPasswordModal" (click)="closeCvvPasswordModal()">
        <div class="modal-card cvv-auth-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Verify Password</h3>
            <button class="close-btn" (click)="closeCvvPasswordModal()"><i class="ph ph-x"></i></button>
          </div>
          <div class="modal-body">
            <form class="modal-form" (submit)="confirmCvvReveal(); $event.preventDefault()">
              <p class="helper-text" style="margin-bottom: 10px;">Enter your account password to view CVV.</p>
              <div class="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="cvvPassword"
                  placeholder="Enter password"
                  [(ngModel)]="cvvPasswordInput">
              </div>
              <p class="error-text" *ngIf="cvvAuthError">{{ cvvAuthError }}</p>
              <div class="modal-actions auth-modal-actions">
                <button type="button" class="outline-btn" (click)="closeCvvPasswordModal()">Cancel</button>
                <button type="submit" class="primary-btn">Verify</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="showDeletePasswordModal" (click)="closeDeletePasswordModal()">
        <div class="modal-card cvv-auth-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Delete Card</h3>
            <button class="close-btn" (click)="closeDeletePasswordModal()"><i class="ph ph-x"></i></button>
          </div>
          <div class="modal-body">
            <form class="modal-form" (submit)="confirmDeleteCard(); $event.preventDefault()">
              <p class="helper-text" style="margin-bottom: 10px;">Enter your account password to delete this card.</p>
              <div class="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="deletePassword"
                  placeholder="Enter password"
                  [(ngModel)]="deletePasswordInput">
              </div>
              <p class="error-text" *ngIf="deleteAuthError">{{ deleteAuthError }}</p>
              <div class="modal-actions auth-modal-actions">
                <button type="button" class="outline-btn" (click)="closeDeletePasswordModal()">Cancel</button>
                <button type="submit" class="primary-btn">Delete</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="showDeleteBankPasswordModal" (click)="closeDeleteBankPasswordModal()">
        <div class="modal-card cvv-auth-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Delete Bank Account</h3>
            <button class="close-btn" (click)="closeDeleteBankPasswordModal()"><i class="ph ph-x"></i></button>
          </div>
          <div class="modal-body">
            <form class="modal-form" (submit)="confirmDeleteBank(); $event.preventDefault()">
              <p class="helper-text" style="margin-bottom: 10px;">Enter your account password to delete this bank.</p>
              <div class="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="deleteBankPassword"
                  placeholder="Enter password"
                  [(ngModel)]="deleteBankPasswordInput">
              </div>
              <p class="error-text" *ngIf="deleteBankAuthError">{{ deleteBankAuthError }}</p>
              <div class="modal-actions auth-modal-actions">
                <button type="button" class="outline-btn" (click)="closeDeleteBankPasswordModal()">Cancel</button>
                <button type="submit" class="primary-btn">Delete</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  `,

  styles: [`
    .section-title { font-size: 18px; font-weight: 700; color: var(--text-dark); margin-bottom: 20px; }
    .section-header-flex { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .cards-header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .bank-filter-select {
      height: 40px;
      padding: 0 12px;
      border-radius: 10px;
      border: 1px solid var(--border-light);
      background: var(--bg-main);
      color: var(--text-dark);
      font-size: 13px;
      font-weight: 600;
      min-width: 150px;
    }

    .premium-card {
      width: 100%; max-width: 520px; height: 270px;
      background: linear-gradient(135deg, #1e293b, #0f172a, #312e81);
      border-radius: 24px; padding: 36px; color: white;
      display: flex; flex-direction: column; justify-content: space-between;
      position: relative;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0,0,0,0.3);
      transition: transform var(--transition-normal);
    }
    .premium-card:hover { transform: translateY(-4px); }
    .card-top { display: flex; justify-content: space-between; align-items: center; }
    .card-chip { width: 50px; height: 38px; background: linear-gradient(135deg, #fbbf24, #f59e0b); border-radius: 8px; }
    .contactless { font-size: 24px; opacity: 0.5; }
    .card-number { font-size: 26px; letter-spacing: 2px; font-weight: 600; font-family: 'Courier New', monospace; margin: 22px 0; line-height: 1.2; }
    .card-details { display: flex; gap: 22px; flex-wrap: wrap; align-items: flex-end; }
    .detail { display: flex; flex-direction: column; gap: 4px; }
    .detail .label { font-size: 10px; opacity: 0.5; text-transform: uppercase; letter-spacing: 1px; }
    .detail .value { font-size: 14px; font-weight: 700; max-width: 165px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .card-brand-row { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; min-height: 26px; }
    .card-type { font-size: 20px; font-weight: 800; font-style: italic; opacity: 0.4; flex-shrink: 0; }
    .card-name-text { font-size: 12px; font-weight: 600; opacity: 0.85; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cvv-detail { min-width: 64px; }
    .cvv-btn {
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.24);
      color: white;
      border-radius: 8px;
      padding: 4px 10px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1px;
      cursor: pointer;
    }

    .saved-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px; margin-top: 20px; }
    .compact-card { max-width: 100%; min-height: 250px; height: 250px; }
    .saved-card {
      min-height: 270px;
      height: 270px;
      padding: 28px;
    }
    .saved-card-number {
      font-size: 23px;
      letter-spacing: 1.4px;
      margin: 14px 0;
    }
    .saved-card-details {
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: nowrap;
      width: 100%;
      gap: 12px;
      margin-bottom: 8px;
    }
    .card-meta-left { display: flex; flex-direction: column; gap: 8px; min-width: 128px; }
    .card-meta-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; text-align: right; min-width: 118px; }
    .bank-detail .value {
      max-width: 170px;
      font-size: 13px;
    }
    .card-meta-right .value { max-width: 170px; }
    .preview-card { margin-bottom: 18px; }
    .card-entry-wrap { margin-top: 4px; }
    .inline-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .helper-text { margin: 4px 0 0; font-size: 12px; color: var(--text-muted); }
    .error-text { margin: 4px 0 0; font-size: 12px; color: #ef4444; font-weight: 600; }
    .cvv-auth-modal { max-width: 420px; }
    .modal-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      flex-wrap: wrap;
    }
    .auth-modal-actions { gap: 14px; }
    .card-actions {
      position: absolute;
      top: 16px;
      right: 16px;
      display: flex;
      gap: 8px;
      z-index: 2;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity var(--transition-fast), transform var(--transition-fast);
      transform: translateY(-2px);
    }
    .premium-card.compact-card:hover .card-actions,
    .premium-card.compact-card:focus-within .card-actions {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
      transform: translateY(0);
    }
    .card-action-btn {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.3);
      background: rgba(255,255,255,0.16);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform var(--transition-fast);
    }
    .card-action-btn:hover { transform: translateY(-1px); }
    .card-action-btn.danger { border-color: rgba(248, 113, 113, 0.9); background: rgba(127, 29, 29, 0.45); }

    .banks-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .bank-card { border-radius: 20px; padding: 28px; color: white; min-height: 160px; display: flex; flex-direction: column; justify-content: space-between; cursor: pointer; transition: transform var(--transition-fast); position: relative; }
    .bank-card:hover { transform: translateY(-3px); }
    .bank-card-actions {
      position: absolute;
      top: 12px;
      right: 12px;
      display: flex;
      gap: 8px;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity var(--transition-fast);
    }
    .bank-card:hover .bank-card-actions,
    .bank-card:focus-within .bank-card-actions {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    @media (hover: none), (pointer: coarse) {
      .card-actions,
      .bank-card-actions {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
        transform: none;
      }
    }

    .bank-icon-btn {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.25);
      background: rgba(255,255,255,0.14);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .bank-icon-btn.danger {
      border-color: rgba(248, 113, 113, 0.9);
      background: rgba(127, 29, 29, 0.45);
    }
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
      display: none;
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
      .menu-trigger {
        display: flex;
      }

        .cards-header-actions {
          width: 100%;
          justify-content: flex-start;
        }

        .bank-filter-select {
          min-width: 0;
          width: 100%;
        }

        .premium-card {
          padding: 24px;
          height: 240px;
        }
        .saved-card {
          height: 250px;
          min-height: 250px;
          padding: 20px;
        }
        .card-number {
          font-size: 21px;
        }
        .saved-card-number {
          font-size: 19px;
          letter-spacing: 1px;
          margin: 12px 0;
        }
        .saved-card-details {
          gap: 8px;
        }
        .banks-grid {
            grid-template-columns: 1fr;
        }
        .saved-cards-grid {
            grid-template-columns: 1fr;
        }
        .card-name-text {
          max-width: 200px;
        }
        .inline-fields {
            grid-template-columns: 1fr;
            gap: 0;
        }
    }

    @media (max-width: 480px) {
        .saved-card-details {
          flex-wrap: wrap;
        }

        .card-meta-left,
        .card-meta-right {
          min-width: 0;
          width: 100%;
          text-align: left;
          align-items: flex-start;
        }

        .card-meta-right .value,
        .bank-detail .value {
          max-width: 100%;
        }
    }

    @media (max-width: 375px) {
        .premium-card {
          padding: 16px;
          height: 220px;
        }

        .saved-card {
          height: 230px;
          min-height: 230px;
          padding: 16px;
        }

        .card-number {
          font-size: 18px;
          letter-spacing: 1px;
          margin: 10px 0;
        }

        .saved-card-number {
          font-size: 17px;
        }

        .card-name-text,
        .detail .value {
          font-size: 12px;
        }
    }
  `]

})
export class CardsComponent implements OnInit, OnDestroy {
  user$!: Observable<User | null>;
  stats$!: Observable<DashboardStats>;
  banks$!: Observable<Bank[]>;
  isMobileMenuOpen = false;
  showAddBankModal = false;
  showEditBankModal = false;
  showAddCardModal = false;
  showCvvPasswordModal = false;
  showDeletePasswordModal = false;
  showDeleteBankPasswordModal = false;

  selectedCardBank = '';
  selectedCardName = '';
  selectedBankFilter: string = 'ALL';
  cardNumberInput = '';
  cardExpiryInput = '';
  cardCvvInput = '';
  cvvPasswordInput = '';
  cvvAuthError = '';
  deletePasswordInput = '';
  deleteAuthError = '';
  deleteBankPasswordInput = '';
  deleteBankAuthError = '';
  editBankId: number | null = null;
  editBankName = '';
  editBankBalance: number | null = null;
  editingCardId: number | null = null;
  private pendingCvvCardId: number | null = null;
  private pendingDeleteCardId: number | null = null;
  private pendingDeleteBankId: number | null = null;

  savedCards: SavedCreditCard[] = [];
  private readonly cardStoragePrefix = 'saved-cards:';
  private currentUserEmail = 'guest';
  private userSubscription?: Subscription;
  private cvvHideTimers: Record<number, ReturnType<typeof setTimeout>> = {};

  bankGradients = [
    'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #ef4444, #b91c1c)',
    'linear-gradient(135deg, #06b6d4, #0284c7)',
  ];

  cardGradients = [
    'linear-gradient(135deg, #1e293b, #0f172a, #312e81)',
    'linear-gradient(135deg, #0f766e, #134e4a, #1d4ed8)',
    'linear-gradient(135deg, #7c2d12, #9a3412, #b91c1c)',
    'linear-gradient(135deg, #1f2937, #111827, #4c1d95)',
    'linear-gradient(135deg, #0f172a, #1f2937, #0f766e)',
    'linear-gradient(135deg, #3f1d2e, #7c2d12, #1f2937)',
    'linear-gradient(135deg, #1e3a8a, #0f172a, #4c1d95)',
    'linear-gradient(135deg, #14532d, #064e3b, #0f172a)',
  ];

  get bankFilterOptions(): string[] {
    return [...new Set(this.savedCards.map((card) => card.bankName))].sort((a, b) => a.localeCompare(b));
  }

  get displayedCards(): SavedCreditCard[] {
    if (this.selectedBankFilter === 'ALL') {
      return this.savedCards;
    }
    return this.savedCards.filter((card) => card.bankName === this.selectedBankFilter);
  }

  constructor(private expenseService: ExpenseService, private authService: AuthService) { }

  ngOnInit() {
    this.user$ = this.expenseService.getUser();
    this.stats$ = this.expenseService.getStats();
    this.banks$ = this.expenseService.getBanks();

    this.userSubscription = this.user$.subscribe((user) => {
      this.currentUserEmail = (user?.email || 'guest').toLowerCase();
      this.loadSavedCards();
    });
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
    Object.values(this.cvvHideTimers).forEach((timerId) => clearTimeout(timerId));
    this.cvvHideTimers = {};
  }

  onAddBank(name: string, balance?: number) {
    if (!name) return;
    const normalizedBalance = Number.isFinite(balance as number) ? Number(balance) : 0;
    this.expenseService.addBank(name, normalizedBalance);
    this.showAddBankModal = false;
  }

  openEditBankModal(bank: Bank) {
    this.editBankId = bank.id;
    this.editBankName = bank.name;
    this.editBankBalance = bank.balance;
    this.showEditBankModal = true;
  }

  closeEditBankModal() {
    this.showEditBankModal = false;
    this.editBankId = null;
    this.editBankName = '';
    this.editBankBalance = null;
  }

  onUpdateBank() {
    if (!this.editBankId || !this.editBankName.trim()) {
      return;
    }
    this.expenseService.updateBank(this.editBankId, this.editBankName.trim(), this.editBankBalance ?? 0);
    this.closeEditBankModal();
  }

  getAvailableBanks(linkedBanks?: string[]): string[] {
    const fromCatalog = Object.keys(CREDIT_CARD_CATALOG);
    const merged = [...new Set([...(linkedBanks || []), ...fromCatalog])];
    return merged.sort((a, b) => a.localeCompare(b));
  }

  getCardsByBank(bankName: string): CreditCardCatalogItem[] {
    return CREDIT_CARD_CATALOG[bankName] || [];
  }

  openAddCardModal(linkedBanks?: string[]) {
    this.showAddCardModal = true;
    const banks = this.getAvailableBanks(linkedBanks);
    this.selectedCardBank = banks[0] || '';
    this.selectedCardName = '';
    this.cardNumberInput = '';
    this.cardExpiryInput = '';
    this.cardCvvInput = '';
    this.editingCardId = null;
  }

  closeAddCardModal() {
    this.showAddCardModal = false;
    this.selectedCardName = '';
    this.cardNumberInput = '';
    this.cardExpiryInput = '';
    this.cardCvvInput = '';
    this.editingCardId = null;
  }

  startEditCard(card: SavedCreditCard) {
    this.showAddCardModal = true;
    this.editingCardId = card.id;
    this.selectedCardBank = card.bankName;
    this.selectedCardName = card.cardName;
    this.cardNumberInput = card.cardNumber;
    this.cardExpiryInput = card.expiry;
    this.cardCvvInput = card.cvv;
  }

  onSelectedBankChange() {
    this.selectedCardName = '';
  }

  onCardNumberInput(value: string) {
    const digits = (value || '').replace(/\D/g, '').slice(0, 19);
    this.cardNumberInput = digits.replace(/(.{4})/g, '$1 ').trim();
  }

  onCardExpiryInput(value: string) {
    const digits = (value || '').replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) {
      this.cardExpiryInput = digits;
      return;
    }
    this.cardExpiryInput = `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  onCardCvvInput(value: string) {
    this.cardCvvInput = (value || '').replace(/\D/g, '').slice(0, 4);
  }

  getPreviewCardNumber(): string {
    return this.cardNumberInput || '**** **** **** ****';
  }

  getSelectedCardNetwork(): string {
    if (!this.selectedCardBank || !this.selectedCardName) {
      return 'CARD';
    }
    const selected = this.getCardsByBank(this.selectedCardBank).find((card) => card.name === this.selectedCardName);
    return selected?.network || 'CARD';
  }

  onSaveCard(holderName: string) {
    const digits = this.cardNumberInput.replace(/\D/g, '');
    const expiry = this.cardExpiryInput;
    const cvv = this.cardCvvInput;

    if (!this.selectedCardBank || !this.selectedCardName) {
      return;
    }

    if (digits.length < 13 || digits.length > 19) {
      window.alert('Enter a valid card number.');
      return;
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
      window.alert('Enter expiry as MM/YY.');
      return;
    }

    if (!/^\d{3,4}$/.test(cvv)) {
      window.alert('Enter a valid CVV.');
      return;
    }

    const card: SavedCreditCard = {
      id: this.editingCardId || Date.now(),
      bankName: this.selectedCardBank,
      cardName: this.selectedCardName,
      network: this.getSelectedCardNetwork(),
      holderName: holderName || 'User',
      last4: digits.slice(-4),
      cardNumber: this.formatCardNumber(digits),
      maskedNumber: this.maskCardNumber(digits),
      expiry,
      cvv,
      color: this.resolveCardColor(),
      cvvVisible: false
    };

    if (this.editingCardId) {
      this.savedCards = this.savedCards.map((existing) => existing.id === this.editingCardId ? card : existing);
    } else {
      this.savedCards = [...this.savedCards, card];
    }
    this.persistSavedCards();
    this.closeAddCardModal();
  }

  private resolveCardColor(): string {
    if (this.editingCardId) {
      const existing = this.savedCards.find((card) => card.id === this.editingCardId);
      if (existing?.color) {
        return existing.color;
      }
    }
    return this.getNextCardColor();
  }

  private getNextCardColor(): string {
    const used = new Set(this.savedCards.map((card) => card.color).filter(Boolean));
    const unused = this.cardGradients.find((gradient) => !used.has(gradient));
    if (unused) {
      return unused;
    }
    return this.cardGradients[this.savedCards.length % this.cardGradients.length];
  }

  private formatCardNumber(digits: string): string {
    return digits.replace(/(.{4})/g, '$1 ').trim();
  }

  private maskCardNumber(digits: string): string {
    const last4 = digits.slice(-4);
    return `**** **** **** ${last4}`;
  }

  private storageKey(): string {
    return `${this.cardStoragePrefix}${this.currentUserEmail}`;
  }

  private loadSavedCards() {
    try {
      const raw = localStorage.getItem(this.storageKey());
      const parsed = raw ? JSON.parse(raw) : [];
      this.savedCards = (parsed || []).map((card: SavedCreditCard, index: number) => ({
        ...card,
        cardNumber: card.cardNumber || card.maskedNumber || '**** **** **** ****',
        color: card.color || this.cardGradients[index % this.cardGradients.length],
        cvvVisible: false
      }));
      if (this.selectedBankFilter !== 'ALL' && !this.bankFilterOptions.includes(this.selectedBankFilter)) {
        this.selectedBankFilter = 'ALL';
      }
      this.persistSavedCards();
    } catch {
      this.savedCards = [];
      this.selectedBankFilter = 'ALL';
    }
  }

  private persistSavedCards() {
    localStorage.setItem(this.storageKey(), JSON.stringify(this.savedCards));
  }

  onCvvClick(card: SavedCreditCard) {
    if (card.cvvVisible) {
      card.cvvVisible = false;
      this.clearCvvHideTimer(card.id);
      return;
    }

    this.pendingCvvCardId = card.id;
    this.cvvPasswordInput = '';
    this.cvvAuthError = '';
    this.showCvvPasswordModal = true;
  }

  closeCvvPasswordModal() {
    this.showCvvPasswordModal = false;
    this.pendingCvvCardId = null;
    this.cvvPasswordInput = '';
    this.cvvAuthError = '';
  }

  confirmCvvReveal() {
    if (!this.pendingCvvCardId) {
      return;
    }

    if (!this.cvvPasswordInput) {
      this.cvvAuthError = 'Password is required.';
      return;
    }

    this.authService.verifyPassword(this.cvvPasswordInput).subscribe((isValid) => {
      if (!isValid) {
        this.cvvAuthError = 'Incorrect password.';
        return;
      }

      const targetCard = this.savedCards.find((card) => card.id === this.pendingCvvCardId);
      if (targetCard) {
        targetCard.cvvVisible = true;
        this.scheduleCvvAutoHide(targetCard.id);
      }
      this.closeCvvPasswordModal();
    });
  }

  private scheduleCvvAutoHide(cardId: number) {
    this.clearCvvHideTimer(cardId);
    this.cvvHideTimers[cardId] = setTimeout(() => {
      const targetCard = this.savedCards.find((card) => card.id === cardId);
      if (targetCard) {
        targetCard.cvvVisible = false;
      }
      this.clearCvvHideTimer(cardId);
    }, 10000);
  }

  private clearCvvHideTimer(cardId: number) {
    if (!this.cvvHideTimers[cardId]) {
      return;
    }
    clearTimeout(this.cvvHideTimers[cardId]);
    delete this.cvvHideTimers[cardId];
  }

  openDeletePasswordModal(cardId: number) {
    this.pendingDeleteCardId = cardId;
    this.deletePasswordInput = '';
    this.deleteAuthError = '';
    this.showDeletePasswordModal = true;
  }

  closeDeletePasswordModal() {
    this.showDeletePasswordModal = false;
    this.pendingDeleteCardId = null;
    this.deletePasswordInput = '';
    this.deleteAuthError = '';
  }

  confirmDeleteCard() {
    if (!this.pendingDeleteCardId) {
      return;
    }

    if (!this.deletePasswordInput) {
      this.deleteAuthError = 'Password is required.';
      return;
    }

    this.authService.verifyPassword(this.deletePasswordInput).subscribe((isValid) => {
      if (!isValid) {
        this.deleteAuthError = 'Incorrect password.';
        return;
      }

      this.clearCvvHideTimer(this.pendingDeleteCardId as number);
      this.savedCards = this.savedCards.filter((card) => card.id !== this.pendingDeleteCardId);
      this.persistSavedCards();
      this.closeDeletePasswordModal();
    });
  }

  openDeleteBankPasswordModal(bankId: number) {
    this.pendingDeleteBankId = bankId;
    this.deleteBankPasswordInput = '';
    this.deleteBankAuthError = '';
    this.showDeleteBankPasswordModal = true;
  }

  closeDeleteBankPasswordModal() {
    this.showDeleteBankPasswordModal = false;
    this.pendingDeleteBankId = null;
    this.deleteBankPasswordInput = '';
    this.deleteBankAuthError = '';
  }

  confirmDeleteBank() {
    if (!this.pendingDeleteBankId) {
      return;
    }

    if (!this.deleteBankPasswordInput) {
      this.deleteBankAuthError = 'Password is required.';
      return;
    }

    this.authService.verifyPassword(this.deleteBankPasswordInput).subscribe((isValid) => {
      if (!isValid) {
        this.deleteBankAuthError = 'Incorrect password.';
        return;
      }

      this.expenseService.deleteBank(this.pendingDeleteBankId as number);
      this.closeDeleteBankPasswordModal();
    });
  }
}

interface SavedCreditCard {
  id: number;
  bankName: string;
  cardName: string;
  network: string;
  holderName: string;
  last4: string;
  cardNumber: string;
  maskedNumber: string;
  expiry: string;
  cvv: string;
  color: string;
  cvvVisible?: boolean;
}

