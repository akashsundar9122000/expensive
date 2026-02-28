import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
    private readonly minVisibleMs = 450;
    private readonly loadingSubject = new BehaviorSubject<boolean>(false);

    readonly isLoading$ = this.loadingSubject.asObservable();

    private activeHttpRequests = 0;
    private activeNavigations = 0;
    private shownAt = 0;
    private hideTimer: ReturnType<typeof setTimeout> | null = null;

    startHttpRequest(): void {
        this.activeHttpRequests += 1;
        this.updateLoadingState();
    }

    stopHttpRequest(): void {
        this.activeHttpRequests = Math.max(0, this.activeHttpRequests - 1);
        this.updateLoadingState();
    }

    startNavigation(): void {
        this.activeNavigations += 1;
        this.updateLoadingState();
    }

    stopNavigation(): void {
        this.activeNavigations = Math.max(0, this.activeNavigations - 1);
        this.updateLoadingState();
    }

    private updateLoadingState(): void {
        const shouldShow = this.activeHttpRequests > 0 || this.activeNavigations > 0;

        if (shouldShow) {
            if (this.hideTimer) {
                clearTimeout(this.hideTimer);
                this.hideTimer = null;
            }

            if (!this.loadingSubject.value) {
                this.shownAt = Date.now();
                this.loadingSubject.next(true);
            }

            return;
        }

        if (!this.loadingSubject.value) {
            return;
        }

        const elapsed = Date.now() - this.shownAt;
        const remaining = Math.max(this.minVisibleMs - elapsed, 0);

        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
        }

        this.hideTimer = setTimeout(() => {
            this.loadingSubject.next(false);
            this.hideTimer = null;
        }, remaining);
    }
}