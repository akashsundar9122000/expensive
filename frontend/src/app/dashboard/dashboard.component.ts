import { Component, OnInit, OnDestroy, NgZone, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ExpenseService } from '../services/expense.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { Transaction, Subscription, DashboardStats, User, Budget, Bank } from '../services/models';
import { Observable, take, Subject, takeUntil, combineLatest } from 'rxjs';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { NotificationPanelComponent } from '../shared/notification-panel/notification-panel.component';
import { RouterLink } from '@angular/router';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import 'jspdf-autotable';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, SidebarComponent, NotificationPanelComponent, RouterLink],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {
    currentTime = '';
    currentDate = '';
    greeting = '';
    private timerInterval: any;
    private windowClickHandler: any;
    private destroy$ = new Subject<void>();

    user$!: Observable<User | null>;
    stats$!: Observable<DashboardStats>;
    transactions$!: Observable<Transaction[]>;
    subscriptions$!: Observable<Subscription[]>;
    budgets$!: Observable<Budget[]>;
    banks$!: Observable<Bank[]>;
    unreadCount$!: Observable<number>;

    showProfileMenu = false;
    showBankSelector = false;
    isMobileMenuOpen = false;
    showModal = false;
    showAddBankModal = false;
    showAssets = false;
    showNotificationPanel = false;
    selectedBank = '';
    chartPeriod: 'weekly' | 'monthly' | 'yearly' = 'monthly';
    chartBars: { label: string; height: number; active: boolean; amount: number }[] = [];
    toast: { show: boolean; message: string; type: 'success' | 'warning' | 'danger' } = { show: false, message: '', type: 'success' };
    budgetEditValues: { [category: string]: number } = {};
    cachedBudgetProgress: any[] = [];
    cachedTopCategories: any[] = [];
    cachedTopCategoryPercent = 0;
    showBudgetEditModal = false;
    showDeleteConfirmModal = false;
    editingBudget: { category: string; limitAmount: number } | null = null;
    deletingBudgetCategory: string | null = null;
    notifiedBudgets: Set<string> = new Set();

    expenseForm!: FormGroup;

    constructor(
        public expenseService: ExpenseService,
        private authService: AuthService,
        private notificationService: NotificationService,
        private fb: FormBuilder,
        private ngZone: NgZone,
        private cdr: ChangeDetectorRef
    ) {
        this.initForm();
    }

    ngOnInit(): void {
        this.user$ = this.expenseService.getUser();
        this.stats$ = this.expenseService.getStats();
        this.transactions$ = this.expenseService.getTransactions();
        this.subscriptions$ = this.expenseService.getSubscriptions();
        this.budgets$ = this.expenseService.getBudgets();
        this.banks$ = this.expenseService.getBanks();
        this.unreadCount$ = this.notificationService.getUnreadCount();

        // Initialize notifiedBudgets Set from existing notifications
        this.notificationService.getNotifications().pipe(take(1)).subscribe(notifications => {
            notifications.forEach(notif => {
                if (notif.category) {
                    if (notif.type === 'budget-alert') {
                        this.notifiedBudgets.add(notif.category);
                    } else if (notif.type === 'warning') {
                        this.notifiedBudgets.add(`${notif.category}_warning`);
                    }
                }
            });
        });

        // Build chart bars and cache budget progress whenever data updates
        combineLatest([this.transactions$, this.budgets$])
            .pipe(takeUntil(this.destroy$))
            .subscribe(([txns, budgets]) => {
                this.buildChartBars(txns);
                // Cache top categories
                this.cachedTopCategories = this.getTopCategories(txns || []);
                this.cachedTopCategoryPercent = this.getTopCategoryPercent(txns || []);
                if (budgets.length > 0) {
                    this.cachedBudgetProgress = this.getBudgetProgress(txns || [], budgets || []);
                }
                this.cdr.markForCheck();
            });

        this.banks$.pipe(takeUntil(this.destroy$)).subscribe(banks => {
            if (banks.length === 0) {
                this.selectedBank = '';
                this.expenseForm.patchValue({ bank: '' });
                this.cdr.markForCheck();
                return;
            }

            if (!banks.some(b => b.name === this.selectedBank)) {
                this.selectedBank = banks[0].name;
                this.expenseForm.patchValue({ bank: this.selectedBank });
                this.cdr.markForCheck();
            }
        });

        this.updateDateTime();
        this.timerInterval = setInterval(() => this.updateDateTime(), 60000);

        // Window click handler - use runOutsideAngular to prevent change detection on every click
        this.windowClickHandler = (event: any) => {
            const profileDropdown = event.target.closest('.profile-dropdown');
            const profileMenu = event.target.closest('.profile-menu');
            const bankPill = event.target.closest('.bank-pill');
            const bankDropdown = event.target.closest('.bank-dropdown');

            if ((!profileDropdown && !profileMenu) || (!bankPill && !bankDropdown)) {
                // Only run change detection if state actually changes
                let needsDetection = false;
                if (!profileDropdown && !profileMenu && this.showProfileMenu) {
                    this.showProfileMenu = false;
                    needsDetection = true;
                }
                if (!bankPill && !bankDropdown && this.showBankSelector) {
                    this.showBankSelector = false;
                    needsDetection = true;
                }
                if (needsDetection) {
                    this.cdr.markForCheck();
                }
            }
        };
        
        // Add listener outside Angular zone to prevent change detection triggers
        this.ngZone.runOutsideAngular(() => {
            window.addEventListener('click', this.windowClickHandler);
        });
    }

    ngOnDestroy(): void {
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.windowClickHandler) {
            window.removeEventListener('click', this.windowClickHandler);
        }
        this.destroy$.next();
        this.destroy$.complete();
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
        if (!transactions || transactions.length === 0) return [];

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
            // Only count child expenses (type null or 'Expense')
            if (t.type === 'Expense' || !t.type) {
                const amount = Number(t.amount) || 0;
                totals[t.category] = (totals[t.category] || 0) + amount;
            }
        }

        const totalSpent = Object.values(totals).reduce((a, b) => a + b, 0);
        if (totalSpent <= 0) return [];

        return Object.entries(totals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([name, amount]) => {
                const percent = Math.round((amount / totalSpent) * 100);
                return {
                    name,
                    amount,
                    percent: isNaN(percent) ? 0 : percent,
                    color: COLORS[name] || COLORS['Other']
                };
            });
    }

    getTopCategoryPercent(transactions: Transaction[]): number {
        const top = this.getTopCategories(transactions);
        return top.length > 0 ? top[0].percent : 0;
    }

    // ─── Chart Period ─────────────────────────────────────────────────────────
    onChartPeriodChange(period: string) {
        this.chartPeriod = period as any;
        this.transactions$.pipe(take(1), takeUntil(this.destroy$)).subscribe(txns => {
            this.buildChartBars(txns);
            this.cdr.markForCheck();
        });
    }

    buildChartBars(transactions: Transaction[]) {
        const now = new Date();
        let bars: { label: string; height: number; active: boolean; amount: number }[] = [];

        if (this.chartPeriod === 'monthly') {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            bars = monthNames.map((m, i) => {
                const spent = transactions
                    .filter(t => {
                        const d = t.date ? new Date(t.date) : null;
                        return d && !isNaN(d.getTime()) && d.getMonth() === i && d.getFullYear() === now.getFullYear();
                    })
                    .reduce((s, t) => s + t.amount, 0);
                return { label: m, height: spent, active: i === now.getMonth(), amount: spent };
            });
        } else if (this.chartPeriod === 'weekly') {
            bars = Array.from({ length: 7 }, (_, i) => {
                const dayDate = new Date();
                dayDate.setDate(dayDate.getDate() - (6 - i));
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const dayName = dayNames[dayDate.getDay()];
                const spent = transactions
                    .filter(t => {
                        const txDate = t.date ? new Date(t.date) : null;
                        return txDate && !isNaN(txDate.getTime()) && txDate.toDateString() === dayDate.toDateString();
                    })
                    .reduce((s, t) => s + t.amount, 0);
                return { label: dayName, height: spent, active: i === 6, amount: spent };
            });
        } else {
            // yearly
            const curYear = now.getFullYear();
            bars = Array.from({ length: 5 }, (_, i) => {
                const yr = curYear - 4 + i;
                const spent = transactions
                    .filter(t => {
                        const d = t.date ? new Date(t.date) : null;
                        return d && !isNaN(d.getTime()) && d.getFullYear() === yr;
                    })
                    .reduce((s, t) => s + t.amount, 0);
                return { label: String(yr), height: spent, active: yr === curYear, amount: spent };
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

            // Initialize budget edit values for each budget
            if (this.budgetEditValues[b.category] == null) {
                this.budgetEditValues[b.category] = b.limitAmount;
            }

            // Check if budget is exceeded (100%) and send notification
            if (percent > 100 && !this.notifiedBudgets.has(b.category)) {
                if (!this.notificationService.hasNotificationToday(b.category, 'budget-alert')) {
                    this.notificationService.addBudgetExceededNotification(b.category, spent, b.limitAmount);
                    this.showToast(`Alert: ${b.category} budget exceeded! You've spent ₹${spent.toFixed(2)} of ₹${b.limitAmount.toFixed(2)}`, 'warning');
                }
                this.notifiedBudgets.add(b.category);
            } 
            // Check if within budget range (90-100%) and send warning
            else if (percent >= 90 && percent <= 100 && !this.notifiedBudgets.has(`${b.category}_warning`) && !this.showModal && !this.showAddBankModal) {
                if (!this.notificationService.hasNotificationToday(b.category, 'warning')) {
                    this.notificationService.addNotification({
                        title: `Budget Warning: ${b.category}`,
                        message: `You've used ${Math.round(percent)}% of your ${b.category} budget (₹${spent.toFixed(2)} / ₹${b.limitAmount.toFixed(2)})`,
                        type: 'warning',
                        icon: 'ph-warning',
                        read: false,
                        category: b.category,
                        amount: spent,
                        limit: b.limitAmount
                    });
                    this.showToast(`Warning: You've used ${Math.round(percent)}% of your ${b.category} budget!`, 'warning');
                }
                this.notifiedBudgets.add(`${b.category}_warning`);
            }
            // Reset notification flags when budget goes back under limit
            else if (percent < 90) {
                this.notifiedBudgets.delete(b.category);
                this.notifiedBudgets.delete(`${b.category}_warning`);
            }

            return {
                ...b,
                spent,
                percent,
                status: percent > 90 ? 'danger' : percent > 75 ? 'warning' : 'success'
            };
        });
    }

    saveBudgetEdit(category: string) {
        const limit = this.budgetEditValues[category];
        if (!category || limit == null || limit <= 0) return;
        this.expenseService.saveBudget(category, limit);
    }

    cancelBudgetEdit(category: string, currentLimit: number) {
        if (!category) return;
        this.budgetEditValues[category] = currentLimit;
    }

    openBudgetEditModal(budget: any) {
        this.editingBudget = { category: budget.category, limitAmount: budget.limitAmount };
        this.budgetEditValues[budget.category] = budget.limitAmount;
        this.showBudgetEditModal = true;
        this.cdr.markForCheck();
    }

    closeBudgetEditModal() {
        this.showBudgetEditModal = false;
        this.editingBudget = null;
        this.cdr.markForCheck();
    }

    saveBudgetFromModal() {
        if (!this.editingBudget) return;
        const limit = this.budgetEditValues[this.editingBudget.category];
        if (limit == null || limit <= 0) return;
        this.expenseService.saveBudget(this.editingBudget.category, limit);
        this.closeBudgetEditModal();
    }

    openDeleteConfirmModal(category: string) {
        this.deletingBudgetCategory = category;
        this.showDeleteConfirmModal = true;
        this.cdr.markForCheck();
    }

    closeDeleteConfirmModal() {
        this.showDeleteConfirmModal = false;
        this.deletingBudgetCategory = null;
        this.cdr.markForCheck();
    }

    confirmDeleteBudget() {
        if (this.deletingBudgetCategory) {
            this.expenseService.deleteBudget(this.deletingBudgetCategory);
            this.closeDeleteConfirmModal();
        }
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

    onAddBank(name: string, balance?: number) {
        if (!name || !name.trim()) return;
        const normalizedBalance = Number.isFinite(balance as number) ? Number(balance) : 0;
        this.expenseService.addBank(name.trim(), normalizedBalance);
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
            bank: ['']
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
        this.cdr.markForCheck();
    }

    toggleProfileMenu() {
        this.showProfileMenu = !this.showProfileMenu;
        this.cdr.markForCheck();
    }

    toggleBankSelector() {
        this.showBankSelector = !this.showBankSelector;
        this.cdr.markForCheck();
    }

    selectBank(bank: string) {
        this.selectedBank = bank;
        this.showBankSelector = false;
        this.expenseForm.patchValue({ bank: bank });
        this.cdr.markForCheck();
    }

    toggleNotificationPanel() {
        this.showNotificationPanel = !this.showNotificationPanel;
        this.cdr.markForCheck();
    }

    closeNotificationPanel() {
        this.showNotificationPanel = false;
        this.cdr.markForCheck();
    }

    onSubmit() {
        if (this.expenseForm.valid) {
            const formValue = this.expenseForm.value;
            const { bank, ...transactionData } = formValue;

            // Send date as-is (ISO format YYYY-MM-DD from the input)
            this.expenseService.addTransaction(transactionData, bank);

            this.toggleModal();
        }
    }

    deleteTransaction(id: number) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            this.expenseService.deleteTransaction(id);
        }
    }

    deleteBudget(category: string) {
        if (!category) return;
        if (confirm(`Delete budget for ${category}?`)) {
            this.expenseService.deleteBudget(category);
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

    exportToPDF() {
        this.transactions$.pipe(take(1)).subscribe(transactions => {
            if (!transactions || transactions.length === 0) {
                this.showToast('No transactions to export', 'warning');
                return;
            }

            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pageHeight = doc.internal.pageSize.getHeight();
            const pageWidth = doc.internal.pageSize.getWidth();
            let yPosition = 20;

            // Title
            doc.setFontSize(20);
            doc.text('Expense Analysis Report', pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 15;

            // Report Date
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 10;

            // Summary Stats
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text('Summary Statistics:', 20, yPosition);
            yPosition += 8;

            this.stats$.pipe(take(1)).subscribe(stats => {
                doc.setFontSize(10);
                const summaryData = [
                    ['Total Transactions', transactions.length.toString()],
                    ['Monthly Expenses', `₹${stats.monthlyExpenses.toFixed(2)}`],
                    ['Average Transaction', `₹${(transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length).toFixed(2)}`]
                ];

                (doc as any).autoTable({
                    startY: yPosition,
                    head: [['Metric', 'Value']],
                    body: summaryData,
                    margin: 20,
                    theme: 'grid',
                    headStyles: { fillColor: [59, 130, 246], textColor: 255 }
                });

                yPosition = (doc as any).lastAutoTable.finalY + 10;

                // Top Categories
                doc.setFontSize(12);
                doc.text('Top Categories:', 20, yPosition);
                yPosition += 8;

                const categoryData = this.getTopCategories(transactions).map(cat => [
                    cat.name,
                    `₹${cat.amount.toFixed(2)}`,
                    `${cat.percent}%`
                ]);

                (doc as any).autoTable({
                    startY: yPosition,
                    head: [['Category', 'Amount', 'Percentage']],
                    body: categoryData,
                    margin: 20,
                    theme: 'grid',
                    headStyles: { fillColor: [59, 130, 246], textColor: 255 }
                });

                yPosition = (doc as any).lastAutoTable.finalY + 10;

                // Transaction Details
                if (yPosition + 10 > pageHeight - 20) {
                    doc.addPage();
                    yPosition = 20;
                }

                doc.setFontSize(12);
                doc.text('Recent Transactions:', 20, yPosition);
                yPosition += 8;

                const transactionData = transactions.slice(0, 15).map(t => [
                    new Date(t.date).toLocaleDateString(),
                    t.category,
                    t.subCategory,
                    `₹${t.amount.toFixed(2)}`,
                    t.mode
                ]);

                (doc as any).autoTable({
                    startY: yPosition,
                    head: [['Date', 'Category', 'Description', 'Amount', 'Mode']],
                    body: transactionData,
                    margin: 20,
                    theme: 'grid',
                    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
                    columnStyles: { 3: { halign: 'right' } }
                });

                // Save PDF
                doc.save(`expense_analysis_${new Date().toISOString().split('T')[0]}.pdf`);
                this.showToast('PDF exported successfully!', 'success');
            });
        });
    }
}
