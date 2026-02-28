import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { SignupComponent } from './auth/signup/signup.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AllExpensesComponent } from './dashboard/all-expenses/all-expenses.component';
import { GoalsComponent } from './dashboard/goals/goals.component';
import { SubscriptionsComponent } from './dashboard/subscriptions/subscriptions.component';
import { InvestmentsComponent } from './dashboard/investments/investments.component';
import { CardsComponent } from './dashboard/cards/cards.component';
import { SettingsComponent } from './dashboard/settings/settings.component';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'signup', component: SignupComponent },
    {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [authGuard]
    },
    {
        path: 'expenses',
        component: AllExpensesComponent,
        canActivate: [authGuard]
    },
    {
        path: 'goals',
        component: GoalsComponent,
        canActivate: [authGuard]
    },
    {
        path: 'subscriptions',
        component: SubscriptionsComponent,
        canActivate: [authGuard]
    },
    {
        path: 'investments',
        component: InvestmentsComponent,
        canActivate: [authGuard]
    },
    {
        path: 'cards',
        component: CardsComponent,
        canActivate: [authGuard]
    },
    {
        path: 'settings',
        component: SettingsComponent,
        canActivate: [authGuard]
    },
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: '**', redirectTo: '/login' }
];
