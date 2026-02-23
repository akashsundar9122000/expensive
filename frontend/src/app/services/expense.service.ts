import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin, tap } from 'rxjs';
import { Transaction, Subscription, Investment, DashboardStats, User, Budget } from './models';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class ExpenseService {
    private stats = new BehaviorSubject<DashboardStats>(this.getDefaultStats());
    private transactions = new BehaviorSubject<Transaction[]>([]);
    private subscriptions = new BehaviorSubject<Subscription[]>([]);
    private investments = new BehaviorSubject<Investment[]>([]);
    private budgets = new BehaviorSubject<Budget[]>([]);
    private user = new BehaviorSubject<User | null>(null);
    private apiUrl = '/api/expenses';

    constructor(private authService: AuthService, private http: HttpClient) {
        this.authService.getCurrentUser().subscribe(user => {
            if (user) {
                this.refreshAllData();
            } else {
                this.resetData();
            }
        });
    }

    private getDefaultStats(): DashboardStats {
        return {
            balance: 0,
            monthlyExpenses: 0,
            totalInvestment: 0,
            investAmount: 0,
            goalName: 'Savings Goal',
            goalRequired: 100000,
            goalCollected: 0,
            bankBalances: {}
        };
    }

    private refreshAllData() {
        forkJoin([
            this.authService.getCurrentUser().pipe(tap(user => this.user.next(user))),
            this.http.get<Transaction[]>(`${this.apiUrl}/transactions`),
            this.http.get<Subscription[]>(`${this.apiUrl}/subscriptions`),
            this.http.get<Investment[]>(`${this.apiUrl}/investments`),
            this.http.get<Budget[]>(`${this.apiUrl}/budgets`),
            this.http.get<DashboardStats>(`${this.apiUrl}/stats`)
        ]).subscribe(([u, t, s, i, b, statsData]) => {
            this.transactions.next(t);
            this.subscriptions.next(s);
            this.investments.next(i);
            this.budgets.next(b);
            this.stats.next(statsData);

            if (u && statsData.bankBalances) {
                const banks = Object.keys(statsData.bankBalances);
                this.authService.updateUserInfo({ bankAccounts: banks });
            }
        });
    }

    private resetData() {
        this.stats.next(this.getDefaultStats());
        this.transactions.next([]);
        this.subscriptions.next([]);
        this.investments.next([]);
        this.budgets.next([]);
        this.user.next(null);
    }

    getUser(): Observable<User | null> { return this.user.asObservable(); }
    getStats(): Observable<DashboardStats> { return this.stats.asObservable(); }
    getTransactions(): Observable<Transaction[]> { return this.transactions.asObservable(); }
    getSubscriptions(): Observable<Subscription[]> { return this.subscriptions.asObservable(); }
    getInvestments(): Observable<Investment[]> { return this.investments.asObservable(); }
    getBudgets(): Observable<Budget[]> { return this.budgets.asObservable(); }

    addBank(bankName: string) {
        this.http.post<any>(`${this.apiUrl}/banks?name=${bankName}`, {}).subscribe(() => {
            this.refreshAllData();
        });
    }

    addTransaction(transaction: Omit<Transaction, 'id'>, bankName?: string) {
        this.http.post<Transaction>(`${this.apiUrl}/transactions?bankName=${bankName || ''}`, transaction)
            .subscribe(() => { this.refreshAllData(); });
    }

    deleteTransaction(id: number) {
        this.http.delete(`${this.apiUrl}/transactions/${id}`).subscribe(() => { this.refreshAllData(); });
    }

    addSubscription(sub: Omit<Subscription, 'id'>) {
        this.http.post<Subscription>(`${this.apiUrl}/subscriptions`, sub).subscribe(() => { this.refreshAllData(); });
    }

    deleteSubscription(id: number) {
        this.http.delete(`${this.apiUrl}/subscriptions/${id}`).subscribe(() => { this.refreshAllData(); });
    }

    addInvestment(investment: Omit<Investment, 'id'>) {
        this.http.post<Investment>(`${this.apiUrl}/investments`, investment).subscribe(() => { this.refreshAllData(); });
    }

    deleteInvestment(id: number) {
        this.http.delete(`${this.apiUrl}/investments/${id}`).subscribe(() => { this.refreshAllData(); });
    }

    fundGoal(amount: number) {
        this.http.put(`${this.apiUrl}/preferences`, {
            goalCollectedIncrement: amount
        }).subscribe(() => this.refreshAllData());
    }

    updateBalance(bankName: string, amount: number) { this.refreshAllData(); }

    saveBudget(category: string, limitAmount: number) {
        this.http.post(`${this.apiUrl}/budgets`, { category, limitAmount }).subscribe(() => this.refreshAllData());
    }

    deleteBudget(category: string) {
        this.http.delete(`${this.apiUrl}/budgets?category=${category}`).subscribe(() => this.refreshAllData());
    }
}
