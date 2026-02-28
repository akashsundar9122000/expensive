import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseService } from '../../services/expense.service';
import { DashboardStats, User } from '../../services/models';
import { Observable } from 'rxjs';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-goals',
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
            <h1>Your Goals</h1>
            <p>Save for what matters most</p>
          </div>
          <div class="header-right">
            <div class="fallback-header-avatar" *ngIf="!data.user?.avatar">
              <i class="ph ph-user"></i>
            </div>
            <img *ngIf="data.user?.avatar" [src]="data.user?.avatar" alt="Avatar" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-light);">
          </div>
        </header>

        <div class="dashboard-body" *ngIf="data.stats">
          <div class="goals-container">
            <div class="card goal-hero-card">
              <div class="goal-hero-content">
                <div class="goal-info">
                  <span class="badge orange">Primary Goal</span>
                  <h2>{{ isEditingGoal ? (goalForm.name || data.stats.goalName) : data.stats.goalName }}</h2>
                  <p class="goal-desc">Set your target, track progress, and plan how quickly you can achieve it.</p>

                  <div class="goal-edit-grid" *ngIf="isEditingGoal; else readonlyGoalMeta">
                    <div class="input-group">
                      <label>Goal Name</label>
                      <input type="text" [(ngModel)]="goalForm.name" placeholder="e.g. Emergency Fund">
                    </div>
                    <div class="input-group">
                      <label>Target Amount</label>
                      <div class="currency-wrap">
                        <span>₹</span>
                        <input type="number" [(ngModel)]="goalForm.required" min="1" placeholder="100000">
                      </div>
                    </div>
                    <div class="goal-edit-actions">
                      <button class="primary-btn" (click)="saveGoal(data.stats)">Save Goal</button>
                      <button class="ghost-btn" (click)="cancelGoalEdit(data.stats)">Cancel</button>
                    </div>
                  </div>

                  <ng-template #readonlyGoalMeta>
                    <div class="goal-meta-row">
                      <span class="goal-meta-item">Target ₹{{ data.stats.goalRequired | number:'1.0-0' }}</span>
                      <span class="goal-meta-item">Progress {{ getGoalProgress(data.stats) }}</span>
                      <button class="ghost-btn" (click)="startGoalEdit(data.stats)">
                        <i class="ph ph-pencil-simple"></i> Edit Goal
                      </button>
                    </div>
                  </ng-template>
                  
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
                      <input type="number" [(ngModel)]="fundAmount" placeholder="Enter amount" min="1">
                    </div>
                    <button class="primary-btn" (click)="fundGoal()" [disabled]="!fundAmount || fundAmount <= 0">
                      <i class="ph ph-hand-coins"></i> Fund Goal
                    </button>
                    <button class="ghost-btn" (click)="resetGoalCollected()" [disabled]="data.stats.goalCollected <= 0">
                      Reset Collected
                    </button>
                  </div>

                  <div class="quick-fund" *ngIf="data.stats.goalCollected < data.stats.goalRequired">
                    <span class="quick-label">Quick Add:</span>
                    <button class="chip-btn" *ngFor="let option of quickFundOptions" (click)="fundQuickAmount(option)">+₹{{ option | number:'1.0-0' }}</button>
                  </div>

                  <div class="goal-complete" *ngIf="data.stats.goalCollected >= data.stats.goalRequired">
                    <i class="ph ph-check-circle"></i>
                    <span>Goal Achieved! 🎉</span>
                  </div>

                  <div class="action-message" *ngIf="actionMessage">{{ actionMessage }}</div>
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

              <div class="milestones">
                <div class="milestone-track">
                  <div class="milestone-progress" [style.width]="getGoalProgress(data.stats)"></div>
                  <div class="milestone-point" style="left: 0%"><span class="milestone-label">Start</span></div>
                  <div class="milestone-point" [class.reached]="isMilestoneReached(data.stats, 25)" style="left: 25%"><span class="milestone-label">25%</span></div>
                  <div class="milestone-point" [class.reached]="isMilestoneReached(data.stats, 50)" style="left: 50%"><span class="milestone-label">50%</span></div>
                  <div class="milestone-point" [class.reached]="isMilestoneReached(data.stats, 75)" style="left: 75%"><span class="milestone-label">75%</span></div>
                  <div class="milestone-point" [class.reached]="isMilestoneReached(data.stats, 100)" style="left: 100%"><span class="milestone-label">Target</span></div>
                </div>
                <div class="milestone-badges">
                  <span class="milestone-badge" *ngFor="let m of milestones" [class.unlocked]="isMilestoneReached(data.stats, m)">
                    {{ m }}% {{ isMilestoneReached(data.stats, m) ? 'Unlocked' : 'Locked' }}
                  </span>
                </div>
              </div>
            </div>

            <div class="planner-grid">
              <div class="card planner-card">
                <h3>Goal Planner</h3>
                <p class="planner-sub">Set a monthly contribution and optional target date for a smarter plan.</p>
                <div class="planner-fields">
                  <div class="input-group">
                    <label>Monthly Contribution</label>
                    <div class="currency-wrap">
                      <span>₹</span>
                      <input type="number" [(ngModel)]="planner.monthlyContribution" min="1" (ngModelChange)="persistGoalPlanner()">
                    </div>
                  </div>
                  <div class="input-group">
                    <label>Target Date</label>
                    <input type="date" [(ngModel)]="planner.targetDate" (ngModelChange)="persistGoalPlanner()">
                  </div>
                </div>

                <div class="planner-stats">
                  <div class="mini-stat">
                    <span>Projected Completion</span>
                    <strong>{{ getEstimatedCompletionDate(data.stats) }}</strong>
                  </div>
                  <div class="mini-stat" *ngIf="planner.targetDate">
                    <span>Needed Per Month</span>
                    <strong>₹{{ getRequiredMonthlyAmount(data.stats) | number:'1.0-0' }}</strong>
                  </div>
                  <div class="mini-stat" *ngIf="planner.targetDate">
                    <span>Plan Status</span>
                    <strong [class.on-track]="isPlanOnTrack(data.stats)" [class.off-track]="!isPlanOnTrack(data.stats)">
                      {{ isPlanOnTrack(data.stats) ? 'On Track' : 'Needs Boost' }}
                    </strong>
                  </div>
                </div>
              </div>

              <div class="card activity-card">
                <h3>Funding Activity</h3>
                <p class="planner-sub">Recent contributions added from this device.</p>
                <div class="activity-empty" *ngIf="fundingHistory.length === 0">No contributions yet. Add your first funding entry today.</div>
                <ul class="activity-list" *ngIf="fundingHistory.length > 0">
                  <li *ngFor="let item of fundingHistory">
                    <span class="activity-amount">+₹{{ item.amount | number:'1.0-0' }}</span>
                    <span class="activity-date">{{ item.date | date:'medium' }}</span>
                  </li>
                </ul>
              </div>

              <div class="card momentum-card">
                <h3>Momentum & Coach</h3>
                <p class="planner-sub">Build consistency and stay ahead with simple weekly guidance.</p>
                <div class="planner-stats">
                  <div class="mini-stat">
                    <span>Contribution Streak</span>
                    <strong>{{ getCurrentStreak() }} day{{ getCurrentStreak() === 1 ? '' : 's' }}</strong>
                  </div>
                  <div class="mini-stat">
                    <span>This Week Added</span>
                    <strong>₹{{ getThisWeekContributionTotal() | number:'1.0-0' }}</strong>
                  </div>
                  <div class="mini-stat">
                    <span>Weekly Target</span>
                    <strong>₹{{ getWeeklyTarget() | number:'1.0-0' }}</strong>
                  </div>
                </div>

                <div class="weekly-progress-wrap">
                  <div class="weekly-progress-head">
                    <span>Weekly Challenge</span>
                    <span>{{ getWeeklyCompletionPercent() }}%</span>
                  </div>
                  <div class="mini-progress"><div class="fill" [style.width.%]="getWeeklyCompletionPercent()"></div></div>
                </div>

                <div class="coach-tip" *ngIf="getRecommendedTopUp(data.stats) > 0">
                  <span>Coach Tip: add <b>₹{{ getRecommendedTopUp(data.stats) | number:'1.0-0' }}</b> to stay on track this month.</span>
                  <button class="chip-btn" (click)="applyRecommendedTopUp(data.stats)">Add Tip Amount</button>
                </div>
              </div>
            </div>

            <div class="future-goals">
               <h3>Suggested Goals</h3>
               <div class="goals-grid">
                  <div class="card secondary-goal" *ngFor="let goal of suggestedGoals">
                    <div class="goal-icon" [ngClass]="goal.theme"><i [class]="goal.icon"></i></div>
                    <h4>{{ goal.name }}</h4>
                    <p>₹{{ goal.required | number:'1.0-0' }}</p>
                    <button class="ghost-btn" (click)="applySuggestedGoal(goal)">Use This Goal</button>
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
    .goals-container { display: flex; flex-direction: column; gap: 24px; }
    .goal-hero-content { display: flex; gap: 48px; align-items: center; margin-bottom: 40px; }
    
    .goal-info { flex: 1; width: 100%; }
    .goal-info h2 { font-size: 28px; color: var(--text-dark); margin-bottom: 12px; }
    .goal-desc { color: var(--text-muted); line-height: 1.6; margin-bottom: 28px; max-width: 400px; }

    .goal-meta-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
    .goal-meta-item { padding: 6px 10px; border-radius: 999px; background: var(--bg-chip); color: var(--text-muted); font-weight: 600; font-size: 12px; }
    .goal-edit-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .goal-edit-actions { display: flex; gap: 10px; align-items: end; }
    .input-group { display: flex; flex-direction: column; gap: 6px; }
    .input-group label { color: var(--text-muted); font-size: 12px; font-weight: 600; }
    .input-group input { border: 1px solid var(--border-light); border-radius: 10px; padding: 10px 12px; outline: none; background: var(--bg-input); color: var(--text-dark); }
    .input-group input:focus { border-color: var(--primary-blue); }
    .currency-wrap { position: relative; }
    .currency-wrap span { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-weight: 600; }
    .currency-wrap input { padding-left: 24px; width: 100%; }

    .goal-stats-row { display: flex; gap: 36px; margin-bottom: 32px; flex-wrap: wrap; }
    .stat-item { display: flex; flex-direction: column; gap: 4px; min-width: 100px; }
    .stat-item .label { font-size: 12px; color: var(--text-muted); font-weight: 500; }
    .stat-item .value { font-size: 20px; font-weight: 700; color: var(--text-dark); }
    .stat-item .value.success { color: var(--success-green); }

    .fund-action { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .fund-input-group { position: relative; }
    .currency-label { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-weight: 600; }
    .fund-input-group input { padding: 12px 14px 12px 30px; border-radius: 12px; border: 1px solid var(--border-light); font-size: 14px; width: 140px; outline: none; background: var(--bg-input); color: var(--text-dark); }
    .fund-input-group input:focus { border-color: var(--primary-blue); }
    .quick-fund { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 14px; }
    .quick-label { color: var(--text-muted); font-size: 12px; font-weight: 600; }
    .chip-btn { border: 1px solid var(--border-light); background: var(--bg-card); color: var(--text-dark); border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .chip-btn:hover { border-color: var(--primary-blue); color: var(--primary-blue); }
    .action-message { margin-top: 12px; color: var(--text-muted); font-size: 13px; }

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
    .milestone-point.reached { border-color: var(--warning-orange); }
    .milestone-label { position: absolute; top: 22px; left: 50%; transform: translateX(-50%); font-size: 10px; font-weight: 600; color: var(--text-muted); white-space: nowrap; }
    .milestone-badges { margin-top: 30px; display: flex; flex-wrap: wrap; gap: 10px; }
    .milestone-badge { border-radius: 999px; border: 1px solid var(--border-light); padding: 6px 10px; font-size: 12px; color: var(--text-muted); font-weight: 600; }
    .milestone-badge.unlocked { color: var(--success-green); border-color: var(--success-green); }

    .planner-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; }
    .planner-card, .activity-card { padding: 24px; }
    .planner-sub { color: var(--text-muted); margin-bottom: 14px; font-size: 13px; }
    .planner-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .planner-stats { margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
    .mini-stat { background: var(--bg-chip); border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
    .mini-stat span { color: var(--text-muted); font-size: 11px; font-weight: 600; }
    .mini-stat strong { color: var(--text-dark); font-size: 14px; }
    .mini-stat strong.on-track { color: var(--success-green); }
    .mini-stat strong.off-track { color: var(--warning-orange); }

    .activity-empty { color: var(--text-muted); font-size: 13px; padding: 12px 0; }
    .activity-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .activity-list li { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 12px; background: var(--bg-chip); }
    .activity-amount { color: var(--success-green); font-weight: 700; }
    .activity-date { color: var(--text-muted); font-size: 12px; }

    .momentum-card { padding: 24px; }
    .weekly-progress-wrap { margin-top: 14px; }
    .weekly-progress-head { display: flex; justify-content: space-between; color: var(--text-muted); font-size: 12px; font-weight: 600; margin-bottom: 8px; }
    .mini-progress { height: 6px; background: var(--bg-chip); border-radius: 999px; overflow: hidden; }
    .mini-progress .fill { height: 100%; background: var(--primary-blue); }
    .coach-tip { margin-top: 14px; padding: 12px; border-radius: 12px; background: var(--bg-chip); display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; color: var(--text-dark); font-size: 13px; }

    .future-goals { margin-top: 4px; }
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

    .primary-btn,
    .ghost-btn {
      border-radius: 10px;
      border: 1px solid var(--border-light);
      font-weight: 600;
      cursor: pointer;
      padding: 10px 14px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }
    .primary-btn { background: var(--primary-blue); color: #fff; border-color: transparent; }
    .primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .ghost-btn { background: var(--bg-card); color: var(--text-dark); }
    .ghost-btn:hover { border-color: var(--primary-blue); color: var(--primary-blue); }

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

    @media (max-width: 900px) {
      .goal-hero-content { flex-direction: column; text-align: center; }
      .goal-stats-row { justify-content: center; }
      .fund-action { justify-content: center; }
      .planner-grid { grid-template-columns: 1fr; }
      .milestone-badges { justify-content: center; }
    }

    @media (max-width: 768px) {
        .menu-trigger {
            display: flex;
        }
        
        .goal-hero-card {
            padding: 24px;
        }

        .goal-edit-actions {
          align-items: stretch;
          width: 100%;
        }

        .goal-edit-actions .primary-btn,
        .goal-edit-actions .ghost-btn {
          flex: 1;
          justify-content: center;
        }
    }

    @media (max-width: 480px) {
        .fund-action {
          width: 100%;
          align-items: stretch;
        }

        .fund-input-group,
        .fund-input-group input {
          width: 100%;
        }

        .fund-action .primary-btn,
        .fund-action .ghost-btn {
          width: 100%;
          justify-content: center;
        }

        .circular-progress-large {
          width: 170px;
          height: 170px;
        }

        .circular-progress-large::before {
          width: 136px;
          height: 136px;
        }

        .progress-inner .percent {
          font-size: 30px;
        }
    }

    @media (max-width: 375px) {
        .goal-hero-card {
          padding: 16px;
        }

        .goal-info h2 {
          font-size: 22px;
        }

        .goal-stats-row {
          gap: 18px;
        }

        .stat-item .value {
          font-size: 17px;
        }

        .quick-fund {
          gap: 6px;
        }

        .chip-btn {
          padding: 5px 8px;
          font-size: 11px;
        }
    }
  `]
})
export class GoalsComponent implements OnInit {
  user$!: Observable<User | null>;
  stats$!: Observable<DashboardStats>;
  isMobileMenuOpen = false;
  fundAmount: number = 0;
  isEditingGoal = false;
  actionMessage = '';
  milestones = [25, 50, 75, 100];
  quickFundOptions = [1000, 5000, 10000, 25000];
  goalForm = {
    name: '',
    required: 100000
  };
  planner = {
    monthlyContribution: 5000,
    targetDate: ''
  };
  fundingHistory: { amount: number; date: string }[] = [];
  suggestedGoals = [
    { name: 'Paris Vacation', required: 350000, icon: 'ph ph-airplane', theme: 'blue' },
    { name: 'New Car', required: 4500000, icon: 'ph ph-car', theme: 'purple' },
    { name: 'Home Down Payment', required: 2500000, icon: 'ph ph-house', theme: 'green' },
    { name: 'Education Fund', required: 1000000, icon: 'ph ph-graduation-cap', theme: 'orange' }
  ];

  private latestStats: DashboardStats | null = null;
  private currentStorageKey = 'goals_planner_guest';
  private currentFundingKey = 'goals_funding_guest';
  private currentMilestoneKey = 'goals_milestones_guest';

  constructor(private expenseService: ExpenseService, private notificationService: NotificationService) { }

  ngOnInit(): void {
    this.user$ = this.expenseService.getUser();
    this.stats$ = this.expenseService.getStats();

    this.user$.subscribe((user) => {
      const email = (user?.email || '').trim().toLowerCase();
      this.currentStorageKey = email ? `goals_planner_${encodeURIComponent(email)}` : 'goals_planner_guest';
      this.currentFundingKey = email ? `goals_funding_${encodeURIComponent(email)}` : 'goals_funding_guest';
      this.currentMilestoneKey = email ? `goals_milestones_${encodeURIComponent(email)}` : 'goals_milestones_guest';
      this.loadPlannerState();
      this.loadFundingHistory();
    });

    this.stats$.subscribe((stats) => {
      this.latestStats = stats;
      if (!this.isEditingGoal) {
        this.goalForm.name = stats.goalName;
        this.goalForm.required = stats.goalRequired;
      }
      this.checkAndNotifyMilestones(stats);
    });
  }

  getGoalProgress(stats: DashboardStats): string {
    const progress = Math.min((stats.goalCollected / stats.goalRequired) * 100, 100);
    return `${Math.round(progress)}%`;
  }

  getGoalGradient(stats: DashboardStats): string {
    const progress = Math.min((stats.goalCollected / stats.goalRequired) * 100, 100);
    return `conic-gradient(var(--warning-orange) ${progress}%, var(--bg-chip) 0deg)`;
  }

  startGoalEdit(stats: DashboardStats) {
    this.goalForm.name = stats.goalName;
    this.goalForm.required = stats.goalRequired;
    this.isEditingGoal = true;
  }

  cancelGoalEdit(stats: DashboardStats) {
    this.isEditingGoal = false;
    this.goalForm.name = stats.goalName;
    this.goalForm.required = stats.goalRequired;
  }

  saveGoal(stats: DashboardStats) {
    const trimmedName = (this.goalForm.name || '').trim();
    const target = Number(this.goalForm.required);
    if (!trimmedName || !Number.isFinite(target) || target <= 0) {
      this.showActionMessage('Please enter a valid goal name and target amount.');
      return;
    }

    this.expenseService.updateGoal(trimmedName, target);

    if (stats.goalCollected > target) {
      this.expenseService.setGoalCollected(target);
    }

    this.isEditingGoal = false;
    this.showActionMessage('Goal updated successfully.');
  }

  applySuggestedGoal(goal: { name: string; required: number }) {
    this.goalForm.name = goal.name;
    this.goalForm.required = goal.required;
    this.expenseService.updateGoal(goal.name, goal.required);
    if (this.latestStats && this.latestStats.goalCollected > goal.required) {
      this.expenseService.setGoalCollected(goal.required);
    }
    this.showActionMessage(`${goal.name} is now your active goal.`);
  }

  resetGoalCollected() {
    this.expenseService.setGoalCollected(0);
    this.showActionMessage('Collected amount reset to ₹0.');
  }

  fundQuickAmount(amount: number) {
    this.fundAmount = amount;
    this.fundGoal();
  }

  fundGoal() {
    if (this.fundAmount > 0) {
      this.expenseService.fundGoal(this.fundAmount);
      this.prependFundingHistory(this.fundAmount);
      this.showActionMessage(`Added ₹${this.fundAmount.toLocaleString('en-IN')} to your goal.`);
      this.fundAmount = 0;
    }
  }

  isMilestoneReached(stats: DashboardStats, milestone: number): boolean {
    return this.getGoalProgressNumber(stats) >= milestone;
  }

  getEstimatedCompletionDate(stats: DashboardStats): string {
    const monthly = Number(this.planner.monthlyContribution || 0);
    const remaining = Math.max(stats.goalRequired - stats.goalCollected, 0);
    if (remaining <= 0) {
      return 'Completed';
    }

    if (!monthly || monthly <= 0) {
      return 'Set contribution';
    }

    const months = Math.ceil(remaining / monthly);
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }

  getRequiredMonthlyAmount(stats: DashboardStats): number {
    const remaining = Math.max(stats.goalRequired - stats.goalCollected, 0);
    const targetDate = this.getPlannerDate();
    if (!targetDate) {
      return 0;
    }

    const today = new Date();
    const monthDiff = Math.max(1, (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getMonth() - today.getMonth()));
    return remaining / monthDiff;
  }

  isPlanOnTrack(stats: DashboardStats): boolean {
    const requiredPerMonth = this.getRequiredMonthlyAmount(stats);
    if (!requiredPerMonth) {
      return true;
    }
    return Number(this.planner.monthlyContribution || 0) >= requiredPerMonth;
  }

  persistGoalPlanner() {
    try {
      localStorage.setItem(this.currentStorageKey, JSON.stringify(this.planner));
    } catch (error) {
      console.error('Failed to save goal planner state:', error);
    }
  }

  private getGoalProgressNumber(stats: DashboardStats): number {
    const required = Number(stats.goalRequired || 0);
    if (required <= 0) {
      return 0;
    }
    return Math.min((Number(stats.goalCollected || 0) / required) * 100, 100);
  }

  getCurrentStreak(): number {
    if (!Array.isArray(this.fundingHistory) || this.fundingHistory.length === 0) {
      return 0;
    }

    const dateSet = new Set(
      this.fundingHistory
        .map((entry) => this.toDateOnly(entry.date))
        .filter(Boolean)
    );

    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    let streak = 0;

    while (dateSet.has(cursor.toISOString().split('T')[0])) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }

  getThisWeekContributionTotal(): number {
    const weekStart = this.getWeekStart();
    return this.fundingHistory.reduce((sum, item) => {
      const date = new Date(item.date);
      if (isNaN(date.getTime())) {
        return sum;
      }
      date.setHours(0, 0, 0, 0);
      return date.getTime() >= weekStart.getTime() ? sum + Number(item.amount || 0) : sum;
    }, 0);
  }

  getWeeklyTarget(): number {
    const monthly = Number(this.planner.monthlyContribution || 0);
    if (!monthly || monthly <= 0) {
      return 0;
    }
    return monthly / 4.33;
  }

  getWeeklyCompletionPercent(): number {
    const target = this.getWeeklyTarget();
    if (!target) {
      return 0;
    }
    return Math.min(Math.round((this.getThisWeekContributionTotal() / target) * 100), 100);
  }

  getRecommendedTopUp(stats: DashboardStats): number {
    const monthly = Number(this.planner.monthlyContribution || 0);
    if (!monthly || monthly <= 0) {
      return 0;
    }

    const expectedByToday = this.getExpectedMonthlyContributionByToday(monthly);
    const thisMonthFunded = this.getThisMonthContributionTotal();
    const gap = Math.max(expectedByToday - thisMonthFunded, 0);
    const remaining = Math.max(Number(stats.goalRequired || 0) - Number(stats.goalCollected || 0), 0);
    return Math.min(Math.ceil(gap), remaining);
  }

  applyRecommendedTopUp(stats: DashboardStats) {
    const amount = this.getRecommendedTopUp(stats);
    if (amount <= 0) {
      return;
    }
    this.fundQuickAmount(amount);
  }

  private showActionMessage(message: string) {
    this.actionMessage = message;
    setTimeout(() => {
      if (this.actionMessage === message) {
        this.actionMessage = '';
      }
    }, 3500);
  }

  private loadPlannerState() {
    try {
      const raw = localStorage.getItem(this.currentStorageKey);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      this.planner.monthlyContribution = Number(parsed.monthlyContribution || 5000);
      this.planner.targetDate = String(parsed.targetDate || '');
    } catch (error) {
      console.error('Failed to load goal planner state:', error);
    }
  }

  private loadFundingHistory() {
    try {
      const raw = localStorage.getItem(this.currentFundingKey);
      if (!raw) {
        this.fundingHistory = [];
        return;
      }
      const parsed = JSON.parse(raw);
      this.fundingHistory = Array.isArray(parsed) ? parsed.slice(0, 30) : [];
    } catch (error) {
      console.error('Failed to load funding history:', error);
      this.fundingHistory = [];
    }
  }

  private prependFundingHistory(amount: number) {
    const next = [{ amount, date: new Date().toISOString() }, ...this.fundingHistory].slice(0, 30);
    this.fundingHistory = next;
    try {
      localStorage.setItem(this.currentFundingKey, JSON.stringify(next));
    } catch (error) {
      console.error('Failed to save funding history:', error);
    }
  }

  private getPlannerDate(): Date | null {
    if (!this.planner.targetDate) {
      return null;
    }
    const parsed = new Date(this.planner.targetDate);
    if (isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  }

  private getExpectedMonthlyContributionByToday(monthlyContribution: number): number {
    const now = new Date();
    const day = now.getDate();
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const ratio = totalDays > 0 ? day / totalDays : 0;
    return monthlyContribution * ratio;
  }

  private getThisMonthContributionTotal(): number {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return this.fundingHistory.reduce((sum, item) => {
      const date = new Date(item.date);
      if (isNaN(date.getTime())) {
        return sum;
      }
      return date.getMonth() === month && date.getFullYear() === year ? sum + Number(item.amount || 0) : sum;
    }, 0);
  }

  private getWeekStart(): Date {
    const now = new Date();
    const day = now.getDay();
    const daysSinceMonday = (day + 6) % 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysSinceMonday);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  private toDateOnly(value: string): string {
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) {
      return '';
    }
    parsed.setHours(0, 0, 0, 0);
    return parsed.toISOString().split('T')[0];
  }

  private checkAndNotifyMilestones(stats: DashboardStats) {
    const progress = this.getGoalProgressNumber(stats);
    let notifiedMilestones: number[] = [];

    try {
      const stored = localStorage.getItem(this.currentMilestoneKey);
      notifiedMilestones = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(notifiedMilestones)) {
        notifiedMilestones = [];
      }
    } catch {
      notifiedMilestones = [];
    }

    const newlyReached = this.milestones.filter((milestone) => progress >= milestone && !notifiedMilestones.includes(milestone));
    if (newlyReached.length === 0) {
      return;
    }

    newlyReached.forEach((milestone) => {
      this.notificationService.addNotification({
        title: `${milestone}% Milestone Reached`,
        message: `Awesome progress on ${stats.goalName}. You have reached ${milestone}% of your target.`,
        type: 'success',
        icon: 'ph-trophy',
        read: false,
        category: `goal-milestone-${milestone}`
      });
    });

    const updated = [...new Set([...notifiedMilestones, ...newlyReached])];
    localStorage.setItem(this.currentMilestoneKey, JSON.stringify(updated));
  }
}
