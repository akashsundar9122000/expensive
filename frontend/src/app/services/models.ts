export interface User {
    name: string;
    email: string;
    avatar?: string;
    password?: string;
    bankAccounts: string[];
}

export interface Bank {
    id: number;
    name: string;
    balance: number;
}

export interface Transaction {
    id: number;
    amount: number;
    category: string;
    subCategory: string;
    date: string;
    mode: 'Bank' | 'UPI' | 'Card';
    type?: 'Income' | 'Expense';
    bankName?: string;
}

export interface Subscription {
    id: number;
    name: string;
    date: string;
    amount: number;
    bankName?: string;
    icon?: string | null;
    color: string;
}

export interface Investment {
    id: number;
    type: string;
    name: string;
    amount: number;
    returnPct?: number;
}

export interface Sip {
    id: number;
    type: string;
    investmentName: string;
    monthlyAmount: number;
    sipDay: number;
    bankName?: string;
}

export interface Budget {
    category: string;
    limitAmount: number;
    month: number;
    year: number;
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

export interface MarketQuote {
    symbol: string;
    name: string;
    exchange: string;
    currency: string;
    price: number;
    previousClose: number;
    change: number;
    changePercent: number;
    marketTime: number;
}

export interface InvestedMarketQuote extends MarketQuote {
    investmentId: number;
    investmentName: string;
    totalInvested: number;
    sharesHeld: number;
    currentValue: number;
    pnl: number;
    pnlPercent: number;
    lotsCount: number;
}

export interface UnresolvedMarketStock {
    investmentId: number;
    name: string;
}

export interface MarketDataResponse {
    source: string;
    asOf: string;
    marketOpen: boolean;
    indices: MarketQuote[];
    topGainers: MarketQuote[];
    topLosers: MarketQuote[];
    investedStocks: InvestedMarketQuote[];
    unresolvedStocks: UnresolvedMarketStock[];
}

export interface IndianStockOption {
    symbol: string;
    name: string;
    display: string;
}

export interface Notification {
    id?: string;
    title: string;
    message: string;
    type: 'budget-alert' | 'warning' | 'info' | 'success';
    icon?: string;
    timestamp: Date;
    read: boolean;
    category?: string;
    amount?: number;
    limit?: number;
}
