import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ExpenseService } from '../services/expense.service';
import { AuthService } from '../services/auth.service';
import { Transaction, Subscription, DashboardStats, User, Budget } from '../services/models';
import { Observable, combineLatest, map } from 'rxjs';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { RouterLink } from '@angular/router';
import { CountUpDirective } from '../shared/directives/count-up.directive';


@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, SidebarComponent, RouterLink, CountUpDirective],
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
    showAssets = false;
    selectedBank = 'SBI';

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
            if (!event.target.closest('.stat-label') && !event.target.closest('.bank-selector-menu')) {
                this.showBankSelector = false;
            }
        };
    }

    ngOnDestroy(): void {
        if (this.timerInterval) clearInterval(this.timerInterval);
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


    getBudgetProgress(transactions: Transaction[], budgets: Budget[]): any[] {
        if (!budgets) return [];
        return budgets.map(b => {
            const spent = this.getCategorySpending(transactions || [], b.category);
            const percent = Math.min((spent / b.limitAmount) * 100, 100);
            return {
                ...b,
                spent,
                percent,
                status: percent > 90 ? 'danger' : percent > 75 ? 'warning' : 'success'
            };
        });
    }

    toggleMobileMenu() {
        this.isMobileMenuOpen = !this.isMobileMenuOpen;
    }

    onSaveBudget(category: string, limit: number) {
        if (!category || !limit) return;
        this.expenseService.saveBudget(category, limit);
        this.showModal = false;
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
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const formattedDate = `${dateParts[2]} ${months[parseInt(dateParts[1]) - 1]} ${dateParts[0].slice(-2)}`;

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
        const progress = (stats.goalCollected / stats.goalRequired) * 100;
        return `${Math.round(progress)}%`;
    }

    getGoalGradient(stats: DashboardStats): string {
        const progress = (stats.goalCollected / stats.goalRequired) * 100;
        return `conic-gradient(var(--warning-orange) ${progress}%, #FFF7ED 0deg)`;
    }
}
