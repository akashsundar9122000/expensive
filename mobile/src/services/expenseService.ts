import api from './api';
import { Transaction, Subscription, Investment, DashboardStats } from './models';

export const expenseService = {
    // Stats
    async getStats(): Promise<DashboardStats> {
        const response = await api.get('/api/expenses/stats');
        const data = response.data;
        return {
            balance: data.balance || 0,
            monthlyExpenses: data.monthlyExpenses || 0,
            totalInvestment: data.totalInvestment || 0,
            investAmount: data.investAmount || 0,
            goalName: data.goalName || 'Savings Goal',
            goalRequired: data.goalRequired || 0,
            goalCollected: data.goalCollected || 0,
            bankBalances: data.bankBalances || {},
        };
    },

    // Transactions
    async getTransactions(): Promise<Transaction[]> {
        const response = await api.get<Transaction[]>('/api/expenses/transactions');
        return response.data;
    },

    async addTransaction(transaction: Omit<Transaction, 'id'>, bankName: string): Promise<Transaction> {
        const response = await api.post<Transaction>(
            `/api/expenses/transactions?bankName=${encodeURIComponent(bankName)}`,
            transaction
        );
        return response.data;
    },

    async deleteTransaction(id: number): Promise<void> {
        await api.delete(`/api/expenses/transactions/${id}`);
    },

    // Banks
    async getBanks(): Promise<any[]> {
        const response = await api.get('/api/expenses/banks');
        return response.data;
    },

    async addBank(name: string): Promise<any> {
        const response = await api.post(`/api/expenses/banks?name=${encodeURIComponent(name)}`, {});
        return response.data;
    },

    // Subscriptions
    async getSubscriptions(): Promise<Subscription[]> {
        const response = await api.get<Subscription[]>('/api/expenses/subscriptions');
        return response.data;
    },

    async addSubscription(sub: Omit<Subscription, 'id'>): Promise<Subscription> {
        const response = await api.post<Subscription>('/api/expenses/subscriptions', sub);
        return response.data;
    },

    async deleteSubscription(id: number): Promise<void> {
        await api.delete(`/api/expenses/subscriptions/${id}`);
    },

    // Investments
    async getInvestments(): Promise<Investment[]> {
        const response = await api.get<Investment[]>('/api/expenses/investments');
        return response.data;
    },

    async addInvestment(investment: Omit<Investment, 'id'>): Promise<Investment> {
        const response = await api.post<Investment>('/api/expenses/investments', investment);
        return response.data;
    },

    async deleteInvestment(id: number): Promise<void> {
        await api.delete(`/api/expenses/investments/${id}`);
    },

    // Preferences
    async updatePreferences(prefs: any): Promise<any> {
        const response = await api.put('/api/expenses/preferences', prefs);
        return response.data;
    },
};
