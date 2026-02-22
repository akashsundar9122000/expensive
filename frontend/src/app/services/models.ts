export interface User {
    name: string;
    email: string;
    avatar?: string;
    password?: string;
    bankAccounts: string[];
}

export interface Transaction {
    id: number;
    amount: number;
    category: string;
    subCategory: string;
    date: string;
    mode: 'Bank' | 'UPI' | 'Card';
}

export interface Subscription {
    id: number;
    name: string;
    date: string;
    amount: number;
    icon: string;
    color: string;
}

export interface Investment {
    id: number;
    type: string;
    name: string;
    amount: number;
    returnPct?: number;
}

export interface DashboardStats {
    balance: number;
    monthlyExpenses: number;
    totalInvestment: number;
    investAmount: number;
    goalName: string;
    goalRequired: number;
    goalCollected: number;
    bankBalances: { [key: string]: number };
}
