import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const token = localStorage.getItem('token');
    console.log('Auth interceptor - Token:', token ? 'Present' : 'Missing', 'Method:', req.method, 'URL:', req.url);

    if (token) {
        const cloned = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log('Token added to request');
        return next(cloned);
    }

    console.log('No token found - request unauthorized');
    return next(req);
};
