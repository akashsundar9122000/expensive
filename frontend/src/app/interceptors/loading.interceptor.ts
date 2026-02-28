import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingMessage, LoadingService } from '../services/loading.service';

function resourceLabel(path: string): string {
    if (path.includes('/transactions')) return 'transactions';
    if (path.includes('/subscriptions')) return 'subscriptions';
    if (path.includes('/investments')) return 'investments';
    if (path.includes('/sips')) return 'SIPs';
    if (path.includes('/budgets')) return 'budgets';
    if (path.includes('/banks')) return 'bank accounts';
    if (path.includes('/stats')) return 'insights';
    return 'data';
}

function resolveHttpLoadingMessage(url: string, method: string): { message: LoadingMessage; priority: number } {
    const normalizedMethod = method.toUpperCase();

    if (url.includes('/api/auth/login')) {
        return {
            message: {
                title: 'Signing you in',
                subtitle: 'Verifying your credentials and preparing your account...'
            },
            priority: 100
        };
    }

    if (url.includes('/api/auth/google')) {
        return {
            message: {
                title: 'Connecting Google account',
                subtitle: 'Completing secure Google sign-in...'
            },
            priority: 100
        };
    }

    if (url.includes('/api/auth/register')) {
        return {
            message: {
                title: 'Creating your account',
                subtitle: 'Setting up your profile and security details...'
            },
            priority: 95
        };
    }

    if (url.includes('/api/auth/forgot-password')) {
        return {
            message: {
                title: 'Resetting password',
                subtitle: 'Applying your new password securely...'
            },
            priority: 95
        };
    }

    if (url.includes('/api/auth/profile')) {
        return {
            message: {
                title: 'Updating profile',
                subtitle: 'Saving your latest account information...'
            },
            priority: 90
        };
    }

    if (url.includes('/api/auth/account/delete')) {
        return {
            message: {
                title: 'Deleting account',
                subtitle: 'Removing your account and signed-in session...'
            },
            priority: 100
        };
    }

    if (url.includes('/api/expenses/bootstrap')) {
        return {
            message: {
                title: 'Preparing dashboard',
                subtitle: 'Gathering balances, budgets, and latest activity...'
            },
            priority: 80
        };
    }

    const label = resourceLabel(url);
    if (normalizedMethod === 'POST') {
        return {
            message: {
                title: `Saving ${label}`,
                subtitle: `Writing your ${label} changes...`
            },
            priority: 75
        };
    }

    if (normalizedMethod === 'PUT' || normalizedMethod === 'PATCH') {
        return {
            message: {
                title: `Updating ${label}`,
                subtitle: `Applying updates to your ${label}...`
            },
            priority: 72
        };
    }

    if (normalizedMethod === 'DELETE') {
        return {
            message: {
                title: `Removing ${label}`,
                subtitle: `Deleting selected ${label} records...`
            },
            priority: 78
        };
    }

    return {
        message: {
            title: `Loading ${label}`,
            subtitle: `Fetching your latest ${label} from server...`
        },
        priority: 60
    };
}

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
    const isHealthRequest = req.url.includes('/api/health');
    const isMarketRequest = req.url.includes('/api/expenses/market') || req.url.includes('/api/expenses/stocks');
    const shouldTrack = req.url.includes('/api/') && !isHealthRequest && !isMarketRequest;

    if (!shouldTrack) {
        return next(req);
    }

    const loadingService = inject(LoadingService);
    const { message, priority } = resolveHttpLoadingMessage(req.url, req.method);
    const contextId = loadingService.startHttpRequest(message, priority);

    return next(req).pipe(
        finalize(() => {
            loadingService.stopHttpRequest(contextId);
        })
    );
};