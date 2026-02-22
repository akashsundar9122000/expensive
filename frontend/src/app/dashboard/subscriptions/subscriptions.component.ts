import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseService } from '../../services/expense.service';
import { Subscription, User } from '../../services/models';
import { Observable } from 'rxjs';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  template: `
    <main class="dashboard-layout" *ngIf="{
      user: user$ | async,
      subscriptions: subscriptions$ | async
    } as data">
      <app-sidebar></app-sidebar>

      <div class="main-content">
        <header class="top-header">
          <div class="header-left">
            <h1>Subscriptions</h1>
            <p>Manage your recurring bills and services</p>
          </div>

          <div class="header-right">
            <button class="primary-btn" (click)="toggleModal()">
              <i class="ph ph-plus"></i> Add Subscription
            </button>
            <div class="profile-dropdown">
              <div class="fallback-header-avatar" style="width: 44px; height: 44px; font-size: 20px;">
                <i class="ph ph-user"></i>
              </div>
            </div>
          </div>
        </header>

        <div class="dashboard-body">
          <div class="card table-card">
            <div class="table-container">
              <table *ngIf="data.subscriptions?.length; else emptyState">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let s of data.subscriptions">
                    <td>
                      <div class="sub-cell">
                        <div class="sub-icon" [style.background-color]="s.color + '20'" [style.color]="s.color">
                          <i class="ph-bold" [ngClass]="s.icon"></i>
                        </div>
                        {{ s.name }}
                      </div>
                    </td>
                    <td>{{ s.date }}</td>
                    <td><b>₹{{ s.amount | number:'1.2-2' }}</b></td>
                    <td>
                      <button class="delete-btn" (click)="deleteSub(s.id)">
                        <i class="ph ph-trash"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <ng-template #emptyState>
                <div class="empty-state">
                  <i class="ph ph-ticket-slash"></i>
                  <p>No active subscriptions found. Add your first service!</p>
                </div>
              </ng-template>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Modal -->
    <div class="modal-overlay" *ngIf="showModal" (click)="toggleModal()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <header class="modal-header">
           <h3>Add Subscription</h3>
           <button class="close-btn" (click)="toggleModal()"><i class="ph ph-x"></i></button>
        </header>
        <div class="modal-body">
           <div class="form-group">
             <label>Service Name</label>
             <input type="text" [(ngModel)]="newSub.name" placeholder="Netflix, Spotify...">
           </div>
           <div class="form-group">
             <label>Amount (₹)</label>
             <input type="number" [(ngModel)]="newSub.amount">
           </div>
           <div class="form-group">
             <label>Icon (Phosphor Icon Class)</label>
             <input type="text" [(ngModel)]="newSub.icon" placeholder="ph-netflix-logo">
           </div>
           <div class="form-group">
             <label>Color (Hex)</label>
             <input type="color" [(ngModel)]="newSub.color" style="height: 40px; padding: 2px;">
           </div>
           <button class="primary-btn" style="width: 100%;" (click)="saveSub()">Save Subscription</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-layout { display: flex; min-height: 100vh; }
    .main-content { flex: 1; margin-left: var(--sidebar-width); }
    .top-header { height: 100px; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; background: var(--bg-main); position: sticky; top: 0; z-index: 10; }
    .profile-img { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }
    .dashboard-body { padding: 40px; }
    
    .fallback-header-avatar { 
      background: #F1F5F9; color: #64748B; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; font-size: 48px;
    }

    .sub-cell { display: flex; align-items: center; gap: 12px; font-weight: 500; }
    .sub-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
    
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 16px; color: var(--text-muted); border-bottom: 1px solid var(--border-light); }
    td { padding: 16px; border-bottom: 1px solid var(--border-light); }
    
    .empty-state { padding: 80px; text-align: center; color: var(--text-muted); }
    .empty-state i { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }

    .delete-btn { border: none; background: none; color: var(--text-muted); cursor: pointer; font-size: 18px; }
    .delete-btn:hover { color: var(--danger-red); }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal-card { background: white; border-radius: 24px; padding: 32px; width: 400px; }
    .modal-header { display: flex; justify-content: space-between; margin-bottom: 24px; }
    .close-btn { border: none; background: none; font-size: 24px; cursor: pointer; }
    .form-group { margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px; }
    .form-group input { padding: 12px; border: 1px solid var(--border-light); border-radius: 12px; }
  `]
})
export class SubscriptionsComponent implements OnInit {
  user$!: Observable<User | null>;
  subscriptions$!: Observable<Subscription[]>;
  showModal = false;
  newSub = { name: '', amount: 0, icon: 'ph-ticket', color: '#3B82F6', date: 'Upcoming' };

  constructor(private expenseService: ExpenseService) { }

  ngOnInit() {
    this.user$ = this.expenseService.getUser();
    this.subscriptions$ = this.expenseService.getSubscriptions();
  }

  toggleModal() { this.showModal = !this.showModal; }

  saveSub() {
    if (this.newSub.name && this.newSub.amount > 0) {
      this.expenseService.addSubscription({ ...this.newSub });
      this.toggleModal();
      this.newSub = { name: '', amount: 0, icon: 'ph-ticket', color: '#3B82F6', date: 'Upcoming' };
    }
  }

  deleteSub(id: number) {
    if (confirm('Delete this subscription?')) {
      this.expenseService.deleteSubscription(id);
    }
  }
}
