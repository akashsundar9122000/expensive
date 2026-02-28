import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface LoadingMessage {
    title: string;
    subtitle: string;
}

interface LoadingContext extends LoadingMessage {
    id: number;
    kind: 'http' | 'navigation';
    priority: number;
}

@Injectable({ providedIn: 'root' })
export class LoadingService {
    private readonly minVisibleMs = 450;
    private readonly loadingSubject = new BehaviorSubject<boolean>(false);
    private readonly loadingMessageSubject = new BehaviorSubject<LoadingMessage>({
        title: 'Loading your cash flow',
        subtitle: 'Syncing accounts and moving money data across screens...'
    });

    readonly isLoading$ = this.loadingSubject.asObservable();
    readonly loadingMessage$ = this.loadingMessageSubject.asObservable();

    private activeHttpRequests = 0;
    private activeNavigations = 0;
    private contextSequence = 0;
    private activeContexts: LoadingContext[] = [];
    private shownAt = 0;
    private hideTimer: ReturnType<typeof setTimeout> | null = null;

    startHttpRequest(message?: LoadingMessage, priority = 30): number {
        this.activeHttpRequests += 1;
        const contextId = this.addContext('http', message, priority);
        this.updateLoadingState();
        return contextId;
    }

    stopHttpRequest(contextId?: number): void {
        this.activeHttpRequests = Math.max(0, this.activeHttpRequests - 1);
        this.removeContext('http', contextId);
        this.updateLoadingState();
    }

    startNavigation(message?: LoadingMessage, priority = 20): number {
        this.activeNavigations += 1;
        const contextId = this.addContext('navigation', message, priority);
        this.updateLoadingState();
        return contextId;
    }

    stopNavigation(contextId?: number): void {
        this.activeNavigations = Math.max(0, this.activeNavigations - 1);
        this.removeContext('navigation', contextId);
        this.updateLoadingState();
    }

    private addContext(kind: 'http' | 'navigation', message: LoadingMessage | undefined, priority: number): number {
        const contextId = ++this.contextSequence;
        const context: LoadingContext = {
            id: contextId,
            kind,
            priority,
            ...(message ?? this.loadingMessageSubject.value)
        };

        this.activeContexts = [...this.activeContexts, context];
        this.updateDisplayedMessage();
        return contextId;
    }

    private removeContext(kind: 'http' | 'navigation', contextId?: number): void {
        if (this.activeContexts.length === 0) {
            return;
        }

        if (contextId !== undefined) {
            this.activeContexts = this.activeContexts.filter((context) => context.id !== contextId);
            this.updateDisplayedMessage();
            return;
        }

        for (let index = this.activeContexts.length - 1; index >= 0; index -= 1) {
            if (this.activeContexts[index].kind === kind) {
                this.activeContexts = this.activeContexts.filter((_, currentIndex) => currentIndex !== index);
                break;
            }
        }

        this.updateDisplayedMessage();
    }

    private updateDisplayedMessage(): void {
        if (this.activeContexts.length === 0) {
            return;
        }

        const topContext = [...this.activeContexts]
            .sort((first, second) => {
                if (first.priority === second.priority) {
                    return second.id - first.id;
                }
                return second.priority - first.priority;
            })[0];

        this.loadingMessageSubject.next({
            title: topContext.title,
            subtitle: topContext.subtitle
        });
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
            this.activeContexts = [];
            this.hideTimer = null;
        }, remaining);
    }
}