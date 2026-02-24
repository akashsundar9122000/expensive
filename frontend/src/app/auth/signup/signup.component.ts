import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-signup',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './signup.component.html',
    styleUrl: './signup.component.css'
})
export class SignupComponent {
    name = '';
    email = '';
    password = '';
    showPassword = false;
    errorMessage = '';

    constructor(private authService: AuthService, private router: Router) { }

    onSubmit() {
        if (!this.name || !this.email || !this.password) {
            this.errorMessage = 'Please fill in all fields.';
            return;
        }

        this.authService.register({
            name: this.name,
            email: this.email,
            password: this.password,
            bankAccounts: []
        }).subscribe({
            next: () => {
                this.router.navigate(['/login']);
            },
            error: (err) => {
                this.errorMessage = 'Signup failed. Email may already be registered.';
                console.error(err);
            }
        });
    }
}
