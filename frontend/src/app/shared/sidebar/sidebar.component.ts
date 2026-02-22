import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive],
    template: `
    <aside class="sidebar">
        <div class="sidebar-logo">
            <div class="logo-icon">
                <i class="ph-bold ph-wallet"></i>
            </div>
            <h2>EXPENSIFY</h2>
        </div>

        <div class="nav-groups">
            <div class="nav-group">
                <ul>
                    <li><a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}"><i class="ph ph-squares-four"></i> Dashboard</a></li>
                    <li><a routerLink="/expenses" routerLinkActive="active"><i class="ph ph-receipt"></i> All Expenses</a></li>
                    <li><a routerLink="/subscriptions" routerLinkActive="active"><i class="ph ph-ticket"></i> Bill & Subscription</a></li>
                    <li><a routerLink="/investments" routerLinkActive="active"><i class="ph ph-trend-up"></i> Investment</a></li>
                    <li><a routerLink="/cards" routerLinkActive="active"><i class="ph ph-credit-card"></i> Card</a></li>
                    <li><a routerLink="/goals" routerLinkActive="active"><i class="ph ph-target"></i> Goals</a></li>
                </ul>
            </div>

            <div class="nav-group tools-group">
                <h4 class="nav-title">Tools</h4>
                <ul>
                    <li><a routerLink="/settings" routerLinkActive="active"><i class="ph ph-gear"></i> Setting</a></li>
                    <li><a href="#"><i class="ph ph-question"></i> Help Center</a></li>
                    <li><a href="#"><i class="ph ph-headset"></i> Support</a></li>
                </ul>
            </div>
        </div>

        <div class="sidebar-bottom">
            <ul class="nav-group-bottom">
                <li><a class="logout-link" href="javascript:void(0)" (click)="logout()"><i class="ph ph-sign-out"></i> Logout</a></li>
            </ul>
        </div>
    </aside>
  `,
    styles: [`
    .sidebar {
        width: var(--sidebar-width);
        background-color: var(--bg-sidebar);
        border-right: 1px solid var(--border-light);
        display: flex;
        flex-direction: column;
        padding: 32px 24px;
        position: fixed;
        height: 100vh;
        left: 0;
        top: 0;
    }

    .sidebar-logo {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 48px;
    }

    .logo-icon {
        width: 40px;
        height: 40px;
        background-color: var(--primary-blue);
        color: white;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
    }

    .sidebar-logo h2 {
        font-size: 20px;
        letter-spacing: 0.5px;
    }

    .nav-groups {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 32px;
    }

    .nav-title {
        color: var(--text-muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 16px;
        padding-left: 12px;
    }

    ul {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .nav-group a,
    .nav-group-bottom a {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-radius: 12px;
        color: var(--text-main);
        font-weight: 500;
        transition: all 0.2s ease;
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
    }

    .nav-group a:hover,
    .nav-group-bottom a:hover {
        background-color: white;
        color: var(--text-dark);
    }

    .sidebar-bottom {
        display: flex;
        flex-direction: column;
        gap: 24px;
    }

    .logout-link {
        color: var(--danger-red) !important;
    }

    .logout-link:hover {
        background-color: #FEF2F2 !important;
    }

    .pro-card {
        background-color: var(--primary-blue);
        border-radius: 20px;
        padding: 24px 20px;
        color: white;
        text-align: center;
        position: relative;
        overflow: hidden;
    }

    .pro-icon {
        width: 40px;
        height: 40px;
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
        font-size: 20px;
    }

    .pro-card h4 {
        color: white;
        font-size: 16px;
        margin-bottom: 8px;
    }

    .pro-card p {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.5;
    }
  `]
})
export class SidebarComponent {
    constructor(private authService: AuthService) { }

    logout() {
        this.authService.logout();
    }
}
