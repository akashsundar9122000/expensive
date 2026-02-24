import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin, tap, take, catchError, of } from 'rxjs';
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

    refreshAllData() {
        forkJoin([
            this.authService.getCurrentUser().pipe(take(1)),
            this.http.get<Transaction[]>(`${this.apiUrl}/transactions`).pipe(catchError(() => of([]))),
            this.http.get<Subscription[]>(`${this.apiUrl}/subscriptions`).pipe(catchError(() => of([]))),
            this.http.get<Investment[]>(`${this.apiUrl}/investments`).pipe(catchError(() => of([]))),
            this.http.get<Budget[]>(`${this.apiUrl}/budgets`).pipe(catchError(() => of([]))),
            this.http.get<DashboardStats>(`${this.apiUrl}/stats`).pipe(catchError(() => of(this.getDefaultStats())))
        ]).subscribe(([u, t, s, i, b, statsData]) => {
            const user = u as User | null;
            this.user.next(user);
            this.transactions.next(t as Transaction[]);
            this.subscriptions.next(s as Subscription[]);
            this.investments.next(i as Investment[]);
            this.budgets.next(b as Budget[]);
            this.stats.next(statsData as DashboardStats);

            if (user && (statsData as DashboardStats).bankBalances) {
                const banks = Object.keys((statsData as DashboardStats).bankBalances);
                this.authService.updateUserInfo({ bankAccounts: banks });
                this.user.next({ ...user, bankAccounts: banks });
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
            setTimeout(() => this.refreshAllData(), 200);
        });
    }

    addTransaction(transaction: Omit<Transaction, 'id'>, bankName?: string) {
        this.http.post<Transaction>(`${this.apiUrl}/transactions?bankName=${bankName || ''}`, transaction)
            .subscribe(() => { this.refreshAllData(); });
    }

    deleteTransaction(id: number) {
        this.http.delete(`${this.apiUrl}/transactions/${id}`).subscribe(() => { this.refreshAllData(); });
    }

    addSubscription(sub: Omit<Subscription, 'id'>): Observable<Subscription> {
        return this.http.post<Subscription>(`${this.apiUrl}/subscriptions`, sub).pipe(
            tap(() => {
                // Ensure UI updates by triggering a fresh load
                setTimeout(() => this.refreshAllData(), 100);
            })
        );
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
