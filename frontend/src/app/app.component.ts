import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { Router, RouterOutlet, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { catchError, of, timeout } from 'rxjs';
import { LoadingMessage, LoadingService } from './services/loading.service';
import { environment } from '../environments/environment';

function resolveNavigationLoadingMessage(url: string): LoadingMessage {
  if (url.startsWith('/login')) {
    return {
      title: 'Opening sign in',
      subtitle: 'Getting the login screen ready...'
    };
  }

  if (url.startsWith('/signup')) {
    return {
      title: 'Opening sign up',
      subtitle: 'Preparing your account creation form...'
    };
  }

  if (url.startsWith('/dashboard')) {
    return {
      title: 'Loading dashboard',
      subtitle: 'Pulling your balance, budgets, and quick stats...'
    };
  }

  if (url.startsWith('/expenses')) {
    return {
      title: 'Loading expenses',
      subtitle: 'Bringing in your recent transactions...'
    };
  }

  if (url.startsWith('/goals')) {
    return {
      title: 'Loading goals',
      subtitle: 'Checking progress against your savings targets...'
    };
  }

  if (url.startsWith('/subscriptions')) {
    return {
      title: 'Loading subscriptions',
      subtitle: 'Fetching recurring bills and due dates...'
    };
  }

  if (url.startsWith('/investments')) {
    return {
      title: 'Loading investments',
      subtitle: 'Preparing your portfolio and SIP activity...'
    };
  }

  if (url.startsWith('/cards')) {
    return {
      title: 'Loading cards',
      subtitle: 'Getting your credit card overview ready...'
    };
  }

  if (url.startsWith('/settings')) {
    return {
      title: 'Loading settings',
      subtitle: 'Opening your preferences and profile controls...'
    };
  }

  return {
    title: 'Loading page',
    subtitle: 'Preparing the next screen...'
  };
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgIf, AsyncPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'expense-tracker';

  readonly isLoading$ = this.loadingService.isLoading$;
  readonly loadingMessage$ = this.loadingService.loadingMessage$;
  private activeNavigationContextId: number | null = null;

  constructor(
    private readonly router: Router,
    private readonly loadingService: LoadingService,
    private readonly http: HttpClient
  ) {
    this.router.events
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (event instanceof NavigationStart) {
          const loadingMessage = resolveNavigationLoadingMessage(event.url);
          this.activeNavigationContextId = this.loadingService.startNavigation(loadingMessage, 50);
          return;
        }

        if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
          this.loadingService.stopNavigation(this.activeNavigationContextId ?? undefined);
          this.activeNavigationContextId = null;
        }
      });

    this.warmupBackend();
  }

  private warmupBackend(): void {
    if (!environment.production) {
      return;
    }

    this.http.get('/api/health')
      .pipe(
        timeout(3500),
        catchError(() => of(null)),
        takeUntilDestroyed()
      )
      .subscribe();
  }
}
