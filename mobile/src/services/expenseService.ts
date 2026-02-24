/**
 * expenseService.ts
 *
 * All REST calls to the Expensify Vercel API.
 * Tokens are attached automatically by the api.ts request interceptor.
 */

import api from './api';
import { Transaction, Subscription, Investment, Budget, DashboardStats } from './models';

export const expenseService = {
    // -------------------------------------------------------------------------
    // Dashboard Stats
    // -------------------------------------------------------------------------
    async getStats(): Promise<DashboardStats> {
        const response = await api.get('/api/expenses/stats');
        const data = response.data ?? {};
        const toNum = (v: any) =>
            typeof v === 'string' ? parseFloat(v) || 0 : typeof v === 'number' ? v : 0;
        // Normalize bankBalances values to numbers
        const rawBalances: Record<string, any> = data.bankBalances ?? {};
        const bankBalances: Record<string, number> = {};
        Object.keys(rawBalances).forEach((k) => {
            bankBalances[k] = toNum(rawBalances[k]);
        });
        return {
            balance: toNum(data.balance),
            monthlyExpenses: toNum(data.monthlyExpenses),
            totalInvestment: toNum(data.totalInvestment),
            investAmount: toNum(data.investAmount),
            goalName: data.goalName || 'Savings Goal',
            goalRequired: toNum(data.goalRequired),
            goalCollected: toNum(data.goalCollected),
            bankBalances,
        };
    },

    // -------------------------------------------------------------------------
    // Transactions
    // -------------------------------------------------------------------------
    async getTransactions(): Promise<Transaction[]> {
        const response = await api.get<Transaction[]>('/api/expenses/transactions');
        if (!Array.isArray(response.data)) return [];
        return response.data.map((t) => ({
            ...t,
            amount: typeof t.amount === 'string' ? parseFloat(t.amount) : (t.amount ?? 0),
        }));
    },

    async addTransaction(
        transaction: Omit<Transaction, 'id'>,
        bankName: string
    ): Promise<Transaction> {
        const bank = bankName || 'Default';
        const response = await api.post<Transaction>(
            `/api/expenses/transactions?bankName=${encodeURIComponent(bank)}`,
            transaction
        );
        return response.data;
    },

    async deleteTransaction(id: number): Promise<void> {
        // Vercel rewrites /api/expenses/transactions/:id -> transactions.js?id=:id
        await api.delete(`/api/expenses/transactions/${id}`);
    },

    // -------------------------------------------------------------------------
    // Banks / Accounts
    // -------------------------------------------------------------------------
    async getBanks(): Promise<Array<{ id: number; name: string; balance: number }>> {
        const response = await api.get('/api/expenses/banks');
        return Array.isArray(response.data) ? response.data : [];
    },

    async addBank(name: string): Promise<{ id: number; name: string }> {
        const response = await api.post(`/api/expenses/banks?name=${encodeURIComponent(name)}`, {});
        return response.data;
    },

    // -------------------------------------------------------------------------
    // Subscriptions
    // -------------------------------------------------------------------------
    async getSubscriptions(): Promise<Subscription[]> {
        const response = await api.get<Subscription[]>('/api/expenses/subscriptions');
        if (!Array.isArray(response.data)) return [];
        return response.data.map((s) => ({
            ...s,
            amount: typeof s.amount === 'string' ? parseFloat(s.amount) : (s.amount ?? 0),
        }));
    },

    async addSubscription(sub: Omit<Subscription, 'id'>): Promise<Subscription> {
        const response = await api.post<Subscription>('/api/expenses/subscriptions', sub);
        return response.data;
    },

    async editSubscription(id: number, sub: Omit<Subscription, 'id'>): Promise<Subscription> {
        // Vercel rewrites /api/expenses/subscriptions/:id -> subscriptions.js?id=:id
        const response = await api.put<Subscription>(`/api/expenses/subscriptions/${id}`, sub);
        return response.data;
    },

    async deleteSubscription(id: number): Promise<void> {
        await api.delete(`/api/expenses/subscriptions/${id}`);
    },

    // -------------------------------------------------------------------------
    // Investments
    // -------------------------------------------------------------------------
    async getInvestments(): Promise<Investment[]> {
        const response = await api.get<Investment[]>('/api/expenses/investments');
        if (!Array.isArray(response.data)) return [];
        return response.data.map((i) => ({
            ...i,
            amount: typeof i.amount === 'string' ? parseFloat(i.amount) : (i.amount ?? 0),
            returnPct: i.returnPct != null
                ? (typeof i.returnPct === 'string' ? parseFloat(i.returnPct) : i.returnPct)
                : undefined,
        }));
    },

    async addInvestment(investment: Omit<Investment, 'id'>): Promise<Investment> {
        const response = await api.post<Investment>('/api/expenses/investments', investment);
        return response.data;
    },

    async deleteInvestment(id: number): Promise<void> {
        await api.delete(`/api/expenses/investments/${id}`);
    },

    // -------------------------------------------------------------------------
    // Budgets
    // GET returns [{ category, limitAmount }]
    // PUT/POST upserts a budget for a category
    // DELETE removes by category query param
    // -------------------------------------------------------------------------
    async getBudgets(): Promise<Budget[]> {
        const response = await api.get<Budget[]>('/api/expenses/budgets');
        if (!Array.isArray(response.data)) return [];
        // Normalize limitAmount to a number — PostgreSQL may return it as a string
        return response.data.map((b) => ({
            ...b,
            limitAmount: typeof b.limitAmount === 'string'
                ? parseFloat(b.limitAmount)
                : (b.limitAmount ?? 0),
        }));
    },

    async upsertBudget(category: string, limitAmount: number): Promise<void> {
        await api.put('/api/expenses/budgets', { category, limitAmount });
    },

    async deleteBudget(category: string): Promise<void> {
        await api.delete(`/api/expenses/budgets?category=${encodeURIComponent(category)}`);
    },

    // -------------------------------------------------------------------------
    // Preferences / Goals
    // -------------------------------------------------------------------------
    async updatePreferences(prefs: {
        goalName?: string;
        goalRequired?: number;
        goalCollected?: number;
        investAmount?: number;
    }): Promise<void> {
        await api.put('/api/expenses/preferences', prefs);
    },
};
