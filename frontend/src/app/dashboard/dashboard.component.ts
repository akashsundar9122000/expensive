import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ExpenseService } from '../services/expense.service';
import { AuthService } from '../services/auth.service';
import { Transaction, Subscription, DashboardStats, User, Budget } from '../services/models';
import { Observable } from 'rxjs';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, SidebarComponent, RouterLink],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
    currentTime = '';
    currentDate = '';
    greeting = '';
    private timerInterval: any;

    user$!: Observable<User | null>;
    stats$!: Observable<DashboardStats>;
    transactions$!: Observable<Transaction[]>;
    subscriptions$!: Observable<Subscription[]>;
    budgets$!: Observable<Budget[]>;

    showProfileMenu = false;
    showBankSelector = false;
    isMobileMenuOpen = false;
    showModal = false;
    showAddBankModal = false;
    showAssets = false;
    selectedBank = 'SBI';
    chartPeriod: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly';
    chartBars: { label: string; height: number; active: boolean }[] = [];
    toast: { show: boolean; message: string; type: 'success' | 'warning' | 'danger' } = { show: false, message: '', type: 'success' };

    expenseForm!: FormGroup;

    constructor(
        public expenseService: ExpenseService,
        private authService: AuthService,
        private fb: FormBuilder
    ) {
        this.initForm();
    }

    ngOnInit(): void {
        this.user$ = this.expenseService.getUser();
        this.stats$ = this.expenseService.getStats();
        this.transactions$ = this.expenseService.getTransactions();
        this.subscriptions$ = this.expenseService.getSubscriptions();
        this.budgets$ = this.expenseService.getBudgets();

        // Build chart bars whenever transactions update
        this.transactions$.subscribe(txns => this.buildChartBars(txns));

        this.user$.subscribe(user => {
            if (user && user.bankAccounts && user.bankAccounts.length > 0 && !user.bankAccounts.includes(this.selectedBank)) {
                this.selectedBank = user.bankAccounts[0];
            } else if (user && (!user.bankAccounts || user.bankAccounts.length === 0)) {
                this.expenseService.addBank('SBI');
                this.selectedBank = 'SBI';
            }
        });

        this.updateDateTime();
        this.timerInterval = setInterval(() => this.updateDateTime(), 60000);

        window.onclick = (event: any) => {
            if (!event.target.closest('.profile-dropdown') && !event.target.closest('.profile-menu')) {
                this.showProfileMenu = false;
            }
            if (!event.target.closest('.bank-pill') && !event.target.closest('.bank-dropdown')) {
                this.showBankSelector = false;
            }
        };
    }

    ngOnDestroy(): void {
        if (this.timerInterval) clearInterval(this.timerInterval);
        window.onclick = null;
    }

    private updateDateTime() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const h12 = hours % 12 || 12;
        this.currentTime = `${h12}:${minutes} ${ampm}`;

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        this.currentDate = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

        if (hours < 12) this.greeting = 'Good Morning';
        else if (hours < 17) this.greeting = 'Good Afternoon';
        else this.greeting = 'Good Evening';
    }

    getCategorySpending(transactions: Transaction[], category: string): number {
        return transactions
            .filter(t => t.category === category && (t.type === 'Expense' || !t.type))
            .reduce((sum, t) => sum + t.amount, 0);
    }

    // ─── Dynamic Top Categories ───────────────────────────────────────────────
    getTopCategories(transactions: Transaction[]): { name: string; amount: number; percent: number; color: string }[] {
        const COLORS: Record<string, string> = {
            'Food & Grocery': '#fbbf24',
            'Food': '#fbbf24',
            'Shopping': '#8b5cf6',
            'Entertainment': '#f97316',
            'Transport': '#3b82f6',
            'Bills': '#ef4444',
            'Education': '#10b981',
            'Other': '#64748b'
        };
        const totals: Record<string, number> = {};
        for (const t of transactions) {
            if (t.type === 'Expense' || !t.type) {
                totals[t.category] = (totals[t.category] || 0) + t.amount;
            }
        }
        const total = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
        return Object.entries(totals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([name, amount]) => ({
                name,
                amount,
                percent: Math.round((amount / total) * 100),
                color: COLORS[name] || COLORS['Other']
            }));
    }

    getTopCategoryPercent(transactions: Transaction[]): number {
        const top = this.getTopCategories(transactions);
        return top.length > 0 ? top[0].percent : 0;
    }

    // ─── Chart Period ─────────────────────────────────────────────────────────
    onChartPeriodChange(period: string) {
        this.chartPeriod = period as any;
        this.transactions$.subscribe(txns => this.buildChartBars(txns));
    }

    buildChartBars(transactions: Transaction[]) {
        const now = new Date();
        let bars: { label: string; height: number; active: boolean }[] = [];

        if (this.chartPeriod === 'monthly') {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            bars = monthNames.map((m, i) => {
                const spent = transactions
                    .filter(t => {
                        const d = t.date ? new Date(t.date) : null;
                        return d && d.getMonth() === i && d.getFullYear() === now.getFullYear();
                    })
                    .reduce((s, t) => s + t.amount, 0);
                return { label: m, height: spent, active: i === now.getMonth() };
            });
        } else if (this.chartPeriod === 'weekly') {
            bars = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const dayName = dayNames[d.getDay()];
                const spent = transactions
                    .filter(t => t.date && new Date(t.date).toDateString() === d.toDateString())
                    .reduce((s, t) => s + t.amount, 0);
                return { label: dayName, height: spent, active: i === 6 };
            });
        } else if (this.chartPeriod === 'daily') {
            bars = Array.from({ length: 24 }, (_, i) => ({
                label: i % 6 === 0 ? `${i}h` : '',
                height: 0,
                active: i === now.getHours()
            }));
        } else {
            // yearly
            const curYear = now.getFullYear();
            bars = Array.from({ length: 5 }, (_, i) => {
                const yr = curYear - 4 + i;
                const spent = transactions
                    .filter(t => t.date && new Date(t.date).getFullYear() === yr)
                    .reduce((s, t) => s + t.amount, 0);
                return { label: String(yr), height: spent, active: yr === curYear };
            });
        }

        const maxH = Math.max(...bars.map(b => b.height), 1);
        this.chartBars = bars.map(b => ({
            ...b,
            height: Math.round((b.height / maxH) * 85) + (b.height > 0 ? 5 : 0)
        }));
    }

    getBudgetProgress(transactions: Transaction[], budgets: Budget[]): any[] {
        if (!budgets) return [];
        return budgets.map(b => {
            const spent = this.getCategorySpending(transactions || [], b.category);
            const percent = b.limitAmount > 0 ? (spent / b.limitAmount) * 100 : 0;

            if (percent >= 90 && !this.showModal && !this.showAddBankModal) {
                this.showToast(`Warning: You've used ${Math.round(percent)}% of your ${b.category} budget!`, 'warning');
            }

            return {
                ...b,
                spent,
                percent,
                status: percent > 90 ? 'danger' : percent > 75 ? 'warning' : 'success'
            };
        });
    }

    showToast(message: string, type: 'success' | 'warning' | 'danger' = 'success') {
        if (this.toast.show) return;
        this.toast = { show: true, message, type };
        setTimeout(() => this.toast.show = false, 5000);
    }

    toggleMobileMenu() {
        this.isMobileMenuOpen = !this.isMobileMenuOpen;
    }

    onSaveBudget(category: string, limit: number) {
        if (!category || !limit) return;
        this.expenseService.saveBudget(category, limit);
        this.showModal = false;
    }

    onAddBank(name: string) {
        if (!name || !name.trim()) return;
        this.expenseService.addBank(name.trim());
        this.showAddBankModal = false;
    }

    logout() {
        this.authService.logout();
    }

    private initForm() {
        this.expenseForm = this.fb.group({
            amount: ['', [Validators.required, Validators.min(1)]],
            category: ['Food & Grocery', Validators.required],
            subCategory: ['', Validators.required],
            date: [new Date().toISOString().split('T')[0], Validators.required],
            mode: ['UPI', Validators.required],
            bank: ['SBI']
        });
    }

    toggleModal() {
        this.showModal = !this.showModal;
        if (!this.showModal) {
            this.expenseForm.reset({
                category: 'Food & Grocery',
                date: new Date().toISOString().split('T')[0],
                mode: 'UPI',
                bank: this.selectedBank
            });
        } else {
            this.expenseForm.patchValue({ bank: this.selectedBank });
        }
    }

    toggleProfileMenu() {
        this.showProfileMenu = !this.showProfileMenu;
    }

    toggleBankSelector() {
        this.showBankSelector = !this.showBankSelector;
    }

    selectBank(bank: string) {
        this.selectedBank = bank;
        this.showBankSelector = false;
        this.expenseForm.patchValue({ bank: bank });
    }

    onSubmit() {
        if (this.expenseForm.valid) {
            const formValue = this.expenseForm.value;
            const dateParts = formValue.date.split('-');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const formattedDate = `${dateParts[2]} ${monthNames[parseInt(dateParts[1]) - 1]} ${dateParts[0].slice(-2)}`;

            const { bank, ...transactionData } = formValue;
            this.expenseService.addTransaction(
                { ...transactionData, date: formattedDate },
                bank
            );

            this.toggleModal();
        }
    }

    deleteTransaction(id: number) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            this.expenseService.deleteTransaction(id);
        }
    }

    getGoalProgress(stats: DashboardStats): string {
        const progress = stats.goalRequired > 0 ? (stats.goalCollected / stats.goalRequired) * 100 : 0;
        return `${Math.round(progress)}%`;
    }

    getGoalGradient(stats: DashboardStats): string {
        const progress = stats.goalRequired > 0 ? (stats.goalCollected / stats.goalRequired) * 100 : 0;
        return `conic-gradient(var(--warning-orange) ${progress}%, #FFF7ED 0deg)`;
    }

    getCategoryTrend(transactions: Transaction[], category: string): { percent: number; color: string } {
        const total = transactions.reduce((sum, t) => sum + t.amount, 0);
        const spent = this.getCategorySpending(transactions, category);
        const percent = total > 0 ? (spent / total) * 100 : 0;
        const colors: Record<string, string> = {
            'Food & Grocery': '#fbbf24',
            'Food': '#fbbf24',
            'Education': '#10b981',
            'Shopping': '#8b5cf6',
            'Transport': '#3b82f6',
            'Bills': '#ef4444',
            'Other': '#64748b'
        };
        return { percent, color: colors[category] || colors['Other'] };
    }

    exportToCSV() {
        this.transactions$.subscribe(transactions => {
            if (!transactions || transactions.length === 0) {
                this.showToast('No transactions to export', 'warning');
                return;
            }
            const headers = ['ID', 'Amount', 'Category', 'SubCategory', 'Date', 'Mode', 'Type'];
            const rows = transactions.map(t => [
                t.id, t.amount, t.category, t.subCategory, t.date, t.mode, t.type || 'Expense'
            ]);
            const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `expenses_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this.showToast('Export successful!', 'success');
        });
    }
}
