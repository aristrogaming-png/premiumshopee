import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class ThemeService {
  isDark = false;
  initTheme(): void {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("theme");
    } catch {}
    this.setTheme(
      saved === "dark" ||
        (saved !== "light" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches),
      false,
    );
  }
  toggleTheme(): void {
    this.setTheme(!this.isDark);
  }
  private setTheme(dark: boolean, save = true): void {
    this.isDark = dark;
    document.documentElement.classList.toggle("dark", dark);
    if (save) {
      try {
        localStorage.setItem("theme", dark ? "dark" : "light");
      } catch {}
    }
  }
}
