import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { Router, RouterOutlet, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { catchError, of, timeout } from 'rxjs';
import { LoadingService } from './services/loading.service';
import { environment } from '../environments/environment';

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

  constructor(
    private readonly router: Router,
    private readonly loadingService: LoadingService,
    private readonly http: HttpClient
  ) {
    this.router.events
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (event instanceof NavigationStart) {
          this.loadingService.startNavigation();
          return;
        }

        if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
          this.loadingService.stopNavigation();
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
