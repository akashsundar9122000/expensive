import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { User } from './models';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private currentUserSubject = new BehaviorSubject<User | null>(null);
    private apiUrl = '/api/auth';
    private rememberedLoginKey = 'rememberedLogin';

    constructor(private router: Router, private http: HttpClient) {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUserSubject.next(JSON.parse(savedUser));
        }
    }

    getCurrentUser(): Observable<User | null> {
        return this.currentUserSubject.asObservable();
    }

    get currentUserValue(): User | null {
        return this.currentUserSubject.value;
    }

    register(user: any): Observable<any> {
        const normalizedUser = {
            ...user,
            email: (user?.email || '').trim().toLowerCase()
        };
        return this.http.post(`${this.apiUrl}/register`, normalizedUser);
    }

    login(email: string, password: string, rememberPassword = false): Observable<boolean> {
        const normalizedEmail = (email || '').trim().toLowerCase();
        return this.http.post<any>(`${this.apiUrl}/login`, { email: normalizedEmail, password })
            .pipe(
                map(response => {
                    if (response && response.token) {
                        this.persistSession(response);
                        if (rememberPassword) {
                            localStorage.setItem(this.rememberedLoginKey, JSON.stringify({
                                email: normalizedEmail,
                                password,
                                remember: true
                            }));
                        } else {
                            localStorage.removeItem(this.rememberedLoginKey);
                        }
                        return true;
                    }
                    return false;
                })
            );
    }

    loginWithGoogle(idToken: string): Observable<boolean> {
        return this.http.post<any>(`${this.apiUrl}/google`, { idToken })
            .pipe(
                map(response => {
                    if (response && response.token) {
                        this.persistSession(response);
                        return true;
                    }
                    return false;
                })
            );
    }

    forgotPassword(email: string, newPassword: string): Observable<any> {
        const normalizedEmail = (email || '').trim().toLowerCase();
        return this.http.post(`${this.apiUrl}/forgot-password`, {
            email: normalizedEmail,
            newPassword
        });
    }

    getRememberedLogin(): { email: string; password: string; remember: boolean } | null {
        const saved = localStorage.getItem(this.rememberedLoginKey);
        if (!saved) {
            return null;
        }

        try {
            return JSON.parse(saved);
        } catch {
            localStorage.removeItem(this.rememberedLoginKey);
            return null;
        }
    }

    updateUserInfo(updates: Partial<User>) {
        const user = this.currentUserSubject.value;
        if (user) {
            // Update local state first for instant feedback
            const updatedUser = { ...user, ...updates };
            this.currentUserSubject.next(updatedUser);
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));

            // Persist to backend
            this.http.put(`${this.apiUrl}/profile`, {
                name: updates.name,
                avatarUrl: updates.avatar
            }).subscribe({
                error: (err) => console.error('Failed to update profile on backend:', err)
            });
        }
    }

    deleteAccount(currentPassword: string): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/account/delete`, {
            password: currentPassword
        }).pipe(
            tap(() => {
                localStorage.removeItem(this.rememberedLoginKey);
                this.logout();
            })
        );
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
    }

    isLoggedIn(): boolean {
        return !!localStorage.getItem('token');
    }

    private persistSession(response: any) {
        localStorage.setItem('token', response.token);
        const user: User = {
            name: response.name,
            email: response.email,
            avatar: response.avatarUrl,
            bankAccounts: []
        };
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
    }
}
