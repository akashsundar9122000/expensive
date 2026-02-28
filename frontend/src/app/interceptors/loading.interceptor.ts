import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
    const isHealthRequest = req.url.includes('/api/health');
    const shouldTrack = req.url.includes('/api/') && !isHealthRequest;

    if (!shouldTrack) {
        return next(req);
    }

    const loadingService = inject(LoadingService);
    loadingService.startHttpRequest();

    return next(req).pipe(
        finalize(() => {
            loadingService.stopHttpRequest();
        })
    );
};