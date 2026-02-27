import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const isAuthEndpoint = /\/api\/auth\/(login|register|google|forgot-password)$/i.test(req.url);
    if (isAuthEndpoint) {
        return next(req);
    }

    const authService = inject(AuthService);
    const token = authService.getValidToken();

    if (token) {
        const cloned = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
        return next(cloned);
    }

    return next(req);
};
