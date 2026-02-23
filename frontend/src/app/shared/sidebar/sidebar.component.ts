import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';


@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive],
    template: `
    <aside class="sidebar" [class.open]="isMobileOpen">
        <div class="sidebar-logo">
            <div class="logo-icon">
                <i class="ph-bold ph-wallet"></i>
            </div>
            <h2>EXPENSIFY</h2>
            <button class="close-sidebar" (click)="closeMobile.emit()">
                <i class="ph ph-x"></i>
            </button>
        </div>

        <div class="nav-groups">
            <div class="nav-group">
                <ul>
                    <li><a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" (click)="closeMobile.emit()"><i class="ph ph-squares-four"></i> Dashboard</a></li>
                    <li><a routerLink="/expenses" routerLinkActive="active" (click)="closeMobile.emit()"><i class="ph ph-receipt"></i> All Expenses</a></li>
                    <li><a routerLink="/subscriptions" routerLinkActive="active" (click)="closeMobile.emit()"><i class="ph ph-ticket"></i> Subscriptions</a></li>
                    <li><a routerLink="/investments" routerLinkActive="active" (click)="closeMobile.emit()"><i class="ph ph-trend-up"></i> Investment</a></li>
                    <li><a routerLink="/cards" routerLinkActive="active" (click)="closeMobile.emit()"><i class="ph ph-credit-card"></i> Cards & Banks</a></li>
                    <li><a routerLink="/goals" routerLinkActive="active" (click)="closeMobile.emit()"><i class="ph ph-target"></i> Goals</a></li>
                </ul>
            </div>

            <div class="nav-group tools-group">
                <h4 class="nav-title">Tools</h4>
                <ul>
                    <li><a routerLink="/settings" routerLinkActive="active" (click)="closeMobile.emit()"><i class="ph ph-gear"></i> Settings</a></li>
                    <li>
                        <a href="javascript:void(0)" (click)="toggleTheme()" class="theme-toggle-link">
                            <i class="ph" [ngClass]="(themeService.isDarkMode$ | async) ? 'ph-sun' : 'ph-moon'"></i>
                            {{ (themeService.isDarkMode$ | async) ? 'Light Mode' : 'Dark Mode' }}
                            <span class="theme-indicator" [class.dark]="themeService.isDarkMode$ | async"></span>
                        </a>
                    </li>
                </ul>
            </div>
        </div>

        <div class="sidebar-bottom">
            <ul class="nav-group-bottom">
                <li><a class="logout-link" href="javascript:void(0)" (click)="logout()"><i class="ph ph-sign-out"></i> Logout</a></li>
            </ul>
        </div>
    </aside>
    <div class="sidebar-overlay" *ngIf="isMobileOpen" (click)="closeMobile.emit()"></div>

  `,
    styles: [`
    .sidebar {
        width: var(--sidebar-width);
        background-color: var(--bg-sidebar);
        border-right: 1px solid var(--border-light);
        display: flex;
        flex-direction: column;
        padding: 28px 20px;
        position: fixed;
        height: 100vh;
        left: 0;
        top: 0;
        transition: background-color var(--transition-normal), border-color var(--transition-normal);
        z-index: 20;
    }

    .sidebar-logo {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 40px;
        padding: 0 8px;
    }

    .logo-icon {
        width: 38px;
        height: 38px;
        background: linear-gradient(135deg, var(--primary-blue), var(--investment-purple));
        color: white;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
    }

    .sidebar-logo h2 {
        font-size: 18px;
        letter-spacing: 1px;
        font-weight: 800;
    }

    .nav-groups {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 24px;
    }

    .nav-title {
        color: var(--text-muted);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        margin-bottom: 12px;
        padding-left: 12px;
    }

    ul {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .nav-group a,
    .nav-group-bottom a {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        border-radius: 12px;
        color: var(--text-main);
        font-weight: 500;
        font-size: 14px;
        transition: all var(--transition-fast);
        text-decoration: none;
        cursor: pointer;
    }

    .nav-group a i,
    .nav-group-bottom a i {
        font-size: 20px;
    }

    .nav-group a.active {
        background-color: var(--primary-blue-light);
        color: var(--primary-blue);
        font-weight: 600;
    }

    .nav-group a:hover,
    .nav-group-bottom a:hover {
        background-color: var(--bg-hover);
        color: var(--text-dark);
    }

    .sidebar-bottom {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .logout-link {
        color: var(--danger-red) !important;
    }

    .logout-link:hover {
        background-color: rgba(239, 68, 68, 0.1) !important;
    }

    /* Theme Toggle */
    .theme-toggle-link {
        position: relative;
    }
    .theme-indicator {
        margin-left: auto;
        width: 32px;
        height: 18px;
        background: var(--bg-chip);
        border-radius: 9px;
        position: relative;
        transition: background var(--transition-fast);
    }
    .theme-indicator::after {
        content: "";
        position: absolute;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--text-muted);
        top: 2px;
        left: 2px;
        transition: all 0.2s;
    }
    .theme-indicator.dark {
        background: var(--primary-blue);
    }
    .theme-indicator.dark::after {
        left: 16px;
        background: white;
    }
    .close-sidebar {
        display: none;
        background: none;
        border: none;
        color: var(--text-main);
        font-size: 24px;
        cursor: pointer;
        padding: 4px;
        margin-left: auto;
    }

    .sidebar-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0,0,0,0.5);
        backdrop-filter: blur(4px);
        z-index: 15;
    }

    @media (max-width: 768px) {
        .close-sidebar {
            display: flex;
            align-items: center;
            justify-content: center;
        }
    }
  `]

})
export class SidebarComponent {
    @Input() isMobileOpen = false;
    @Output() closeMobile = new EventEmitter<void>();

    constructor(
        private authService: AuthService,
        public themeService: ThemeService
    ) { }


    toggleTheme() {
        this.themeService.toggle();
    }

    logout() {
        this.authService.logout();
    }
}
