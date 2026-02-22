import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private darkMode = new BehaviorSubject<boolean>(false);
    isDarkMode$ = this.darkMode.asObservable();

    constructor() {
        const saved = localStorage.getItem('darkMode');
        if (saved === 'true') {
            this.enableDark();
        } else if (saved === null) {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) this.enableDark();
        }
    }

    toggle() {
        if (this.darkMode.value) {
            this.enableLight();
        } else {
            this.enableDark();
        }
    }

    private enableDark() {
        document.documentElement.setAttribute('data-theme', 'dark');
        this.darkMode.next(true);
        localStorage.setItem('darkMode', 'true');
    }

    private enableLight() {
        document.documentElement.removeAttribute('data-theme');
        this.darkMode.next(false);
        localStorage.setItem('darkMode', 'false');
    }
}
