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
        return this.http.post(`${this.apiUrl}/register`, user);
    }

    login(email: string, password: string): Observable<boolean> {
        return this.http.post<any>(`${this.apiUrl}/login`, { email, password })
            .pipe(
                map(response => {
                    if (response && response.token) {
                        localStorage.setItem('token', response.token);
                        const user: User = {
                            name: response.name,
                            email: response.email,
                            avatar: response.avatarUrl,
                            bankAccounts: [] // These will be fetched by ExpenseService
                        };
                        localStorage.setItem('currentUser', JSON.stringify(user));
                        this.currentUserSubject.next(user);
                        return true;
                    }
                    return false;
                })
            );
    }

    updateUserInfo(updates: Partial<User>) {
        const user = this.currentUserSubject.value;
        if (user) {
            const updatedUser = { ...user, ...updates };
            this.currentUserSubject.next(updatedUser);
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }
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
}
