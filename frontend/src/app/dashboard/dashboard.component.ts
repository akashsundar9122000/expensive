import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ExpenseService } from '../services/expense.service';
import { AuthService } from '../services/auth.service';
import { Transaction, Subscription, DashboardStats, User } from '../services/models';
import { Observable } from 'rxjs';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, SidebarComponent, RouterLink],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
    user$!: Observable<User | null>;
    stats$!: Observable<DashboardStats>;
    transactions$!: Observable<Transaction[]>;
    subscriptions$!: Observable<Subscription[]>;

    showModal = false;
    showProfileMenu = false;
    showBankSelector = false;
    showAssets = false;
    selectedBank: string = 'SBI'; // Default fallback
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

        this.user$.subscribe(user => {
            if (user && user.bankAccounts && user.bankAccounts.length > 0 && !user.bankAccounts.includes(this.selectedBank)) {
                this.selectedBank = user.bankAccounts[0];
            } else if (user && (!user.bankAccounts || user.bankAccounts.length === 0)) {
                // Automatically add SBI as default if nothing exists
                this.expenseService.addBank('SBI');
                this.selectedBank = 'SBI';
            }
        });

        // Close menus on click outside
        window.onclick = (event: any) => {
            if (!event.target.closest('.profile-dropdown') && !event.target.closest('.profile-menu')) {
                this.showProfileMenu = false;
            }
            if (!event.target.closest('.stat-label') && !event.target.closest('.bank-selector-menu')) {
                this.showBankSelector = false;
            }
        };
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

    logout() {
        this.authService.logout();
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
