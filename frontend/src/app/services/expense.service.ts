import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Transaction, Subscription, DashboardStats, User, Investment } from './models';
import { AuthService } from './auth.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class ExpenseService {
    private statsSubject = new BehaviorSubject<DashboardStats>(this.getDefaultStats());
    private transactionsSubject = new BehaviorSubject<Transaction[]>([]);
    private subscriptionsSubject = new BehaviorSubject<Subscription[]>([]);
    private investmentsSubject = new BehaviorSubject<Investment[]>([]);
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
        this.fetchStats();
        this.fetchTransactions();
        this.fetchSubscriptions();
        this.fetchInvestments();
    }

    private fetchStats() {
        this.http.get<any>(`${this.apiUrl}/stats`).subscribe(data => {
            const stats: DashboardStats = {
                balance: data.balance,
                monthlyExpenses: data.monthlyExpenses || 0,
                totalInvestment: data.totalInvestment,
                investAmount: data.investAmount,
                goalName: data.goalName,
                goalRequired: data.goalRequired,
                goalCollected: data.goalCollected,
                bankBalances: data.bankBalances || {}
            };
            this.statsSubject.next(stats);
            const banks = Object.keys(data.bankBalances || {});
            this.authService.updateUserInfo({ bankAccounts: banks });
        });
    }

    private fetchTransactions() {
        this.http.get<Transaction[]>(`${this.apiUrl}/transactions`).subscribe(transactions => {
            this.transactionsSubject.next(transactions);
        });
    }

    private fetchSubscriptions() {
        this.http.get<Subscription[]>(`${this.apiUrl}/subscriptions`).subscribe(subs => {
            this.subscriptionsSubject.next(subs);
        });
    }

    private fetchInvestments() {
        this.http.get<Investment[]>(`${this.apiUrl}/investments`).subscribe(investments => {
            this.investmentsSubject.next(investments);
        });
    }

    private resetData() {
        this.statsSubject.next(this.getDefaultStats());
        this.transactionsSubject.next([]);
        this.subscriptionsSubject.next([]);
        this.investmentsSubject.next([]);
    }

    getUser(): Observable<User | null> { return this.authService.getCurrentUser(); }
    getStats(): Observable<DashboardStats> { return this.statsSubject.asObservable(); }
    getTransactions(): Observable<Transaction[]> { return this.transactionsSubject.asObservable(); }
    getSubscriptions(): Observable<Subscription[]> { return this.subscriptionsSubject.asObservable(); }
    getInvestments(): Observable<Investment[]> { return this.investmentsSubject.asObservable(); }

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

    fundGoal(amount: number) { this.refreshAllData(); }
    updateBalance(bankName: string, amount: number) { this.refreshAllData(); }
}
