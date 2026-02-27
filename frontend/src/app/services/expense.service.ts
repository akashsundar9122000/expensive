import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, take, catchError, of, throwError, firstValueFrom } from 'rxjs';
import { Transaction, Subscription, Investment, Sip, DashboardStats, User, Budget, Bank } from './models';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ExpenseService {
    private stats = new BehaviorSubject<DashboardStats>(this.getDefaultStats());
    private transactions = new BehaviorSubject<Transaction[]>([]);
    private subscriptions = new BehaviorSubject<Subscription[]>([]);
    private investments = new BehaviorSubject<Investment[]>([]);
    private sips = new BehaviorSubject<Sip[]>([]);
    private budgets = new BehaviorSubject<Budget[]>([]);
    private banks = new BehaviorSubject<Bank[]>([]);
    private user = new BehaviorSubject<User | null>(null);
    private apiUrl = `${environment.apiUrl}/api/expenses`;
    private isRefreshing = false;
    private refreshQueued = false;

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

    private normalizeInvestments(investments: Investment[]): Investment[] {
        return (investments || []).map((investment) => ({
            ...investment,
            amount: Number(investment.amount || 0),
            returnPct: investment.returnPct === undefined || investment.returnPct === null
                ? undefined
                : Number(investment.returnPct)
        }));
    }

    refreshAllData() {
        if (this.isRefreshing) {
            this.refreshQueued = true;
            return;
        }

        this.isRefreshing = true;
        this.loadAllDataSequentially()
            .catch((err) => {
                console.error('Failed to refresh dashboard data:', err);
            })
            .finally(() => {
                this.isRefreshing = false;
                if (this.refreshQueued) {
                    this.refreshQueued = false;
                    this.refreshAllData();
                }
            });
    }

    private async loadAllDataSequentially() {
        const user = await firstValueFrom(this.authService.getCurrentUser().pipe(take(1)));
        const transactions = await firstValueFrom(
            this.http.get<Transaction[]>(`${this.apiUrl}/transactions`).pipe(catchError(() => of([])))
        );
        const subscriptions = await firstValueFrom(
            this.http.get<Subscription[]>(`${this.apiUrl}/subscriptions`).pipe(catchError(() => of([])))
        );
        const investments = await firstValueFrom(
            this.http.get<Investment[]>(`${this.apiUrl}/investments`).pipe(catchError(() => of([])))
        );
        const sips = await firstValueFrom(
            this.http.get<Sip[]>(`${this.apiUrl}/sips`).pipe(catchError(() => of([])))
        );
        const budgets = await firstValueFrom(
            this.http.get<Budget[]>(`${this.apiUrl}/budgets`).pipe(catchError(() => of([])))
        );
        const statsData = await firstValueFrom(
            this.http.get<DashboardStats>(`${this.apiUrl}/stats`).pipe(catchError(() => of(this.getDefaultStats())))
        );
        const bankList = await firstValueFrom(
            this.http.get<Bank[]>(`${this.apiUrl}/banks`).pipe(catchError(() => of([])))
        );

        const normalizedInvestments = this.normalizeInvestments(investments);
        this.transactions.next(transactions);
        this.subscriptions.next(subscriptions);
        this.investments.next(normalizedInvestments);
        this.sips.next(sips || []);
        this.budgets.next(budgets);
        this.stats.next(statsData);
        this.banks.next(bankList);

        if (user) {
            this.user.next({ ...user, bankAccounts: bankList.map(bk => bk.name) });
        } else {
            this.user.next(user);
        }
    }

    private resetData() {
        this.stats.next(this.getDefaultStats());
        this.transactions.next([]);
        this.subscriptions.next([]);
        this.investments.next([]);
        this.sips.next([]);
        this.budgets.next([]);
        this.banks.next([]);
        this.user.next(null);
    }

    getUser(): Observable<User | null> { return this.user.asObservable(); }
    getStats(): Observable<DashboardStats> { return this.stats.asObservable(); }
    getTransactions(): Observable<Transaction[]> { return this.transactions.asObservable(); }
    getSubscriptions(): Observable<Subscription[]> { return this.subscriptions.asObservable(); }
    getInvestments(): Observable<Investment[]> { return this.investments.asObservable(); }
    getSips(): Observable<Sip[]> { return this.sips.asObservable(); }
    getBudgets(): Observable<Budget[]> { return this.budgets.asObservable(); }
    getBanks(): Observable<Bank[]> { return this.banks.asObservable(); }

    private getAuthRequestOptions() {
        const token = this.authService.getValidToken();
        if (!token) {
            return {};
        }

        return {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
        };
    }

    addBank(bankName: string, balance?: number | null) {
        const trimmedName = (bankName || '').trim();
        if (!trimmedName) {
            console.error('Failed to add bank: bank name is required');
            return;
        }

        const parsedBalance = balance != null && !isNaN(balance as number) ? Number(balance) : 0;
        const payload = { name: trimmedName, balance: parsedBalance };

        this.http.post<any>(`${this.apiUrl}/banks`, payload).subscribe({
            next: () => { this.refreshAllData(); },
            error: (primaryErr) => {
                const encodedName = encodeURIComponent(trimmedName);
                const balanceParam = `&balance=${encodeURIComponent(parsedBalance)}`;
                this.http.post<any>(`${this.apiUrl}/banks?name=${encodedName}${balanceParam}`, {}).subscribe({
                    next: () => { this.refreshAllData(); },
                    error: (fallbackErr) => {
                        console.error('Failed to add bank (body + query fallback):', { primaryErr, fallbackErr });
                    }
                });
            }
        });
    }

    updateBank(id: number, name: string, balance?: number | null) {
        const trimmedName = (name || '').trim();
        if (!id || !trimmedName) {
            console.error('Failed to update bank: bank id and name are required');
            return;
        }

        const parsedBalance = balance != null && !isNaN(balance as number) ? Number(balance) : null;
        const payload: any = { id, name: trimmedName };
        if (parsedBalance !== null) {
            payload.balance = parsedBalance;
        }

        this.http.put<any>(`${this.apiUrl}/banks`, payload).subscribe({
            next: () => { this.refreshAllData(); },
            error: (primaryErr) => {
                const encodedName = encodeURIComponent(trimmedName);
                const balanceParam = parsedBalance !== null ? `&balance=${encodeURIComponent(parsedBalance)}` : '';
                this.http.put<any>(`${this.apiUrl}/banks?id=${id}&name=${encodedName}${balanceParam}`, {}).subscribe({
                    next: () => { this.refreshAllData(); },
                    error: (fallbackErr) => {
                        console.error('Failed to update bank (body + query fallback):', { primaryErr, fallbackErr });
                    }
                });
            }
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
        const requestOptions = this.getAuthRequestOptions();

        return this.http.put<Subscription>(`${this.apiUrl}/subscriptions?id=${id}`, sub, requestOptions).pipe(
            tap((response) => {
                console.log('EditSubscription response:', response);
                // Ensure UI updates by triggering a fresh load
                setTimeout(() => this.refreshAllData(), 100);
            }),
            catchError((error) => {
                console.error('EditSubscription primary route failed, trying fallback route:', error);
                return this.http.put<Subscription>(`${this.apiUrl}/subscriptions/${id}`, sub, requestOptions).pipe(
                    tap((response) => {
                        console.log('EditSubscription fallback response:', response);
                        setTimeout(() => this.refreshAllData(), 100);
                    }),
                    catchError((fallbackError) => {
                        console.error('EditSubscription second route failed, trying POST fallback:', fallbackError);
                        return this.http.post<Subscription>(`${this.apiUrl}/subscriptions/update?id=${id}`, sub, requestOptions).pipe(
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

    updateInvestment(id: number, investment: Omit<Investment, 'id'>): Observable<Investment> {
        return this.http.put<Investment>(`${this.apiUrl}/investments`, { id, ...investment }).pipe(
            tap(() => { this.refreshAllData(); })
        );
    }

    deleteInvestment(id: number, password: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/investments/${id}`, { body: { password } }).pipe(
            tap(() => { this.refreshAllData(); })
        );
    }

    addSip(sip: Omit<Sip, 'id'>): Observable<Sip> {
        return this.http.post<Sip>(`${this.apiUrl}/sips`, sip, this.getAuthRequestOptions()).pipe(
            tap(() => { this.refreshAllData(); })
        );
    }

    updateSip(id: number, sip: Omit<Sip, 'id'>): Observable<Sip> {
        return this.http.put<Sip>(`${this.apiUrl}/sips`, { id, ...sip }, this.getAuthRequestOptions()).pipe(
            tap(() => { this.refreshAllData(); })
        );
    }

    deleteSip(id: number, password: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/sips?id=${id}`, {
            ...this.getAuthRequestOptions(),
            body: { password }
        }).pipe(
            tap(() => { this.refreshAllData(); })
        );
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
