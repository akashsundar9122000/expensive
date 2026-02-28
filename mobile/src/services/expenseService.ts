/**
 * expenseService.ts
 *
 * All REST calls to the Expensify Vercel API.
 * Tokens are attached automatically by the api.ts request interceptor.
 */

import api from './api';
import { Transaction, Subscription, Investment, Budget, DashboardStats, Sip } from './models';

const toNum = (value: any): number =>
    typeof value === 'string' ? parseFloat(value) || 0 : typeof value === 'number' ? value : 0;

const pickTransactionArray = (payload: any): any[] => {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];

    const candidates = [
        payload.transactions,
        payload.data,
        payload.items,
        payload.content,
        payload.results,
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) return candidate;
    }

    return [];
};

const normalizeTransaction = (raw: any): Transaction | null => {
    const id = Number(raw?.id);
    if (!Number.isFinite(id) || id <= 0) return null;

    const amount = toNum(raw?.amount);
    const category = String(raw?.category || '').trim();
    const subCategory = String(raw?.subCategory ?? raw?.sub_category ?? '').trim();
    const date = String(raw?.date || '').trim();
    const mode = String(raw?.mode ?? raw?.paymentMode ?? '').trim();
    const bankName = String(raw?.bankName ?? raw?.bank_name ?? '').trim();

    return {
        id,
        amount,
        category,
        subCategory,
        date,
        mode: (mode || 'UPI') as Transaction['mode'],
        bankName: bankName || undefined,
    };
};

export const expenseService = {
    // -------------------------------------------------------------------------
    // Dashboard Stats
    // -------------------------------------------------------------------------
    async getStats(): Promise<DashboardStats> {
        const response = await api.get('/api/expenses/stats');
        const data = response.data ?? {};
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
        const response = await api.get('/api/expenses/transactions');
        const rows = pickTransactionArray(response.data);
        return rows
            .map(normalizeTransaction)
            .filter((tx): tx is Transaction => tx !== null);
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

    async updateTransaction(
        id: number,
        transaction: Omit<Transaction, 'id'>,
        bankName: string
    ): Promise<Transaction> {
        const bank = String(bankName || '').trim();
        if (!bank) throw new Error('Please select a bank account');
        const response = await api.put<Transaction>(`/api/expenses/transactions/${id}`, {
            ...transaction,
            bankName: bank,
        });
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
        if (!Array.isArray(response.data)) return [];
        return response.data
            .map((bank: any) => ({
                id: Number(bank?.id),
                name: String(bank?.name || '').trim(),
                balance: toNum(bank?.balance),
            }))
            .filter((bank) => Number.isInteger(bank.id) && bank.id > 0 && !!bank.name);
    },

    async addBank(name: string): Promise<{ id: number; name: string }> {
        const trimmed = String(name || '').trim();
        if (!trimmed) throw new Error('Bank name is required');

        try {
            const response = await api.post('/api/expenses/banks', { name: trimmed, balance: 0 });
            return response.data;
        } catch {
            const response = await api.post(`/api/expenses/banks?name=${encodeURIComponent(trimmed)}`, {});
            return response.data;
        }
    },

    async updateBank(id: number, name: string, balance?: number): Promise<{ id: number; name: string; balance: number }> {
        const trimmed = String(name || '').trim();
        if (!Number.isInteger(id) || id <= 0) throw new Error('Valid bank id is required');
        if (!trimmed) throw new Error('Bank name is required');

        const payload: Record<string, any> = { id, name: trimmed };
        if (typeof balance === 'number' && Number.isFinite(balance)) {
            payload.balance = balance;
        }

        const response = await api.put('/api/expenses/banks', payload);
        return response.data;
    },

    async deleteBank(id: number): Promise<void> {
        if (!Number.isInteger(id) || id <= 0) throw new Error('Valid bank id is required');
        await api.delete(`/api/expenses/banks?id=${id}`);
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
        const bankName = String(sub.bankName || '').trim();
        if (!bankName) throw new Error('Please select a bank account');
        const response = await api.post<Subscription>('/api/expenses/subscriptions', sub);
        return response.data;
    },

    async editSubscription(id: number, sub: Omit<Subscription, 'id'>): Promise<Subscription> {
        const bankName = String(sub.bankName || '').trim();
        if (!bankName) throw new Error('Please select a bank account');
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

    async deleteInvestment(id: number, password: string): Promise<void> {
        await api.delete(`/api/expenses/investments/${id}`, {
            data: { password },
        });
    },

    // -------------------------------------------------------------------------
    // SIPs
    // -------------------------------------------------------------------------
    async getSips(): Promise<Sip[]> {
        const response = await api.get<Sip[]>('/api/expenses/sips');
        if (!Array.isArray(response.data)) return [];
        return response.data.map((sip: any) => ({
            id: Number(sip.id),
            type: String(sip.type || '').trim(),
            investmentName: String(sip.investmentName || '').trim(),
            monthlyAmount: toNum(sip.monthlyAmount),
            sipDay: Number(sip.sipDay),
            bankName: sip.bankName ? String(sip.bankName) : undefined,
        })).filter((sip) => Number.isInteger(sip.id) && sip.id > 0);
    },

    async addSip(sip: Omit<Sip, 'id'>): Promise<Sip> {
        const payload = {
            ...sip,
            type: String(sip.type || '').trim(),
            investmentName: String(sip.investmentName || '').trim(),
            bankName: String(sip.bankName || '').trim(),
            monthlyAmount: toNum(sip.monthlyAmount),
            sipDay: Number(sip.sipDay),
        };
        const response = await api.post<Sip>('/api/expenses/sips', payload);
        return response.data;
    },

    async editSip(id: number, sip: Omit<Sip, 'id'>): Promise<Sip> {
        const payload = {
            id,
            type: String(sip.type || '').trim(),
            investmentName: String(sip.investmentName || '').trim(),
            bankName: String(sip.bankName || '').trim(),
            monthlyAmount: toNum(sip.monthlyAmount),
            sipDay: Number(sip.sipDay),
        };
        const response = await api.put<Sip>('/api/expenses/sips', payload);
        return response.data;
    },

    async deleteSip(id: number, password: string): Promise<void> {
        await api.delete(`/api/expenses/sips?id=${id}`, { data: { password } });
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
        const now = new Date();
        await api.put('/api/expenses/budgets', {
            category,
            limitAmount,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
        });
    },

    async deleteBudget(category: string): Promise<void> {
        const now = new Date();
        await api.delete(
            `/api/expenses/budgets?category=${encodeURIComponent(category)}&month=${now.getMonth() + 1}&year=${now.getFullYear()}`
        );
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
