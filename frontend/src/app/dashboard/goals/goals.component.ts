import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseService } from '../../services/expense.service';
import { DashboardStats, User } from '../../services/models';
import { Observable } from 'rxjs';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  template: `
    <main class="dashboard-layout" *ngIf="{
      user: user$ | async,
      stats: stats$ | async
    } as data">
      <app-sidebar></app-sidebar>

      <div class="main-content">
        <header class="top-header">
          <div class="header-left">
            <h1>Your Goals</h1>
            <p>Save for what matters most</p>
          </div>

          <div class="header-right">
            <div class="profile-dropdown">
              <img [src]="data.user?.avatar || 'https://i.pravatar.cc/150'" alt="Profile" class="profile-img">
            </div>
          </div>
        </header>

        <div class="dashboard-body" *ngIf="data.stats">
          <div class="goals-container">
            <!-- Main Goal Card -->
            <div class="card goal-hero-card">
              <div class="goal-hero-content">
                <div class="goal-info">
                  <span class="badge orange">Primary Goal</span>
                  <h2>{{ data.stats.goalName }}</h2>
                  <p class="goal-desc">Luxury tech with the best features for productivity and entertainment.</p>
                  
                  <div class="goal-stats-row">
                    <div class="stat-item">
                      <span class="label">Required</span>
                      <span class="value">₹{{ data.stats.goalRequired | number:'1.0-0' }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="label">Collected</span>
                      <span class="value success">₹{{ data.stats.goalCollected | number:'1.0-0' }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="label">Left</span>
                      <span class="value">₹{{ (data.stats.goalRequired - data.stats.goalCollected) | number:'1.0-0' }}</span>
                    </div>
                  </div>

                  <div class="fund-action" *ngIf="data.stats.goalCollected < data.stats.goalRequired">
                    <div class="fund-input-group">
                      <span class="currency-label">₹</span>
                      <input type="number" [(ngModel)]="fundAmount" placeholder="Enter amount">
                    </div>
                    <button class="primary-btn" (click)="fundGoal()" [disabled]="!fundAmount || fundAmount <= 0 || fundAmount > data.stats.balance">
                      <i class="ph ph-hand-coins"></i> Fund Goal
                    </button>
                  </div>
                  <p class="error-text" *ngIf="fundAmount > data.stats.balance">Insufficient balance (Available: ₹{{data.stats.balance | number}})</p>
                </div>

                <div class="goal-visual">
                  <div class="circular-progress-large" [style.background]="getGoalGradient(data.stats)">
                    <div class="progress-inner">
                      <span class="percent">{{ getGoalProgress(data.stats) }}</span>
                      <span class="subtext">Completed</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Milestones -->
              <div class="milestones">
                <div class="milestone-track">
                  <div class="milestone-progress" [style.width]="getGoalProgress(data.stats)"></div>
                  <div class="milestone-point" style="left: 0%"><span class="milestone-label">Start</span></div>
                  <div class="milestone-point" style="left: 25%"><span class="milestone-label">25%</span></div>
                  <div class="milestone-point" style="left: 50%"><span class="milestone-label">50%</span></div>
                  <div class="milestone-point" style="left: 75%"><span class="milestone-label">75%</span></div>
                  <div class="milestone-point" style="left: 100%"><span class="milestone-label">Target</span></div>
                </div>
              </div>
            </div>

            <!-- Future Goals Grid -->
            <div class="future-goals">
               <h3>Upcoming Goals</h3>
               <div class="goals-grid">
                  <div class="card secondary-goal">
                    <div class="goal-icon blue"><i class="ph ph-airplane"></i></div>
                    <h4>Paris Vacation</h4>
                    <p>₹3,50,000</p>
                    <div class="mini-progress"><div class="fill" style="width: 15%"></div></div>
                  </div>
                  <div class="card secondary-goal">
                    <div class="goal-icon purple"><i class="ph ph-car"></i></div>
                    <h4>Tesla Model 3</h4>
                    <p>₹45,00,000</p>
                    <div class="mini-progress"><div class="fill" style="width: 5%"></div></div>
                  </div>
               </div>
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
    .profile-img { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }
    .dashboard-body { padding: 40px; }

    .goal-hero-card { padding: 48px; position: relative; overflow: hidden; }
    .goal-hero-content { display: flex; gap: 64px; align-items: center; margin-bottom: 48px; }
    
    .goal-info { flex: 1; }
    .badge.orange { background: #FFF7ED; color: #F59E0B; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; display: inline-block; margin-bottom: 16px; }
    .goal-info h2 { font-size: 32px; color: var(--text-dark); margin-bottom: 12px; }
    .goal-desc { color: var(--text-muted); line-height: 1.6; margin-bottom: 32px; max-width: 400px; }

    .goal-stats-row { display: flex; gap: 40px; margin-bottom: 40px; }
    .stat-item { display: flex; flex-direction: column; gap: 4px; }
    .stat-item .label { font-size: 12px; color: var(--text-muted); font-weight: 500; }
    .stat-item .value { font-size: 20px; font-weight: 700; color: var(--text-dark); }
    .stat-item .value.success { color: var(--success-green); }

    .fund-action { display: flex; gap: 16px; align-items: center; }
    .fund-input-group { position: relative; }
    .currency-label { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-weight: 600; }
    .fund-input-group input { padding: 12px 16px 12px 32px; border-radius: 12px; border: 1px solid var(--border-light); font-size: 14px; width: 140px; outline: none; }
    .primary-btn { padding: 12px 24px; background: var(--text-dark); color: white; border-radius: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; }
    .primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .error-text { color: var(--danger-red); font-size: 11px; margin-top: 8px; }

    .goal-visual { display: flex; justify-content: center; }
    .circular-progress-large { width: 220px; height: 220px; border-radius: 50%; display: flex; align-items: center; justify-content: center; position: relative; }
    .circular-progress-large::before { content: ""; position: absolute; width: 180px; height: 180px; background-color: white; border-radius: 50%; }
    .progress-inner { position: relative; text-align: center; }
    .progress-inner .percent { font-size: 40px; font-weight: 800; color: var(--text-dark); display: block; }
    .progress-inner .subtext { font-size: 12px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }

    /* Milestones */
    .milestones { margin-top: 24px; }
    .milestone-track { height: 8px; background: #F1F5F9; border-radius: 4px; position: relative; }
    .milestone-progress { position: absolute; height: 100%; background: var(--warning-orange); border-radius: 4px; transition: width 0.5s ease; }
    .milestone-point { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 16px; height: 16px; background: white; border: 3px solid #F1F5F9; border-radius: 50%; }
    .milestone-label { position: absolute; top: 24px; left: 50%; transform: translateX(-50%); font-size: 10px; font-weight: 600; color: var(--text-muted); white-space: nowrap; }

    /* Future Goals */
    .future-goals { margin-top: 48px; }
    .future-goals h3 { margin-bottom: 24px; font-size: 18px; }
    .goals-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
    .secondary-goal { padding: 24px; display: flex; flex-direction: column; gap: 12px; }
    .goal-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .goal-icon.blue { background: #EFF6FF; color: #3B82F6; }
    .goal-icon.purple { background: #F3E8FF; color: #8B5CF6; }
    .secondary-goal h4 { font-size: 16px; }
    .mini-progress { height: 6px; background: #F1F5F9; border-radius: 3px; overflow: hidden; }
    .mini-progress .fill { height: 100%; background: var(--primary-blue); border-radius: 3px; }
  `]
})
export class GoalsComponent implements OnInit {
  user$!: Observable<User | null>;
  stats$!: Observable<DashboardStats>;
  fundAmount: number = 0;

  constructor(private expenseService: ExpenseService) { }

  ngOnInit(): void {
    this.user$ = this.expenseService.getUser();
    this.stats$ = this.expenseService.getStats();
  }

  getGoalProgress(stats: DashboardStats): string {
    const progress = (stats.goalCollected / stats.goalRequired) * 100;
    return `${Math.round(progress)}%`;
  }

  getGoalGradient(stats: DashboardStats): string {
    const progress = (stats.goalCollected / stats.goalRequired) * 100;
    return `conic-gradient(var(--warning-orange) ${progress}%, #FFF7ED 0deg)`;
  }

  fundGoal() {
    if (this.fundAmount > 0) {
      this.expenseService.fundGoal(this.fundAmount);
      this.fundAmount = 0;
    }
  }
}
