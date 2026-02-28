import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

declare global {
    interface Window {
        google?: any;
    }
}

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
    rememberPassword = false;

    forgotEmail = '';
    forgotNewPassword = '';
    forgotConfirmPassword = '';
    showForgotPasswordForm = false;

    showPassword = false;
    isSubmitting = false;
    isGoogleSubmitting = false;
    errorMessage = '';
    infoMessage = '';

    private readonly googleClientId = environment.googleClientId;
    private googleReady = false;

    constructor(private authService: AuthService, private router: Router) { }

    ngOnInit() {
        const rememberedLogin = this.authService.getRememberedLogin();
        if (rememberedLogin?.remember) {
            this.email = rememberedLogin.email || '';
            this.rememberPassword = true;
        }

        this.loadGoogleSdk();
    }

    onSubmit() {
        this.errorMessage = '';
        this.infoMessage = '';
        this.isSubmitting = true;

        this.authService.login(this.email, this.password, this.rememberPassword).subscribe({
            next: (success) => {
                this.isSubmitting = false;
                if (success) {
                    this.router.navigate(['/dashboard']);
                } else {
                    this.errorMessage = 'Invalid email or password.';
                }
            },
            error: (err) => {
                this.isSubmitting = false;
                this.errorMessage = 'Login failed. Please check your credentials.';
                console.error(err);
            }
        });
    }

    onGoogleSignIn() {
        this.errorMessage = '';
        this.infoMessage = '';

        if (!this.googleClientId) {
            this.errorMessage = 'Google sign-in is not configured yet.';
            return;
        }

        if (!window.google || !this.googleReady) {
            this.errorMessage = 'Google sign-in is still loading. Please try again in a moment.';
            return;
        }

        this.isGoogleSubmitting = true;
        window.google.accounts.id.prompt((notification: any) => {
            if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
                this.isGoogleSubmitting = false;
                this.errorMessage = 'Google sign-in was dismissed. Please try again.';
            }
        });
    }

    toggleForgotPassword(event: Event) {
        event.preventDefault();
        this.errorMessage = '';
        this.infoMessage = '';
        this.showForgotPasswordForm = !this.showForgotPasswordForm;
        this.forgotEmail = this.email;
    }

    submitForgotPassword() {
        this.errorMessage = '';
        this.infoMessage = '';

        if (!this.forgotEmail || !this.forgotNewPassword) {
            this.errorMessage = 'Please enter your email and new password.';
            return;
        }

        if (this.forgotNewPassword.length < 6) {
            this.errorMessage = 'New password must be at least 6 characters.';
            return;
        }

        if (this.forgotNewPassword !== this.forgotConfirmPassword) {
            this.errorMessage = 'Passwords do not match.';
            return;
        }

        this.authService.forgotPassword(this.forgotEmail, this.forgotNewPassword).subscribe({
            next: () => {
                this.infoMessage = 'Password updated. You can sign in now.';
                this.password = '';
                this.forgotNewPassword = '';
                this.forgotConfirmPassword = '';
                this.showForgotPasswordForm = false;
            },
            error: (err) => {
                const status = Number(err?.status || 0);
                if (status === 401 || status === 403) {
                    this.errorMessage = 'For security reasons, password reset requires an active signed-in session.';
                } else {
                    this.errorMessage = 'Unable to reset password. Please try again.';
                }
                console.error(err);
            }
        });
    }

    private loadGoogleSdk() {
        if (!this.googleClientId) {
            return;
        }

        if (window.google?.accounts?.id) {
            this.initializeGoogleIdentity();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => this.initializeGoogleIdentity();
        script.onerror = () => {
            this.errorMessage = 'Failed to load Google sign-in.';
        };
        document.head.appendChild(script);
    }

    private initializeGoogleIdentity() {
        if (!window.google?.accounts?.id || !this.googleClientId) {
            return;
        }

        window.google.accounts.id.initialize({
            client_id: this.googleClientId,
            callback: (response: any) => this.handleGoogleCredential(response?.credential)
        });

        this.googleReady = true;
    }

    private handleGoogleCredential(idToken: string) {
        if (!idToken) {
            this.isGoogleSubmitting = false;
            this.errorMessage = 'Google sign-in failed. Please try again.';
            return;
        }

        this.authService.loginWithGoogle(idToken).subscribe({
            next: (success) => {
                this.isGoogleSubmitting = false;
                if (success) {
                    this.router.navigate(['/dashboard']);
                } else {
                    this.errorMessage = 'Unable to sign in with Google.';
                }
            },
            error: (err) => {
                this.isGoogleSubmitting = false;
                this.errorMessage = 'Unable to sign in with Google.';
                console.error(err);
            }
        });
    }
}
