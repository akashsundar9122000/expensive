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
            <div class="fallback-header-avatar">
              <i class="ph ph-user"></i>
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
                  <p class="goal-desc">Track your progress towards your savings target.</p>
                  
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
                      <span class="label">Remaining</span>
                      <span class="value">₹{{ (data.stats.goalRequired - data.stats.goalCollected) | number:'1.0-0' }}</span>
                    </div>
                  </div>

                  <div class="fund-action" *ngIf="data.stats.goalCollected < data.stats.goalRequired">
                    <div class="fund-input-group">
                      <span class="currency-label">₹</span>
                      <input type="number" [(ngModel)]="fundAmount" placeholder="Enter amount">
                    </div>
                    <button class="primary-btn" (click)="fundGoal()" [disabled]="!fundAmount || fundAmount <= 0">
                      <i class="ph ph-hand-coins"></i> Fund Goal
                    </button>
                  </div>
                  <div class="goal-complete" *ngIf="data.stats.goalCollected >= data.stats.goalRequired">
                    <i class="ph ph-check-circle"></i>
                    <span>Goal Achieved! 🎉</span>
                  </div>
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

            <!-- Suggested Goals -->
            <div class="future-goals">
               <h3>Suggested Goals</h3>
               <div class="goals-grid">
                  <div class="card secondary-goal">
                    <div class="goal-icon blue"><i class="ph ph-airplane"></i></div>
                    <h4>Paris Vacation</h4>
                    <p>₹3,50,000</p>
                    <div class="mini-progress"><div class="fill" style="width: 15%"></div></div>
                  </div>
                  <div class="card secondary-goal">
                    <div class="goal-icon purple"><i class="ph ph-car"></i></div>
                    <h4>New Car</h4>
                    <p>₹45,00,000</p>
                    <div class="mini-progress"><div class="fill" style="width: 5%"></div></div>
                  </div>
                  <div class="card secondary-goal">
                    <div class="goal-icon green"><i class="ph ph-house"></i></div>
                    <h4>Home Down Payment</h4>
                    <p>₹25,00,000</p>
                    <div class="mini-progress"><div class="fill" style="width: 8%"></div></div>
                  </div>
                  <div class="card secondary-goal">
                    <div class="goal-icon orange"><i class="ph ph-graduation-cap"></i></div>
                    <h4>Education Fund</h4>
                    <p>₹10,00,000</p>
                    <div class="mini-progress"><div class="fill" style="width: 20%"></div></div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  `,
  styles: [`
    .goal-hero-card { padding: 40px; position: relative; overflow: hidden; }
    .goal-hero-content { display: flex; gap: 48px; align-items: center; margin-bottom: 40px; }
    
    .goal-info { flex: 1; }
    .goal-info h2 { font-size: 28px; color: var(--text-dark); margin-bottom: 12px; }
    .goal-desc { color: var(--text-muted); line-height: 1.6; margin-bottom: 28px; max-width: 400px; }

    .goal-stats-row { display: flex; gap: 36px; margin-bottom: 32px; }
    .stat-item { display: flex; flex-direction: column; gap: 4px; }
    .stat-item .label { font-size: 12px; color: var(--text-muted); font-weight: 500; }
    .stat-item .value { font-size: 20px; font-weight: 700; color: var(--text-dark); }
    .stat-item .value.success { color: var(--success-green); }

    .fund-action { display: flex; gap: 12px; align-items: center; }
    .fund-input-group { position: relative; }
    .currency-label { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-weight: 600; }
    .fund-input-group input { padding: 12px 14px 12px 30px; border-radius: 12px; border: 1px solid var(--border-light); font-size: 14px; width: 140px; outline: none; background: var(--bg-input); color: var(--text-dark); }
    .fund-input-group input:focus { border-color: var(--primary-blue); }

    .goal-complete { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: rgba(16, 185, 129, 0.1); border-radius: 12px; color: var(--success-green); font-weight: 700; font-size: 16px; }
    .goal-complete i { font-size: 24px; }

    .goal-visual { display: flex; justify-content: center; }
    .circular-progress-large { width: 200px; height: 200px; border-radius: 50%; display: flex; align-items: center; justify-content: center; position: relative; }
    .circular-progress-large::before { content: ""; position: absolute; width: 160px; height: 160px; background-color: var(--bg-card); border-radius: 50%; transition: background var(--transition-normal); }
    .progress-inner { position: relative; text-align: center; }
    .progress-inner .percent { font-size: 36px; font-weight: 800; color: var(--text-dark); display: block; }
    .progress-inner .subtext { font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }

    /* Milestones */
    .milestones { margin-top: 16px; }
    .milestone-track { height: 6px; background: var(--bg-chip); border-radius: 3px; position: relative; }
    .milestone-progress { position: absolute; height: 100%; background: var(--warning-orange); border-radius: 3px; transition: width 0.6s ease; }
    .milestone-point { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 14px; height: 14px; background: var(--bg-card); border: 3px solid var(--bg-chip); border-radius: 50%; }
    .milestone-label { position: absolute; top: 22px; left: 50%; transform: translateX(-50%); font-size: 10px; font-weight: 600; color: var(--text-muted); white-space: nowrap; }

    /* Future Goals */
    .future-goals { margin-top: 40px; }
    .future-goals h3 { margin-bottom: 20px; font-size: 18px; }
    .goals-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
    .secondary-goal { padding: 24px; display: flex; flex-direction: column; gap: 10px; transition: transform var(--transition-fast); }
    .secondary-goal:hover { transform: translateY(-3px); }
    .goal-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .goal-icon.blue { background: var(--primary-blue-light); color: var(--primary-blue); }
    .goal-icon.purple { background: rgba(139, 92, 246, 0.1); color: #8B5CF6; }
    .goal-icon.green { background: rgba(16, 185, 129, 0.1); color: #10B981; }
    .goal-icon.orange { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
    .secondary-goal h4 { font-size: 15px; }
    .secondary-goal p { color: var(--text-muted); font-weight: 600; }
    .mini-progress { height: 5px; background: var(--bg-chip); border-radius: 3px; overflow: hidden; }
    .mini-progress .fill { height: 100%; background: var(--primary-blue); border-radius: 3px; }

    @media (max-width: 900px) {
      .goal-hero-content { flex-direction: column; }
    }
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
    const progress = Math.min((stats.goalCollected / stats.goalRequired) * 100, 100);
    return `${Math.round(progress)}%`;
  }

  getGoalGradient(stats: DashboardStats): string {
    const progress = Math.min((stats.goalCollected / stats.goalRequired) * 100, 100);
    return `conic-gradient(var(--warning-orange) ${progress}%, var(--bg-chip) 0deg)`;
  }

  fundGoal() {
    if (this.fundAmount > 0) {
      this.expenseService.fundGoal(this.fundAmount);
      this.fundAmount = 0;
    }
  }
}
