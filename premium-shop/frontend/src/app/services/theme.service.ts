import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  isDark = false;

  initTheme(): void {

    const savedTheme = localStorage.getItem('theme');

    // If customer already selected a theme
    if (savedTheme === 'dark' || savedTheme === 'light') {
      this.setTheme(savedTheme === 'dark', false);
      return;
    }

    // First visit -> follow device theme
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;

    this.setTheme(prefersDark, false);
  }

  toggleTheme(): void {
    this.setTheme(!this.isDark);
  }

  private setTheme(
    dark: boolean,
    save = true
  ): void {

    this.isDark = dark;

    document.documentElement.classList.toggle(
      'dark',
      dark
    );

    if (save) {
      localStorage.setItem(
        'theme',
        dark ? 'dark' : 'light'
      );
    }
  }
}