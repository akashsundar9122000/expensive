import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin, tap, take, catchError, of, throwError } from 'rxjs';
import { Transaction, Subscription, Investment, DashboardStats, User, Budget, Bank } from './models';
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
    private banks = new BehaviorSubject<Bank[]>([]);
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
            this.http.get<DashboardStats>(`${this.apiUrl}/stats`).pipe(catchError(() => of(this.getDefaultStats()))),
            this.http.get<Bank[]>(`${this.apiUrl}/banks`).pipe(catchError(() => of([])))
        ]).subscribe(([u, t, s, i, b, statsData, banksData]) => {
            const user = u as User | null;
            const bankList = banksData as Bank[];
            this.transactions.next(t as Transaction[]);
            this.subscriptions.next(s as Subscription[]);
            this.investments.next(i as Investment[]);
            this.budgets.next(b as Budget[]);
            this.stats.next(statsData as DashboardStats);
            this.banks.next(bankList);
            // Keep user.bankAccounts in sync so dashboard/all-expenses dropdowns stay populated
            if (user) {
                this.user.next({ ...user, bankAccounts: bankList.map(bk => bk.name) });
            } else {
                this.user.next(user);
            }
        });
    }

    private resetData() {
        this.stats.next(this.getDefaultStats());
        this.transactions.next([]);
        this.subscriptions.next([]);
        this.investments.next([]);
        this.budgets.next([]);
        this.banks.next([]);
        this.user.next(null);
    }

    getUser(): Observable<User | null> { return this.user.asObservable(); }
    getStats(): Observable<DashboardStats> { return this.stats.asObservable(); }
    getTransactions(): Observable<Transaction[]> { return this.transactions.asObservable(); }
    getSubscriptions(): Observable<Subscription[]> { return this.subscriptions.asObservable(); }
    getInvestments(): Observable<Investment[]> { return this.investments.asObservable(); }
    getBudgets(): Observable<Budget[]> { return this.budgets.asObservable(); }
    getBanks(): Observable<Bank[]> { return this.banks.asObservable(); }

    addBank(bankName: string, balance?: number | null) {
        const encodedName = encodeURIComponent(bankName);
        const balanceParam = balance != null && !isNaN(balance) ? `&balance=${encodeURIComponent(balance)}` : '';
        this.http.post<any>(`${this.apiUrl}/banks?name=${encodedName}${balanceParam}`, {}).subscribe({
            next: () => { this.refreshAllData(); },
            error: (err) => { console.error('Failed to add bank:', err); }
        });
    }

    updateBank(id: number, name: string, balance?: number | null) {
        const encodedName = encodeURIComponent(name);
        const balanceParam = balance != null && !isNaN(balance) ? `&balance=${encodeURIComponent(balance)}` : '';
        this.http.put<any>(`${this.apiUrl}/banks?id=${id}&name=${encodedName}${balanceParam}`, {}).subscribe({
            next: () => { this.refreshAllData(); },
            error: (err) => { console.error('Failed to update bank:', err); }
        });
    }

    deleteBank(id: number) {
        this.http.delete<any>(`${this.apiUrl}/banks?id=${id}`).subscribe({
            next: () => { this.refreshAllData(); },
            error: (err) => { console.error('Failed to delete bank:', err); }
        });
    }

    addTransaction(transaction: Omit<Transaction, 'id'>, bankName?: string) {
        const selectedBank = (bankName || '').trim() || this.banks.getValue()[0]?.name;
        if (!selectedBank) {
            console.error('Failed to add transaction: no bank account available');
            return;
        }
        const bank = encodeURIComponent(selectedBank);
        this.http.post<Transaction>(`${this.apiUrl}/transactions?bankName=${bank}`, transaction)
            .subscribe({
                next: (newTx) => {
                    const transactionWithBank: Transaction = {
                        ...newTx,
                        bankName: newTx.bankName || selectedBank
                    };
                    // Optimistic update: immediately prepend to local list so UI reflects instantly
                    const current = this.transactions.getValue();
                    this.transactions.next([transactionWithBank, ...current]);
                    // Full refresh in background for balance/stats sync
                    this.refreshAllData();
                },
                error: (err) => { console.error('Failed to add transaction:', err); }
            });
    }

    updateTransaction(id: number, transaction: Omit<Transaction, 'id'>) {
        this.http.put<Transaction>(`${this.apiUrl}/transactions/${id}`, transaction)
            .subscribe({
                next: (updatedTx) => {
                    // Update local list
                    const current = this.transactions.getValue();
                    const index = current.findIndex(t => t.id === id);
                    if (index !== -1) {
                        const updated = [...current];
                        updated[index] = updatedTx;
                        this.transactions.next(updated);
                    }
                    // Full refresh in background for balance/stats sync
                    this.refreshAllData();
                },
                error: (err) => { console.error('Failed to update transaction:', err); }
            });
    }

    deleteTransaction(id: number) {
        this.http.delete(`${this.apiUrl}/transactions/${id}`).subscribe({
            next: () => { this.refreshAllData(); },
            error: (err) => { console.error('Failed to delete transaction:', err); }
        });
    }

    addSubscription(sub: Omit<Subscription, 'id'>): Observable<Subscription> {
        return this.http.post<Subscription>(`${this.apiUrl}/subscriptions`, sub).pipe(
            tap(() => {
                // Ensure UI updates by triggering a fresh load
                setTimeout(() => this.refreshAllData(), 100);
            })
        );
    }

    editSubscription(id: number, sub: Omit<Subscription, 'id'>): Observable<Subscription> {
        console.log('Calling editSubscription with ID:', id, 'Payload:', sub);
        const token = localStorage.getItem('token');
        const headers = token
            ? new HttpHeaders({ Authorization: `Bearer ${token}` })
            : undefined;

        return this.http.put<Subscription>(`${this.apiUrl}/subscriptions?id=${id}`, sub, { headers }).pipe(
            tap((response) => {
                console.log('EditSubscription response:', response);
                // Ensure UI updates by triggering a fresh load
                setTimeout(() => this.refreshAllData(), 100);
            }),
            catchError((error) => {
                console.error('EditSubscription primary route failed, trying fallback route:', error);
                return this.http.put<Subscription>(`${this.apiUrl}/subscriptions/${id}`, sub, { headers }).pipe(
                    tap((response) => {
                        console.log('EditSubscription fallback response:', response);
                        setTimeout(() => this.refreshAllData(), 100);
                    }),
                    catchError((fallbackError) => {
                        console.error('EditSubscription second route failed, trying POST fallback:', fallbackError);
                        return this.http.post<Subscription>(`${this.apiUrl}/subscriptions/update?id=${id}`, sub, { headers }).pipe(
                            tap((response) => {
                                console.log('EditSubscription POST fallback response:', response);
                                setTimeout(() => this.refreshAllData(), 100);
                            }),
                            catchError((postFallbackError) => {
                                console.error('EditSubscription POST fallback error:', postFallbackError);
                                return throwError(() => postFallbackError);
                            })
                        );
                    })
                );
            })
        );
    }

    deleteSubscription(id: number) {
        this.http.delete(`${this.apiUrl}/subscriptions/${id}`).subscribe({
            next: () => { this.refreshAllData(); },
            error: (err) => { console.error('Failed to delete subscription:', err); }
        });
    }

    addInvestment(investment: Omit<Investment, 'id'>): Observable<Investment> {
        return this.http.post<Investment>(`${this.apiUrl}/investments`, investment).pipe(
            tap(() => { this.refreshAllData(); })
        );
    }

    deleteInvestment(id: number) {
        this.http.delete(`${this.apiUrl}/investments/${id}`).subscribe({
            next: () => { this.refreshAllData(); },
            error: (err) => { console.error('Failed to delete investment:', err); }
        });
    }

    fundGoal(amount: number) {
        this.http.put(`${this.apiUrl}/preferences`, {
            goalCollectedIncrement: amount
        }).subscribe({
            next: () => this.refreshAllData(),
            error: (err) => { console.error('Failed to fund goal:', err); }
        });
    }

    updateBalance(bankName: string, amount: number) { this.refreshAllData(); }

    saveBudget(category: string, limitAmount: number) {
        this.http.post(`${this.apiUrl}/budgets`, { category, limitAmount }).subscribe({
            next: () => this.refreshAllData(),
            error: (err) => { console.error('Failed to save budget:', err); }
        });
    }

    deleteBudget(category: string) {
        this.http.delete(`${this.apiUrl}/budgets?category=${encodeURIComponent(category)}`).subscribe({
            next: () => this.refreshAllData(),
            error: (err) => { console.error('Failed to delete budget:', err); }
        });
    }
}
