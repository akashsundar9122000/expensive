import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css'
})
export class LoginComponent {
    email = '';
    password = '';
    showPassword = false;
    errorMessage = '';

    constructor(private authService: AuthService, private router: Router) { }

    onSubmit() {
        this.authService.login(this.email, this.password).subscribe({
            next: (success) => {
                if (success) {
                    this.router.navigate(['/dashboard']);
                } else {
                    this.errorMessage = 'Invalid email or password.';
                }
            },
            error: (err) => {
                this.errorMessage = 'Login failed. Please check your credentials.';
                console.error(err);
            }
        });
    }
}
