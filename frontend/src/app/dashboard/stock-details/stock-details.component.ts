import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { RouterLink } from '@angular/router';
import { ExpenseService } from '../../services/expense.service';
import { InvestedMarketQuote, MarketDataResponse, User } from '../../services/models';
import { Observable, BehaviorSubject, combineLatest, timer, switchMap, catchError, of, finalize } from 'rxjs';

@Component({
  selector: 'app-stock-details',
  standalone: true,
  imports: [CommonModule, SidebarComponent, RouterLink],
  template: `
    <main class="dashboard-layout" *ngIf="{ user: user$ | async, marketData: marketData$ | async } as data">
      <app-sidebar [isMobileOpen]="isMobileMenuOpen" (closeMobile)="isMobileMenuOpen = false"></app-sidebar>

      <div class="main-content">
        <header class="top-header">
          <div class="header-left">
            <button class="menu-trigger" (click)="isMobileMenuOpen = !isMobileMenuOpen">
              <i class="ph ph-list"></i>
            </button>
            <h1>Stock Details</h1>
            <p>Live market updates and your stock performance</p>
          </div>
          <div class="header-right">
            <a routerLink="/investments" class="outline-btn">
              <i class="ph ph-arrow-left"></i> Back to Investments
            </a>
            <button class="primary-btn" (click)="refreshMarketData()" [disabled]="isMarketLoading">
              <i class="ph ph-arrows-clockwise"></i>
              {{ isMarketLoading ? 'Refreshing...' : 'Refresh now' }}
            </button>
            <div class="fallback-header-avatar" *ngIf="!data.user?.avatar">
              <i class="ph ph-user"></i>
            </div>
            <img *ngIf="data.user?.avatar" [src]="data.user?.avatar" alt="Avatar" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-light);">
          </div>
        </header>

        <div class="dashboard-body">
          <div class="card market-card" *ngIf="data.marketData as market">
            <div class="market-header">
              <div>
                <div class="market-title-row">
                  <h3>Live Market</h3>
                  <span class="market-status-badge" [ngClass]="market.marketOpen ? 'market-open' : 'market-closed'">
                    <span class="status-dot"></span>
                    {{ market.marketOpen ? 'Open' : 'Closed' }}
                  </span>
                </div>
                <p *ngIf="market.marketOpen">NSE is open &bull; Live prices from {{ market.source }}</p>
                <p *ngIf="!market.marketOpen">NSE is closed &bull; Last close prices from {{ market.source }}</p>
              </div>
              <span class="market-updated" *ngIf="market.asOf">Updated {{ market.asOf | date:'shortTime' }}</span>
            </div>

            <div class="index-grid" *ngIf="market.indices.length">
              <div class="index-item" *ngFor="let quote of market.indices">
                <div class="index-name-row">
                  <div class="index-name">{{ quote.name }}</div>
                  <span class="market-badge">{{ quote.exchange }} • {{ quote.currency }}</span>
                </div>
                <div class="index-value">{{ quote.price | number:'1.2-2' }}</div>
                <div class="market-move" [ngClass]="{ positive: quote.change >= 0, negative: quote.change < 0 }">
                  {{ quote.change >= 0 ? '+' : '' }}{{ quote.change | number:'1.2-2' }}
                  ({{ quote.changePercent >= 0 ? '+' : '' }}{{ quote.changePercent | number:'1.2-2' }}%)
                </div>
              </div>
            </div>

            <div class="gainers-losers-grid">
              <div class="market-list-card">
                <h4>Top Gainers</h4>
                <div class="market-row" *ngFor="let quote of market.topGainers | slice:0:8">
                  <div class="row-name">
                    <strong>{{ quote.symbol }}</strong>
                    <span>{{ quote.name }}</span>
                  </div>
                  <div class="row-metrics">
                    <span class="market-badge">{{ quote.exchange }} • {{ quote.currency }}</span>
                    <span>{{ quote.price | number:'1.2-2' }}</span>
                    <span class="positive">{{ quote.changePercent >= 0 ? '+' : '' }}{{ quote.changePercent | number:'1.2-2' }}%</span>
                  </div>
                </div>
              </div>

              <div class="market-list-card">
                <h4>Top Losers</h4>
                <div class="market-row" *ngFor="let quote of market.topLosers | slice:0:8">
                  <div class="row-name">
                    <strong>{{ quote.symbol }}</strong>
                    <span>{{ quote.name }}</span>
                  </div>
                  <div class="row-metrics">
                    <span class="market-badge">{{ quote.exchange }} • {{ quote.currency }}</span>
                    <span>{{ quote.price | number:'1.2-2' }}</span>
                    <span class="negative">{{ quote.changePercent >= 0 ? '+' : '' }}{{ quote.changePercent | number:'1.2-2' }}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="market-list-card">
              <h4>Your Stocks Performance</h4>
              <div *ngIf="market.investedStocks.length > 0; else noStocksPerformance">
                <div class="stock-summary-row" *ngFor="let quote of (showAllStocks ? market.investedStocks : (market.investedStocks | slice:0:3))">
                  <div class="row-name">
                    <strong>{{ quote.symbol }}</strong>
                    <span>{{ quote.investmentName }}</span>
                  </div>
                  <div class="row-metrics">
                    <span class="market-badge">{{ quote.exchange }} • {{ quote.currency }}</span>
                    <span>₹{{ quote.price | number:'1.2-2' }}</span>
                    <span class="market-move" [ngClass]="{ positive: quote.change >= 0, negative: quote.change < 0 }">
                      {{ quote.changePercent >= 0 ? '+' : '' }}{{ quote.changePercent | number:'1.2-2' }}%
                    </span>
                    <button type="button" class="show-performance-link" (click)="openPerformanceModal(quote)">
                      Show Performance
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  class="toggle-list-btn"
                  *ngIf="market.investedStocks.length > 3"
                  (click)="toggleStockList()">
                  {{ showAllStocks ? 'Collapse' : ('View All (' + market.investedStocks.length + ')') }}
                </button>
              </div>
              <ng-template #noStocksPerformance>
                <div class="market-empty">No stock performance data yet. Add stock investments to see live performance.</div>
              </ng-template>
            </div>

            <div class="market-note" *ngIf="market.unresolvedStocks.length">
              Add stock ticker in investment name for better mapping (example: Reliance (RELIANCE)).
            </div>

            <div class="market-note" *ngIf="market.investedStocks.length === 0 && market.unresolvedStocks.length > 0">
              Some stocks could not be mapped automatically. Try NSE ticker format like TCS, INFY, HDFCBANK.
            </div>
          </div>

          <div class="card empty-card" *ngIf="!data.marketData">
            <i class="ph ph-warning-circle"></i>
            <p>Unable to load stock details right now. Please refresh.</p>
          </div>
        </div>
      </div>

      <div class="performance-modal-overlay" *ngIf="selectedPerformanceStock" (click)="closePerformanceModal()">
        <div class="performance-modal-card" (click)="$event.stopPropagation()">
          <div class="performance-modal-header">
            <div>
              <h3>{{ selectedPerformanceStock.symbol }}</h3>
              <p>{{ selectedPerformanceStock.investmentName }}</p>
            </div>
            <button class="close-btn" (click)="closePerformanceModal()"><i class="ph ph-x"></i></button>
          </div>

          <div class="performance-grid">
            <div class="performance-item">
              <span>Total Invested</span>
              <strong>₹{{ selectedPerformanceStock.totalInvested | number:'1.2-2' }}</strong>
            </div>
            <div class="performance-item">
              <span>Shares Held</span>
              <strong>{{ selectedPerformanceStock.sharesHeld | number:'1.4-4' }}</strong>
            </div>
            <div class="performance-item">
              <span>Current Price</span>
              <strong>₹{{ selectedPerformanceStock.price | number:'1.2-2' }}</strong>
            </div>
            <div class="performance-item">
              <span>Current Value</span>
              <strong>₹{{ selectedPerformanceStock.currentValue | number:'1.2-2' }}</strong>
            </div>
            <div class="performance-item">
              <span>Today Change</span>
              <strong [ngClass]="selectedPerformanceStock.change >= 0 ? 'positive' : 'negative'">
                {{ selectedPerformanceStock.change >= 0 ? '+' : '' }}₹{{ selectedPerformanceStock.change | number:'1.2-2' }}
                ({{ selectedPerformanceStock.changePercent >= 0 ? '+' : '' }}{{ selectedPerformanceStock.changePercent | number:'1.2-2' }}%)
              </strong>
            </div>
            <div class="performance-item">
              <span>Total P&L</span>
              <strong [ngClass]="selectedPerformanceStock.pnl >= 0 ? 'positive' : 'negative'">
                {{ selectedPerformanceStock.pnl >= 0 ? '+' : '' }}₹{{ selectedPerformanceStock.pnl | number:'1.2-2' }}
                ({{ selectedPerformanceStock.pnlPercent >= 0 ? '+' : '' }}{{ selectedPerformanceStock.pnlPercent | number:'1.2-2' }}%)
              </strong>
            </div>
          </div>
        </div>
      </div>
    </main>
  `,
  styles: [`
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

    .market-card { padding: 24px; }
    .market-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 18px; }
    .market-header p { margin: 4px 0 0; font-size: 12px; color: var(--text-muted); }
    .market-title-row { display: flex; align-items: center; gap: 10px; }
    .market-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 20px;
      line-height: 1;
    }
    .market-status-badge.market-open {
      background: rgba(16, 185, 129, 0.12);
      color: #10B981;
      border: 1px solid rgba(16, 185, 129, 0.25);
    }
    .market-status-badge.market-closed {
      background: rgba(100, 116, 139, 0.1);
      color: var(--text-muted);
      border: 1px solid var(--border-light);
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      flex-shrink: 0;
    }
    .market-updated { font-size: 12px; color: var(--text-muted); }
    .index-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 14px; }
    .index-item { border: 1px solid var(--border-light); border-radius: 12px; padding: 12px; background: var(--bg-main); }
    .index-name-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .index-name { font-size: 12px; color: var(--text-muted); }
    .index-value { font-size: 20px; font-weight: 700; color: var(--text-dark); margin: 4px 0; }
    .market-move { font-size: 12px; font-weight: 600; }
    .positive { color: var(--success-green); }
    .negative { color: var(--danger-red); }
    .gainers-losers-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 12px; }
    .market-list-card { border: 1px solid var(--border-light); border-radius: 12px; padding: 12px; background: var(--bg-main); }
    .market-list-card h4 { margin-bottom: 10px; font-size: 14px; }
    .market-row { display: flex; justify-content: space-between; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-light); }
    .market-row:last-child { border-bottom: none; }
    .row-name { min-width: 0; display: flex; flex-direction: column; }
    .row-name strong { font-size: 12px; color: var(--text-dark); }
    .row-name span { font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px; }
    .stock-summary-row { display: flex; justify-content: space-between; gap: 10px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-light); }
    .stock-summary-row:last-child { border-bottom: none; }
    .row-metrics { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: var(--text-dark); }
    .show-performance-link {
      border: none;
      background: transparent;
      color: var(--primary-blue);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .show-performance-link:hover { opacity: 0.85; }
    .toggle-list-btn {
      margin-top: 10px;
      border: 1px solid var(--border-light);
      background: var(--bg-main);
      color: var(--text-dark);
      border-radius: 10px;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .toggle-list-btn:hover { background: var(--bg-hover); }
    .market-badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 999px;
      border: 1px solid var(--border-light);
      background: var(--bg-chip);
      color: var(--text-muted);
      white-space: nowrap;
    }
    .market-empty { font-size: 12px; color: var(--text-muted); padding: 6px 0 2px; }
    .market-note { margin-top: 10px; font-size: 12px; color: var(--text-muted); }

    .empty-card {
      padding: 28px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      color: var(--text-muted);
    }

    .performance-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 23, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
    }
    .performance-modal-card {
      width: min(620px, 100%);
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      border-radius: 14px;
      padding: 18px;
    }
    .performance-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 14px;
    }
    .performance-modal-header h3 {
      margin: 0;
      font-size: 18px;
      color: var(--text-dark);
    }
    .performance-modal-header p {
      margin: 4px 0 0;
      font-size: 12px;
      color: var(--text-muted);
    }
    .performance-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .performance-item {
      border: 1px solid var(--border-light);
      background: var(--bg-main);
      border-radius: 10px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .performance-item span {
      font-size: 11px;
      color: var(--text-muted);
    }
    .performance-item strong {
      font-size: 14px;
      color: var(--text-dark);
    }

    @media (max-width: 900px) {
      .menu-trigger { display: flex; }
      .index-grid,
      .gainers-losers-grid {
        grid-template-columns: 1fr;
      }

      .top-header .header-right {
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
    }

    @media (max-width: 768px) {
      .market-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .row-metrics {
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .stock-summary-row {
        flex-direction: column;
        align-items: flex-start;
      }

      .row-metrics {
        width: 100%;
      }

      .performance-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class StockDetailsComponent implements OnInit {
  user$!: Observable<User | null>;
  marketData$!: Observable<MarketDataResponse | null>;

  isMobileMenuOpen = false;
  isMarketLoading = false;
  showAllStocks = false;
  selectedPerformanceStock: InvestedMarketQuote | null = null;

  private marketRefresh$ = new BehaviorSubject<number>(Date.now());

  constructor(private expenseService: ExpenseService) {}

  ngOnInit(): void {
    this.user$ = this.expenseService.getUser();

    this.marketData$ = combineLatest([
      timer(0, 120000),
      this.marketRefresh$
    ]).pipe(
      switchMap(() => {
        this.isMarketLoading = true;
        return this.expenseService.getMarketData().pipe(
          catchError((err) => {
            console.error('Failed to load market data:', err);
            return of(null);
          }),
          finalize(() => {
            this.isMarketLoading = false;
          })
        );
      })
    );
  }

  refreshMarketData(): void {
    if (this.isMarketLoading) {
      return;
    }

    this.marketRefresh$.next(Date.now());
  }

  openPerformanceModal(stock: InvestedMarketQuote): void {
    this.selectedPerformanceStock = stock;
  }

  closePerformanceModal(): void {
    this.selectedPerformanceStock = null;
  }

  toggleStockList(): void {
    this.showAllStocks = !this.showAllStocks;
  }
}
