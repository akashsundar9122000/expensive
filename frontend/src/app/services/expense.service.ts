import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, take, catchError, of, throwError, firstValueFrom } from 'rxjs';
import { Transaction, Subscription, Investment, Sip, DashboardStats, User, Budget, Bank } from './models';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

interface BootstrapResponse {
    user: User;
    transactions: Transaction[];
    subscriptions: Subscription[];
    investments: Investment[];
    sips: Sip[];
    budgets: Budget[];
    banks: Bank[];
    stats: DashboardStats;
}

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
    private refreshTimer: ReturnType<typeof setTimeout> | null = null;
    private useBootstrapEndpoint = true;
    private autoRecurringStoragePrefix = 'auto_recurring_charge';

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

    refreshAllData(delayMs = 120) {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }

        this.refreshTimer = setTimeout(() => {
            this.refreshTimer = null;
            this.executeRefreshAllData();
        }, Math.max(0, delayMs));
    }

    private executeRefreshAllData() {
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
                    this.executeRefreshAllData();
                }
            });
    }

    private async loadAllDataSequentially() {
        if (this.useBootstrapEndpoint) {
            try {
                const bootstrap = await firstValueFrom(
                    this.http.get<BootstrapResponse>(`${this.apiUrl}/bootstrap`)
                );

                if (bootstrap) {
                    const normalizedInvestments = this.normalizeInvestments(bootstrap.investments);
                    this.transactions.next(bootstrap.transactions || []);
                    this.subscriptions.next(bootstrap.subscriptions || []);
                    this.investments.next(normalizedInvestments);
                    this.sips.next(bootstrap.sips || []);
                    this.budgets.next(bootstrap.budgets || []);
                    this.stats.next(bootstrap.stats || this.getDefaultStats());
                    this.banks.next(bootstrap.banks || []);
                    this.user.next(bootstrap.user || null);
                    this.processAutoRecurringCharges(
                        bootstrap.transactions || [],
                        bootstrap.subscriptions || [],
                        bootstrap.sips || [],
                        bootstrap.banks || [],
                        bootstrap.user?.email || ''
                    );
                    return;
                }
            } catch (error) {
                const status = (error as HttpErrorResponse)?.status;
                if (status === 401 || status === 404 || status === 405) {
                    this.useBootstrapEndpoint = false;
                }
            }
        }

        const user = await firstValueFrom(this.authService.getCurrentUser().pipe(take(1)));
        const [
            transactions,
            subscriptions,
            investments,
            sips,
            budgets,
            statsData,
            bankList
        ] = await Promise.all([
            firstValueFrom(this.http.get<Transaction[]>(`${this.apiUrl}/transactions`).pipe(catchError(() => of([])))),
            firstValueFrom(this.http.get<Subscription[]>(`${this.apiUrl}/subscriptions`).pipe(catchError(() => of([])))),
            firstValueFrom(this.http.get<Investment[]>(`${this.apiUrl}/investments`).pipe(catchError(() => of([])))),
            firstValueFrom(this.http.get<Sip[]>(`${this.apiUrl}/sips`).pipe(catchError(() => of([])))),
            firstValueFrom(this.http.get<Budget[]>(`${this.apiUrl}/budgets`).pipe(catchError(() => of([])))),
            firstValueFrom(this.http.get<DashboardStats>(`${this.apiUrl}/stats`).pipe(catchError(() => of(this.getDefaultStats())))),
            firstValueFrom(this.http.get<Bank[]>(`${this.apiUrl}/banks`).pipe(catchError(() => of([]))))
        ]);

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

        this.processAutoRecurringCharges(
            transactions || [],
            subscriptions || [],
            sips || [],
            bankList || [],
            user?.email || ''
        );
    }

    private processAutoRecurringCharges(
        transactions: Transaction[],
        subscriptions: Subscription[],
        sips: Sip[],
        banks: Bank[],
        userEmail: string
    ): void {
        const availableBanks = Array.isArray(banks) ? banks : [];
        if (availableBanks.length === 0) {
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIso = this.toIsoDate(today);
        const markerPrefix = `${this.autoRecurringStoragePrefix}_${encodeURIComponent((userEmail || 'guest').trim().toLowerCase())}`;
        const safeTransactions = Array.isArray(transactions) ? transactions : [];

        const hasAutoTransaction = (
            kind: 'SUB' | 'SIP',
            id: number,
            expectedSubCategory: string,
            expectedCategory: string,
            expectedAmount: number,
            expectedBankName: string
        ): boolean => {
            const marker = `[AUTO-${kind}:${id}]`;
            return safeTransactions.some((transaction) => {
                const txDate = String(transaction.date || '');
                const subCategory = String(transaction.subCategory || '');
                const matchesLegacyMarker = subCategory.includes(marker);
                const matchesPlainAutoShape =
                    txDate.startsWith(todayIso)
                    && String(transaction.category || '') === expectedCategory
                    && Number(transaction.amount || 0) === expectedAmount
                    && String(transaction.mode || '') === 'Bank'
                    && subCategory === expectedSubCategory
                    && String(transaction.bankName || '') === expectedBankName;

                return txDate.startsWith(todayIso) && (matchesLegacyMarker || matchesPlainAutoShape);
            });
        };

        (subscriptions || []).forEach((subscription) => {
            const subscriptionId = Number(subscription.id);
            const billingDay = Number(String(subscription.date || '').trim());
            const amount = Number(subscription.amount);

            if (!Number.isInteger(subscriptionId) || subscriptionId <= 0) return;
            if (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 31) return;
            if (!Number.isFinite(amount) || amount <= 0) return;

            const dueDate = this.createClampedDate(today.getFullYear(), today.getMonth(), billingDay);
            if (this.toIsoDate(dueDate) !== todayIso) return;

            const bankName = this.resolveRecurringBankName(subscription.bankName, availableBanks);
            if (!bankName) return;

            const markerKey = `${markerPrefix}_${todayIso}_SUB_${subscriptionId}`;
            const name = String(subscription.name || 'Subscription').trim();
            if (hasAutoTransaction('SUB', subscriptionId, name, 'Bills', amount, bankName) || this.hasAutoChargeMarker(markerKey)) {
                return;
            }

            this.setAutoChargeMarker(markerKey);
            this.addTransaction(
                {
                    amount,
                    category: 'Bills',
                    subCategory: name,
                    date: todayIso,
                    mode: 'Bank'
                },
                bankName
            );
        });

        (sips || []).forEach((sip) => {
            const sipId = Number(sip.id);
            const sipDay = Number(sip.sipDay);
            const amount = Number(sip.monthlyAmount);

            if (!Number.isInteger(sipId) || sipId <= 0) return;
            if (!Number.isInteger(sipDay) || sipDay < 1 || sipDay > 31) return;
            if (!Number.isFinite(amount) || amount <= 0) return;

            const dueDate = this.createClampedDate(today.getFullYear(), today.getMonth(), sipDay);
            if (this.toIsoDate(dueDate) !== todayIso) return;

            const bankName = this.resolveRecurringBankName(sip.bankName, availableBanks);
            if (!bankName) return;

            const markerKey = `${markerPrefix}_${todayIso}_SIP_${sipId}`;
            const investmentName = String(sip.investmentName || sip.type || 'SIP').trim();
            if (hasAutoTransaction('SIP', sipId, investmentName, 'Finance', amount, bankName) || this.hasAutoChargeMarker(markerKey)) {
                return;
            }

            this.setAutoChargeMarker(markerKey);
            this.addTransaction(
                {
                    amount,
                    category: 'Finance',
                    subCategory: investmentName,
                    date: todayIso,
                    mode: 'Bank'
                },
                bankName
            );
        });
    }

    private resolveRecurringBankName(preferredBankName: string | undefined, banks: Bank[]): string {
        const preferred = String(preferredBankName || '').trim();
        if (preferred && (banks || []).some((bank) => bank.name === preferred)) {
            return preferred;
        }
        return (banks || [])[0]?.name || '';
    }

    private hasAutoChargeMarker(key: string): boolean {
        try {
            return localStorage.getItem(key) === '1';
        } catch {
            return false;
        }
    }

    private setAutoChargeMarker(key: string): void {
        try {
            localStorage.setItem(key, '1');
        } catch {
            // Ignore storage failures and continue.
        }
    }

    private toIsoDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private createClampedDate(year: number, month: number, dayOfMonth: number): Date {
        const lastDay = new Date(year, month + 1, 0).getDate();
        const clampedDay = Math.min(dayOfMonth, lastDay);
        const date = new Date(year, month, clampedDay);
        date.setHours(0, 0, 0, 0);
        return date;
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
                this.refreshAllData(100);
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
                this.refreshAllData(100);
            }),
            catchError((error) => {
                console.error('EditSubscription primary route failed, trying fallback route:', error);
                return this.http.put<Subscription>(`${this.apiUrl}/subscriptions/${id}`, sub, requestOptions).pipe(
                    tap((response) => {
                        console.log('EditSubscription fallback response:', response);
                        this.refreshAllData(100);
                    }),
                    catchError((fallbackError) => {
                        console.error('EditSubscription second route failed, trying POST fallback:', fallbackError);
                        return this.http.post<Subscription>(`${this.apiUrl}/subscriptions/update?id=${id}`, sub, requestOptions).pipe(
                            tap((response) => {
                                console.log('EditSubscription POST fallback response:', response);
                                this.refreshAllData(100);
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

    updateGoal(goalName: string, goalRequired: number) {
        const trimmedName = (goalName || '').trim();
        const parsedRequired = Number(goalRequired);

        if (!trimmedName || !Number.isFinite(parsedRequired) || parsedRequired <= 0) {
            console.error('Failed to update goal: valid goal name and required amount are required');
            return;
        }

        this.http.put(`${this.apiUrl}/preferences`, {
            goalName: trimmedName,
            goalRequired: parsedRequired
        }).subscribe({
            next: () => this.refreshAllData(),
            error: (err) => { console.error('Failed to update goal:', err); }
        });
    }

    setGoalCollected(amount: number) {
        const parsedAmount = Number(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
            console.error('Failed to set goal collected: amount must be a non-negative number');
            return;
        }

        this.http.put(`${this.apiUrl}/preferences`, {
            goalCollected: parsedAmount
        }).subscribe({
            next: () => this.refreshAllData(),
            error: (err) => { console.error('Failed to set goal collected:', err); }
        });
    }

    adjustGoalCollected(delta: number) {
        const parsedDelta = Number(delta);
        if (!Number.isFinite(parsedDelta) || parsedDelta === 0) {
            return;
        }

        this.http.put(`${this.apiUrl}/preferences`, {
            goalCollectedIncrement: parsedDelta
        }).subscribe({
            next: () => this.refreshAllData(),
            error: (err) => { console.error('Failed to adjust goal collected:', err); }
        });
    }

    updateBalance(bankName: string, amount: number) { this.refreshAllData(); }

    saveBudget(category: string, limitAmount: number, month: number, year: number) {
        this.http.post(`${this.apiUrl}/budgets`, { category, limitAmount, month, year }).subscribe({
            next: () => this.refreshAllData(),
            error: (err) => { console.error('Failed to save budget:', err); }
        });
    }

    deleteBudget(category: string, month: number, year: number) {
        this.http.delete(`${this.apiUrl}/budgets?category=${encodeURIComponent(category)}&month=${month}&year=${year}`).subscribe({
            next: () => this.refreshAllData(),
            error: (err) => { console.error('Failed to delete budget:', err); }
        });
    }
}
