import { Component } from "@angular/core";
import { ThemeService } from "../services/theme.service";

@Component({
  selector: "app-theme-toggle",
  standalone: true,
  template: `<button
    type="button"
    class="theme-toggle"
    (click)="theme.toggleTheme()"
    [attr.aria-label]="
      theme.isDark ? 'Switch to day mode' : 'Switch to night mode'
    "
    [attr.aria-pressed]="theme.isDark"
  >
    <span aria-hidden="true">{{ theme.isDark ? "☾" : "☀" }}</span
    ><span>{{ theme.isDark ? "Night" : "Day" }}</span>
  </button>`,
})
export class ThemeToggleComponent {
  constructor(public theme: ThemeService) {}
}
